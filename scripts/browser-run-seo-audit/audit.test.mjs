import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { runInNewContext } from 'node:vm';
import { prepareConfig, describeUrl, runAudit } from './audit.mjs';

const input = { origin: 'https://site.example', paths: ['/', '/docs/', '/third/'], readySelector: 'main' };

// Execute the real browser callback in a separate minimal DOM for each page.
// These fixtures model public Puppeteer events; they do not run Chrome.
function mockPage(options) {
  const page = new EventEmitter();
  const mainFrame = {};
  let current = 'about:blank';
  let title = 'Fixture';
  const request = (frame = mainFrame, navigation = true) => ({
    frame: () => frame, isNavigationRequest: () => navigation,
  });
  function navigate(url, { commit = true, redirectHop = false } = {}) {
    const req = request();
    const response = {
      request: () => req, url: () => url,
      status: () => redirectHop ? 302 : options.status ?? 200,
      headers: () => ({
        'content-type': options.contentType ?? 'text/html; charset=utf-8',
        'x-robots-tag': redirectHop ? 'nofollow' : 'noindex',
      }),
    };
    page.emit('request', req);
    if (commit) {
      page.emit('response', response);
      if (!redirectHop) {
        current = url;
        page.emit('framenavigated', mainFrame);
      }
    }
    return response;
  }
  function clientNavigation() {
    title = 'New document';
    const url = options.sameUrlReload ? current : 'https://site.example/new?token=DO_NOT_COPY#secret';
    navigate(url, { commit: !options.pendingNavigation });
  }
  Object.assign(page, {
    setDefaultTimeout() {}, setDefaultNavigationTimeout() {},
    mainFrame: () => mainFrame,
    url: () => current,
    async goto(url) {
      await new Promise((resolve) => setTimeout(resolve, 5));
      if (options.failNavigate) throw new Error('token=DO_NOT_COPY');
      if (options.serverRedirect) navigate(url, { redirectHop: true });
      const response = navigate(options.serverRedirect ?? options.redirect ?? url);
      if (options.navigationAt === 'goto') clientNavigation();
      return response;
    },
    async waitForSelector() {
      if (options.navigationAt === 'ready') clientNavigation();
      if (options.sameDocumentNavigation) {
        current += '#changed';
        page.emit('framenavigated', mainFrame);
      }
      if (options.iframeNavigation) {
        const frame = {};
        const req = request(frame);
        page.emit('request', req);
        page.emit('response', { request: () => req });
        page.emit('framenavigated', frame);
      }
      if (options.subresourceRequest) {
        const req = request(mainFrame, false);
        page.emit('request', req);
        page.emit('response', { request: () => req });
      }
      if (options.failReady) throw new Error('not ready');
    },
    async evaluate(fn) {
      if (options.navigationAt === 'extract') clientNavigation();
      const raw = options.emptyCanonical ? '' : options.canonical ?? current;
      const canonical = { getAttribute: () => raw, href: new URL(raw, current).href };
      const document = {
        title, URL: current,
        querySelectorAll(selector) {
          if (selector === 'link[rel~="canonical"]') return [canonical];
          if (selector === 'h1') return [{}];
          if (selector === 'a[href]') return [{}, {}];
          return [];
        },
      };
      const value = structuredClone(runInNewContext(`(${fn.toString()})()`, {
        document, location: { href: current }, URL,
      }));
      if (options.navigationAt === 'after-extract') clientNavigation();
      return value;
    },
  });
  return page;
}

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
              async newPage() { return mockPage(options); },
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

// Regression coverage for the three review findings in PR #189.
test('IDN origins and asset hosts normalize to the same exact ASCII allowlist', () => {
  const config = prepareConfig({
    ...input, origin: 'https://пример.рф', paths: ['/'],
    assetHosts: ['ПРИМЕР.РФ', 'xn--e1afmkfd.xn--p1ai', 'cdn.пример.рф'],
  });
  assert.equal(config.origin, 'https://xn--e1afmkfd.xn--p1ai');
  assert.deepEqual(config.urls, ['https://xn--e1afmkfd.xn--p1ai/']);
  assert.deepEqual(config.allowedDomains, ['xn--e1afmkfd.xn--p1ai', 'cdn.xn--e1afmkfd.xn--p1ai']);
});

test('IDN normalization retains hostname, IP and local-name restrictions', () => {
  const invalid = ['127.0.0.1', '0x7f000001', '[::1]', 'localhost', 'a.local', 'a.internal',
    '*.пример.рф', 'site.example:443', 'user@site.example', 'site.example/path',
    'site.example?x=1', 'site.example#x', 'site.example%2f', ' site.example',
    'bad_label.example', '-label.example', 'label-.example', 'site..example',
    'site.example.', 'site.xn--a', `${'a'.repeat(64)}.example`,
    `${Array(4).fill('a'.repeat(63)).join('.')}.com`];
  for (const host of invalid) {
    assert.throws(() => prepareConfig({ ...input, assetHosts: [host] }), host);
  }
});

for (const navigationAt of ['goto', 'ready', 'extract', 'after-extract']) {
  for (const sameUrlReload of [false, true]) {
    test(`${sameUrlReload ? 'same-URL reload' : 'same-origin redirect'} at ${navigationAt} is incomplete`, async () => {
      const mock = mockBrowser({ navigationAt, sameUrlReload });
      const report = await runAudit(mock.api, {}, { ...input, paths: ['/old'] });
      const page = report.pages[0];
      assert.equal(page.state, 'failed');
      assert.equal(page.stage, 'document-changed');
      for (const field of ['dom', 'httpStatus', 'xRobotsTag', 'contentType', 'final']) {
        assert.equal(Object.hasOwn(page, field), false, field);
      }
      assert.deepEqual(page.cleanup, { contextClosed: true, disconnected: true });
      assert.equal(report.browserClosed, true);
      assert.ok(!JSON.stringify(report).includes('DO_NOT_COPY'));
    });
  }
}

test('a pending main-document request invalidates the sample before its response', async () => {
  const mock = mockBrowser({ navigationAt: 'ready', pendingNavigation: true });
  const report = await runAudit(mock.api, {}, input);
  assert.ok(report.pages.every((p) => p.state === 'failed' && p.stage === 'document-changed'));
});

test('navigation followed by selector failure is still marked document-changed', async () => {
  const mock = mockBrowser({ navigationAt: 'ready', failReady: true });
  const report = await runAudit(mock.api, {}, input);
  assert.ok(report.pages.every((p) => p.stage === 'document-changed' && !p.dom && !p.xRobotsTag));
});

test('same-document navigation during readiness conservatively invalidates the sample', async () => {
  const mock = mockBrowser({ sameDocumentNavigation: true });
  const report = await runAudit(mock.api, {}, input);
  assert.ok(report.pages.every((p) => p.state === 'failed' && p.stage === 'document-changed'));
});

test('HTTP redirects completed by goto retain the final response and DOM', async () => {
  const mock = mockBrowser({ serverRedirect: 'https://site.example/new' });
  const report = await runAudit(mock.api, {}, input);
  assert.ok(report.pages.every((p) => p.state === 'collected' && p.final.url === 'https://site.example/new'
    && p.httpStatus === 200 && p.xRobotsTag === 'noindex'
    && p.dom.canonicals[0].target.url === 'https://site.example/new'));
});

test('iframe navigations and subresource requests do not invalidate the main document', async () => {
  const mock = mockBrowser({ iframeNavigation: true, subresourceRequest: true });
  const report = await runAudit(mock.api, {}, input);
  assert.ok(report.pages.every((p) => p.state === 'collected'));
});

test('long canonical keeps query and fragment flags and marks truncation after redaction', async () => {
  const canonical = `https://site.example/${'a'.repeat(1050)}?variant=DO_NOT_COPY#secret`;
  const mock = mockBrowser({ canonical });
  const report = await runAudit(mock.api, {}, { ...input, paths: ['/'] });
  const page = report.pages[0];
  assert.equal(page.state, 'collected');
  const target = page.dom.canonicals[0].target;
  assert.equal(target.hasQuery, true);
  assert.equal(target.hasFragment, true);
  assert.equal(target.truncated, true);
  assert.equal(target.url.length, 1024);
  assert.ok(!JSON.stringify(report).includes('DO_NOT_COPY'));
});

test('a long query on a short canonical does not truncate the redacted URL', () => {
  const value = describeUrl(`https://site.example/a?q=${'b'.repeat(2000)}#secret`);
  assert.equal(value.url, 'https://site.example/a');
  assert.equal(value.hasQuery, true);
  assert.equal(value.hasFragment, true);
  assert.equal(Boolean(value.truncated), false);
});

test('canonical emptiness is checked before trimming an arbitrary length', async () => {
  const mock = mockBrowser({ canonical: `${' '.repeat(1100)}https://site.example/real` });
  const report = await runAudit(mock.api, {}, { ...input, paths: ['/'] });
  assert.equal(report.pages[0].dom.canonicals[0].empty, false);
  assert.equal(report.pages[0].dom.canonicals[0].target.url, 'https://site.example/real');
});
