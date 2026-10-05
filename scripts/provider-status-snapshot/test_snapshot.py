"""Synthetic offline fixtures. No requests to providers, no measured uptime."""
import contextlib
import copy
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError

import snapshot as s


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.raw = b'SYNTHETIC TEST FIXTURE: component compute in test-1 is degraded'
        self.time = '2026-01-01T00:00:00+00:00'

    def captured(self, name='a', raw=None, at=None):
        folder = self.root / name
        with patch.object(s, 'fetch', return_value=(raw or self.raw, {'Date': None})), patch.object(s, 'now', return_value=at or self.time):
            s.capture('firstvds', folder)
        return folder

    def observation(self, folder, **overrides):
        obs = s.read_json(folder / 'observations.template.json')
        obs['entities'] = [{'kind': 'component', 'id': 'local:compute:test-1', 'service': 'compute',
                            'location': 'test-1', 'status': 'degraded'}]
        obs.update(overrides)
        return obs

    def reviewed(self, folder, **overrides):
        obs = self.observation(folder, **overrides)
        path = folder / 'observations.json'
        s.write_json(path, obs)
        s.review(folder, path)
        return s.load_review(folder)

    def test_capture_is_not_health_verdict(self):
        folder = self.captured()
        self.assertEqual(s.evidence(folder)['retrieval_status'], 'captured_unreviewed')
        self.assertFalse((folder / 'reviewed.json').exists())

    def test_capture_failure_preserves_previous(self):
        old = self.captured()
        with patch.object(s, 'fetch', side_effect=URLError('offline')):
            with self.assertRaises(URLError):
                s.capture('firstvds', self.root / 'failed')
        self.assertEqual((old / 'raw.bin').read_bytes(), self.raw)
        self.assertFalse((self.root / 'failed').exists())

    def test_no_capture_overwrite_or_network(self):
        folder = self.captured()
        with patch.object(s, 'fetch') as fetch:
            with self.assertRaises(FileExistsError):
                s.capture('firstvds', folder)
            fetch.assert_not_called()

    def test_no_review_overwrite(self):
        folder = self.captured()
        self.reviewed(folder)
        original = (folder / 'reviewed.json').read_bytes()
        with self.assertRaises(FileExistsError):
            s.review(folder, folder / 'observations.json')
        self.assertEqual((folder / 'reviewed.json').read_bytes(), original)

    def test_no_green_from_empty_observations(self):
        folder = self.captured()
        with self.assertRaises(ValueError):
            s.review(folder, folder / 'observations.template.json')
        self.assertFalse((folder / 'reviewed.json').exists())

    def test_raw_tampering_is_detected(self):
        folder = self.captured()
        self.reviewed(folder)
        (folder / 'raw.bin').write_bytes(b'tampered')
        with self.assertRaises(ValueError):
            s.load_review(folder)

    def test_review_requires_matching_source_hash(self):
        folder = self.captured()
        obs = self.observation(folder, source_sha256='0' * 64)
        with self.assertRaises(ValueError):
            s.normalize(obs, s.evidence(folder))

    def test_source_and_schema_mismatch(self):
        folder = self.captured()
        for key, value in [('schema_version', 2), ('source_url', 'https://other.example/'), ('provider', 'other')]:
            with self.subTest(key=key), self.assertRaises(ValueError):
                s.normalize(self.observation(folder, **{key: value}), s.evidence(folder))

    def test_timestamps_require_offset(self):
        with self.assertRaises(ValueError):
            s.timestamp('2026-01-01T10:00:00')
        self.assertEqual(s.timestamp('2026-01-01T10:00:00+05:00'), s.timestamp('2026-01-01T05:00:00Z'))

    def test_subsecond_order_is_chronological(self):
        folder = self.captured()
        item = {'kind': 'incident', 'id': 'local:subsecond', 'status': 'resolved',
                'started_at': '2026-01-01T00:00:00Z',
                'ended_at': '2026-01-01T00:00:00.100000Z'}
        self.reviewed(folder, entities=[item])
        old = s.load_review(folder)
        new = copy.deepcopy(old)
        new['checked_at'] = '2026-01-01T00:00:00.100000Z'
        self.assertEqual(s.changes(old, new), [])

    def test_unknown_timezone_stays_null(self):
        folder = self.captured()
        value = self.reviewed(folder)
        self.assertIsNone(value['provider_timezone'])
        self.assertIsNone(value['entities'][0]['started_at'])

    def test_unknown_fields_and_duplicate_identity_rejected(self):
        folder = self.captured()
        obs = self.observation(folder)
        duplicate = copy.deepcopy(obs)
        duplicate['entities'] *= 2
        unknown = copy.deepcopy(obs)
        unknown['entities'][0]['downtime'] = 300
        bad_status = copy.deepcopy(obs)
        bad_status['entities'][0]['status'] = ''
        for invalid in (duplicate, unknown, bad_status):
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                s.normalize(invalid, s.evidence(folder))

    def test_maintenance_and_incident_are_distinct(self):
        folder = self.captured()
        items = [{'kind': kind, 'id': 'same-id', 'status': 'monitoring'} for kind in ('maintenance', 'incident')]
        self.assertEqual(len(self.reviewed(folder, entities=items)['entities']), 2)

    def test_reversed_event_window_rejected(self):
        folder = self.captured()
        item = {'kind': 'maintenance', 'id': 'local:test', 'status': 'scheduled',
                'scheduled_start': '2026-01-01T10:00:00Z', 'scheduled_end': '2026-01-01T09:00:00Z'}
        with self.assertRaises(ValueError):
            self.reviewed(folder, entities=[item])

    def test_changed_fetch_time_and_raw_hash_do_not_make_new_incident(self):
        old = self.reviewed(self.captured())
        new = self.reviewed(self.captured('b', raw=self.raw + b' footer', at='2026-01-02T00:00:00Z'))
        self.assertNotEqual(old['source_sha256'], new['source_sha256'])
        self.assertEqual(s.changes(old, new), [])

    def test_disappearance_is_not_resolution(self):
        old = self.reviewed(self.captured())
        new = copy.deepcopy(old)
        new['entities'] = [{'kind': 'component', 'id': 'other', 'status': 'operational'}]
        delta = s.changes(old, new)
        self.assertIn('not_observed_not_resolved', [row['change'] for row in delta])
        self.assertEqual(old['entities'][0]['status'], 'degraded')

    def test_status_change_includes_before_and_after(self):
        old = self.reviewed(self.captured())
        new = copy.deepcopy(old)
        new['entities'][0]['status'] = 'operational'
        delta = s.changes(old, new)
        self.assertEqual(delta[0]['change'], 'changed')
        self.assertEqual(delta[0]['before']['status'], 'degraded')
        self.assertEqual(delta[0]['after']['status'], 'operational')
        self.assertNotIn('duration', delta[0])

    def test_comparison_rejects_other_source_and_older_snapshot(self):
        old = self.reviewed(self.captured())
        for key, value in [('provider', 'other'), ('source_url', 'https://other.example/'),
                           ('schema_version', 2), ('checked_at', '2025-12-31T00:00:00Z')]:
            new = copy.deepcopy(old)
            new[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                s.changes(old, new)

    def test_markup_in_untrusted_text_is_escaped(self):
        old = self.reviewed(self.captured())
        new = copy.deepcopy(old)
        new['entities'][0]['note'] = '</pre><script>alert(1)</script>```'
        text = s.markdown(old, new)
        self.assertNotIn('<script>', text)
        self.assertNotIn('```', text)
        self.assertIn('&lt;script&gt;', text)

    def test_redirect_is_not_followed(self):
        self.assertIsNone(s.NoRedirect().redirect_request(None, None, 302, '', {}, 'https://evil.example/'))

    def test_fetch_limits_and_http_errors(self):
        for status, body, encoding in [(500, b'x', 'identity'), (200, b'', 'identity'),
                                       (200, b'x' * (s.MAX_BYTES + 1), 'identity'), (200, b'x', 'gzip')]:
            response = unittest.mock.MagicMock()
            response.status = status
            response.headers = {'Content-Encoding': encoding}
            response.read.return_value = body
            response.__enter__.return_value = response
            opener = unittest.mock.MagicMock()
            opener.open.return_value = response
            with self.subTest(status=status, encoding=encoding), patch.object(s, 'build_opener', return_value=opener), self.assertRaises(ValueError):
                s.fetch('https://firstvds.live/')

    def test_fetch_is_allowlisted(self):
        for url in ('http://firstvds.live/', 'https://127.0.0.1/', 'file:///etc/passwd', 'https://firstvds.live/?token=x'):
            with self.subTest(url=url), self.assertRaises(ValueError):
                s.fetch(url)

    def test_cli_offline_pipeline(self):
        old = self.captured()
        self.reviewed(old)
        new = self.captured('b', at='2026-01-02T00:00:00Z')
        self.reviewed(new)
        stdout = io.StringIO()
        with contextlib.redirect_stdout(stdout):
            self.assertEqual(s.main(['diff', str(old), str(new)]), 0)
        self.assertIn('Изменений выбранных полей нет', stdout.getvalue())
        with contextlib.redirect_stderr(io.StringIO()):
            self.assertEqual(s.main(['diff', str(old), str(self.root / 'missing')]), 1)

    def test_corrupt_json_and_forged_review_date_fail(self):
        folder = self.captured()
        self.reviewed(folder)
        path = folder / 'reviewed.json'
        doc = s.read_json(path)
        doc['checked_at'] = '2026-01-02T00:00:00Z'
        path.write_text(json.dumps(doc), encoding='utf-8')
        with self.assertRaises(ValueError):
            s.load_review(folder)
        path.write_text('{truncated', encoding='utf-8')
        with self.assertRaises(ValueError):
            s.load_review(folder)


if __name__ == '__main__':
    unittest.main()
