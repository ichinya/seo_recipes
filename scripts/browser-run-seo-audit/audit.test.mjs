import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareConfig, describeUrl, runAudit } from './audit.mjs';

const input = { origin: 'https://site.example', paths: ['/', '/docs/', '/third/'], readySelector: 'main' };

// Offline lifecycle fixture, not a real Chrome/Cloudflare integration test.
function mockBrowser(options = {}) {
  const state = { launches: 0, clients: 0, contexts: 0, peak: 0, ids: [], events: [], connections: 0 };
  return {
    state,
    api: {
      async launch(_binding, launchOptions) {
        state.launches++;
        state.guardrails = launchOptions.guardrails;
        return {
          sessionId: () => 'owned-batch',
          async close() {
            state.events.push('owner-close');
            if (options.failOwnerClose) throw new Error('close failed');
            state.contexts = 0;
          },
        };
      },
      async connect(_binding, id) {
        assert.equal(id, 'owned-batch');
        state.connections++;
        if (options.failConnect) throw new Error('connect failed');
        state.clients++;
        return {
          async createBrowserContext() {
            if (options.failContext) throw new Error('context failed');
            const contextId = state.ids.length;
            state.ids.push(contextId);
            state.contexts++;
            state.peak = Math.max(state.peak, state.contexts);
            return {
              async close() {
                state.events.push(`context-close-${contextId}`);
                if (options.failContextClose) throw new Error('close failed');
                state.contexts--;
              },
              async newPage() {
                let current;
                return {
                  setDefaultTimeout() {}, setDefaultNavigationTimeout() {}, on() {},
                  async goto(url) {
                    current = options.redirect ?? url;
                    await new Promise((resolve) => setTimeout(resolve, 5));
                    if (options.failNavigate) throw new Error('token=DO_NOT_COPY');
                    return {
                      status: () => options.status ?? 200,
                      headers: () => ({ 'content-type': options.contentType ?? 'text/html; charset=utf-8' }),
                    };
                  },
                  url: () => current,
                  async waitForSelector() { if (options.failReady) throw new Error('not ready'); },
                  async evaluate() {
                    return {
                      title: 'Fixture', canonicalCount: 1,
                      canonicals: [{ raw: options.emptyCanonical ? '' : current, resolved: current }],
                      robots: [], googlebot: [], h1Count: 1, linkCount: 2,
                    };
                  },
                };
              },
            };
          },
          async disconnect() { state.events.push('disconnect'); state.clients--; },
        };
      },
    },
  };
}

test('configuration normalizes and deduplicates approved paths and hosts', () => {
  const config = prepareConfig({ ...input, paths: ['/', '/docs/../'], assetHosts: ['cdn.example', 'CDN.EXAMPLE'] });
  assert.deepEqual(config.urls, ['https://site.example/']);
  assert.deepEqual(config.allowedDomains, ['site.example', 'cdn.example']);
});

test('reject unsafe origins and paths before launching a browser', async () => {
  for (const origin of ['http://site.example', 'https://user:pass@site.example', 'https://127.0.0.1', 'https://localhost', 'https://site.example/x', 'https://site.example?q=secret']) {
    assert.throws(() => prepareConfig({ ...input, origin }));
  }
  for (const path of ['//other.example/', '/?token=secret', '/a#token', '/\\other.example', '/a b', 42]) {
    const mock = mockBrowser();
    await assert.rejects(runAudit(mock.api, {}, { ...input, paths: [path] }));
    assert.equal(mock.state.launches, 0);
  }
  assert.throws(() => prepareConfig({ ...input, paths: Array(11).fill('/') }));
  assert.throws(() => prepareConfig({ ...input, assetHosts: ['*.example.com'] }));
});

test('report URLs redact query/fragment and reject credentials', () => {
  assert.deepEqual(describeUrl('https://site.example/a?token=secret#key'), {
    url: 'https://site.example/a', hasQuery: true, hasFragment: true,
  });
  assert.equal(describeUrl('https://user:pass@site.example/a'), null);
  assert.equal(describeUrl('javascript:alert(1)'), null);
});

test('batch owns one browser, has two concurrent clients and a fresh context per URL', async () => {
  const mock = mockBrowser();
  const report = await runAudit(mock.api, {}, input);
  assert.equal(mock.state.launches, 1);
  assert.equal(mock.state.connections, 3);
  assert.equal(mock.state.peak, 2);
  assert.equal(new Set(mock.state.ids).size, 3);
  assert.deepEqual(mock.state.guardrails, { allowedDomains: ['site.example'] });
  assert.equal(mock.state.clients, 0);
  assert.equal(mock.state.events.at(-1), 'owner-close');
  assert.equal(report.browserClosed, true);
  assert.deepEqual(report.pages.map((page) => page.requested.url), prepareConfig(input).urls);
  assert.ok(report.pages.every((page) => page.state === 'collected' && page.cleanup.contextClosed && page.cleanup.disconnected));
});

for (const [option, stage] of [['failConnect', 'connect'], ['failContext', 'context'], ['failNavigate', 'navigation'], ['failReady', 'ready-selector']]) {
  test(`${stage} failure is reported; siblings settle and the owner closes last`, async () => {
    const mock = mockBrowser({ [option]: true });
    const report = await runAudit(mock.api, {}, input);
    assert.equal(report.pages.length, 3);
    assert.ok(report.pages.every((page) => page.state === 'failed' && page.stage === stage));
    assert.equal(mock.state.clients, 0);
    assert.equal(mock.state.events.at(-1), 'owner-close');
    assert.ok(!JSON.stringify(report).includes('DO_NOT_COPY'));
  });
}

test('context-close failure still disconnects clients and marks the result incomplete', async () => {
  const mock = mockBrowser({ failContextClose: true });
  const report = await runAudit(mock.api, {}, input);
  assert.equal(mock.state.clients, 0);
  assert.ok(report.pages.every((page) => page.state === 'failed' && !page.cleanup.contextClosed && page.cleanup.disconnected));
});

test('owner-close failure is explicit', async () => {
  const mock = mockBrowser({ failOwnerClose: true });
  const report = await runAudit(mock.api, {}, input);
  assert.equal(report.browserClosed, false);
});

test('non-200, non-HTML and redirected origins cannot become collected', async () => {
  for (const options of [{ status: 503 }, { contentType: 'application/pdf' }, { redirect: 'https://other.example/' }]) {
    const mock = mockBrowser(options);
    const report = await runAudit(mock.api, {}, input);
    assert.ok(report.pages.every((page) => page.state !== 'collected'));
  }
});

test('an empty canonical is not resolved into a misleading self-canonical', async () => {
  const mock = mockBrowser({ emptyCanonical: true });
  const report = await runAudit(mock.api, {}, input);
  assert.deepEqual(report.pages[0].dom.canonicals, [{ empty: true, target: null }]);
});
