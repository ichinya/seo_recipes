#!/usr/bin/env python3
"""Capture public status sources, review evidence, and diff selected records.

Python 3.10+, standard library only. No automatic HTML interpretation or downtime
calculation. A successful HTTP request is never a provider health verdict.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

VERSION = 1
MAX_BYTES = 2 * 1024 * 1024
SOURCES = {
    "firstvds": ("firstvds", "https://firstvds.live/"),
    "firstvds-works": ("firstvds", "https://firstvds.live/works"),
    "selectel": ("selectel", "https://selectel.live/"),
    "timeweb-cloud": ("timeweb-cloud", "https://timeweb.cloud/live"),
    "google-search": ("google-search", "https://status.search.google.com/"),
}
TEXT_FIELDS = ("component", "service", "location", "note")
TIME_FIELDS = ("published_at", "started_at", "ended_at", "scheduled_start", "scheduled_end")
RECORD_FIELDS = {"kind", "id", "status", *TEXT_FIELDS, *TIME_FIELDS}


def now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="microseconds")


def timestamp(value: object) -> str:
    if not isinstance(value, str):
        raise ValueError("timestamp must be an ISO 8601 string with UTC offset")
    dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if dt.utcoffset() is None:
        raise ValueError("timestamp without UTC offset; keep unknown source time in note")
    return dt.astimezone(timezone.utc).isoformat(timespec="microseconds")


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def read_json(path: Path) -> dict:
    with path.open("rb") as stream:
        raw = stream.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise ValueError("JSON exceeds size limit")
    value = json.loads(raw)
    if not isinstance(value, dict):
        raise ValueError("expected JSON object")
    return value


def write_json(path: Path, value: dict) -> None:
    # Exclusive creation: never overwrite an earlier capture/review.
    with path.open("x", encoding="utf-8") as stream:
        json.dump(value, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write("\n")


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def fetch(url: str) -> tuple[bytes, dict]:
    # Fixed public URLs only; no credentials, cookies, proxy autodetection or redirects.
    if url not in {item[1] for item in SOURCES.values()}:
        raise ValueError("source URL is not allowlisted")
    opener = build_opener(ProxyHandler({}), NoRedirect())
    request = Request(url, headers={"User-Agent": "SEORecipesStatusSnapshot/1", "Accept-Encoding": "identity"})
    with opener.open(request, timeout=20) as response:
        if response.status != 200:
            raise ValueError(f"unexpected HTTP status {response.status}")
        if response.headers.get("Content-Encoding", "identity").lower() != "identity":
            raise ValueError("unexpected compressed response")
        raw = response.read(MAX_BYTES + 1)
        if not raw or len(raw) > MAX_BYTES:
            raise ValueError("empty or oversized response")
        headers = {key: response.headers.get(key) for key in ("Date", "Last-Modified", "ETag", "Age", "Content-Type")}
        return raw, headers


def capture(source: str, output: Path) -> None:
    if output.exists():
        raise FileExistsError("capture directory already exists")
    provider, url = SOURCES[source]
    raw, headers = fetch(url)
    fetched_at = now()  # Completion of retrieval, not publication/event start.
    manifest = {"schema_version": VERSION, "provider": provider, "source_url": url,
                "checked_at": fetched_at, "source_sha256": digest(raw),
                "retrieval_status": "captured_unreviewed", "http_headers": headers}
    output.mkdir(mode=0o700, parents=True, exist_ok=False)
    try:
        (output / "raw.bin").write_bytes(raw)
        write_json(output / "capture.json", manifest)
        write_json(output / "observations.template.json", {
            "schema_version": VERSION, "provider": provider, "source_url": url,
            "source_sha256": digest(raw), "provider_timezone": None, "entities": []})
    except Exception:
        # Only our newly created directory is removed; earlier snapshots are untouched.
        shutil.rmtree(output)
        raise


def evidence(directory: Path) -> dict:
    manifest = read_json(directory / "capture.json")
    if manifest.get("schema_version") != VERSION or manifest.get("retrieval_status") != "captured_unreviewed":
        raise ValueError("unsupported capture")
    timestamp(manifest["checked_at"])
    with (directory / "raw.bin").open("rb") as stream:
        raw = stream.read(MAX_BYTES + 1)
    if not raw or len(raw) > MAX_BYTES or digest(raw) != manifest.get("source_sha256"):
        raise ValueError("raw source hash/size mismatch")
    return manifest


def normalize(observations: dict, manifest: dict) -> dict:
    for key in ("schema_version", "provider", "source_url", "source_sha256"):
        if observations.get(key) != manifest.get(key):
            raise ValueError(f"observation/capture mismatch: {key}")
    tz = observations.get("provider_timezone")
    if tz is not None and (not isinstance(tz, str) or not tz.strip()):
        raise ValueError("provider_timezone must be null or documented source timezone")
    entities = observations.get("entities")
    if not isinstance(entities, list) or not entities:
        raise ValueError("at least one reviewed record required; empty is not healthy")
    records = []
    seen = set()
    for item in entities:
        if not isinstance(item, dict) or set(item) - RECORD_FIELDS:
            raise ValueError("unknown record fields or invalid record")
        if item.get("kind") not in {"component", "incident", "maintenance"}:
            raise ValueError("kind must be component, incident or maintenance")
        for key in ("id", "status"):
            if not isinstance(item.get(key), str) or not item[key].strip():
                raise ValueError(f"non-empty {key} required")
        identity = (item["kind"], item["id"])
        if identity in seen:
            raise ValueError("duplicate (kind, id)")
        seen.add(identity)
        record = {key: item[key] for key in ("kind", "id", "status")}
        for key in TEXT_FIELDS:
            value = item.get(key)
            if value is not None and not isinstance(value, str):
                raise ValueError(f"{key} must be text or null")
            record[key] = value
        for key in TIME_FIELDS:
            record[key] = None if item.get(key) is None else timestamp(item[key])
        for start, end in (("started_at", "ended_at"), ("scheduled_start", "scheduled_end")):
            if record[start] and record[end] and record[start] > record[end]:
                raise ValueError("end precedes start")
        records.append(record)
    return {"schema_version": VERSION, "provider": manifest["provider"],
            "source_url": manifest["source_url"], "source_sha256": manifest["source_sha256"],
            "checked_at": timestamp(manifest["checked_at"]), "provider_timezone": tz,
            "entities": sorted(records, key=lambda item: (item["kind"], item["id"]))}


def review(directory: Path, observations: Path) -> None:
    result = normalize(read_json(observations), evidence(directory))
    result["reviewed_at"] = now()
    write_json(directory / "reviewed.json", result)


def load_review(directory: Path) -> dict:
    manifest = evidence(directory)
    saved = read_json(directory / "reviewed.json")
    if timestamp(saved["checked_at"]) != timestamp(manifest["checked_at"]):
        raise ValueError("review/capture checked_at mismatch")
    timestamp(saved["reviewed_at"])
    return normalize(saved, manifest)


def changes(before: dict, after: dict) -> list[dict]:
    for key in ("schema_version", "provider", "source_url"):
        if before[key] != after[key]:
            raise ValueError("cannot compare different sources or schema versions")
    if timestamp(after["checked_at"]) < timestamp(before["checked_at"]):
        raise ValueError("new capture predates previous capture")
    old = {(r["kind"], r["id"]): r for r in before["entities"]}
    new = {(r["kind"], r["id"]): r for r in after["entities"]}
    result = []
    if before["provider_timezone"] != after["provider_timezone"]:
        result.append({"change": "source_timezone_changed", "before": before["provider_timezone"], "after": after["provider_timezone"]})
    for key in sorted(old.keys() | new.keys()):
        if key not in new:
            action = "not_observed_not_resolved"
        elif key not in old:
            action = "newly_observed_not_necessarily_new"
        elif old[key] != new[key]:
            action = "changed"
        else:
            continue
        result.append({"change": action, "before": old.get(key), "after": new.get(key)})
    return result


def markdown(before: dict, after: dict) -> str:
    # Escape source-controlled markup; output is a review draft, never published.
    escaped = lambda value: html.escape(str(value), quote=True).replace("`", "&#96;")
    lines = ["# Сравнение снимков — черновик", "",
             f"Источник: <code>{escaped(after['source_url'])}</code>",
             f"Проверки UTC: {escaped(before['checked_at'])} → {escaped(after['checked_at'])}",
             f"SHA-256: {before['source_sha256']} → {after['source_sha256']}", "",
             "Это сравнение выбранных записей источника, не uptime/SLA и не полный аудит провайдера.", ""]
    delta = changes(before, after)
    if not delta:
        lines.append("Изменений выбранных полей нет. Это не доказательство непрерывности статуса между проверками.")
    for change in delta:
        lines.extend([f"## {change['change']}", "", "<pre>" + escaped(json.dumps(change, ensure_ascii=False, indent=2)) + "</pre>", ""])
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    cap = sub.add_parser("capture")
    cap.add_argument("--source", choices=SOURCES, required=True)
    cap.add_argument("--out", type=Path, required=True)
    rev = sub.add_parser("review")
    rev.add_argument("--capture", type=Path, required=True)
    rev.add_argument("--observations", type=Path, required=True)
    diff = sub.add_parser("diff")
    diff.add_argument("before", type=Path)
    diff.add_argument("after", type=Path)
    args = parser.parse_args(argv)
    try:
        if args.command == "capture":
            capture(args.source, args.out)
            print("Источник сохранён. Статусы не проверены; заполните observations.template.json.")
        elif args.command == "review":
            review(args.capture, args.observations)
            print("Ручные наблюдения привязаны к снимку; reviewed.json создан.")
        else:
            print(markdown(load_review(args.before), load_review(args.after)), end="")
        return 0
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f"Ошибка {type(error).__name__}: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
