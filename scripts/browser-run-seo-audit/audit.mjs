/** Normalize IDNs using WHATWG URL, then validate DNS-label syntax (not DNS reachability). */
function normalizeHostname(value) {
  if (typeof value !== 'string' || !value || /[\s\\/:@?#%*\[\]]/.test(value)) {
    throw new Error('Use exact DNS hostnames without URL parts or wildcards');
  }
  const host = new URL(`https://${value}`).hostname;
  const labels = host.split('.');
  const label = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;
  const tld = labels.at(-1);
  if (host.length > 253 || labels.length < 2 || labels.some((part) => !label.test(part))
      || !/^(?:[a-z]{2,63}|xn--[a-z0-9-]+)$/i.test(tld)
      || /(?:^|\.)(?:localhost|local|internal)$/i.test(host)) {
    throw new Error('Use a controlled public DNS hostname');
  }
  return host;
}

/** Small, trusted-site audit. No discovery, public URL input or credentials. */
export function prepareConfig(input) {
  const origin = new URL(input.origin);
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.port
      || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('Use a controlled public HTTPS origin without credentials, port or path');
  }
  const originHostname = normalizeHostname(origin.hostname);
  if (!Array.isArray(input.paths) || input.paths.length < 1 || input.paths.length > 10) {
    throw new Error('Provide 1–10 approved paths');
  }
  const urls = [...new Set(input.paths.map((path) => {
    if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//')
        || /[\\?#\s]/.test(path) || path.length > 1024) throw new Error('Invalid audit path');
    const url = new URL(path, origin);
    if (url.origin !== origin.origin) throw new Error('Cross-origin audit path');
    return url.href;
  }))];
  const extra = input.assetHosts ?? [];
  if (!Array.isArray(extra) || extra.length > 10) {
    throw new Error('Use at most 10 exact asset hostnames; no wildcards');
  }
  const assetHosts = extra.map(normalizeHostname);
  if (typeof input.readySelector !== 'string' || !input.readySelector.trim() || input.readySelector.length > 200) {
    throw new Error('Provide an application-specific ready selector');
  }
  return {
    origin: origin.origin, urls, readySelector: input.readySelector,
    allowedDomains: [...new Set([originHostname, ...assetHosts])],
  };
}

/** Avoid copying query tokens, fragments or URL credentials into the report. */
export function describeUrl(value, base) {
  try {
    const url = new URL(value, base);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    const redacted = `${url.origin}${url.pathname}`;
    return {
      url: redacted.slice(0, 1024), hasQuery: Boolean(url.search), hasFragment: Boolean(url.hash),
      ...(redacted.length > 1024 ? { truncated: true } : {}),
    };
  } catch { return null; }
}

async function inspectPage(puppeteer, binding, sessionId, url, config) {
  const result = { requested: describeUrl(url), state: 'failed', stage: 'connect', pageErrors: 0, failedRequests: 0 };
  let client;
  let context;
  let assertDocument;
  try {
    client = await puppeteer.connect(binding, sessionId);
    result.stage = 'context';
    context = await client.createBrowserContext();
    const page = await context.newPage();
    page.setDefaultTimeout(5_000);
    page.setDefaultNavigationTimeout(15_000);
    page.on('pageerror', () => { result.pageErrors++; });
    page.on('requestfailed', () => { result.failedRequests++; });
    // Track only main-document traffic. Request identity detects same-URL reloads,
    // including a new navigation that has started but has not received headers yet.
    let mainRequest;
    let mainResponse;
    let navigationRevision = 0;
    const isMainNavigation = (request) => request.isNavigationRequest() && request.frame() === page.mainFrame();
    page.on('request', (request) => { if (isMainNavigation(request)) mainRequest = request; });
    page.on('response', (response) => { if (isMainNavigation(response.request())) mainResponse = response; });
    page.on('framenavigated', (frame) => { if (frame === page.mainFrame()) navigationRevision++; });
    result.stage = 'navigation';
    const response = await page.goto(url, { waitUntil: 'domcontentloaded' });
    if (!response) throw new Error('No main-document response');
    const documentUrl = page.url();
    const revision = navigationRevision;
    const withoutHash = (value) => { const parsed = new URL(value); parsed.hash = ''; return parsed.href; };
    assertDocument = (extractedUrl = documentUrl) => {
      if (mainRequest !== response.request() || mainResponse !== response
          || navigationRevision !== revision || page.url() !== documentUrl
          || extractedUrl !== documentUrl || withoutHash(documentUrl) !== withoutHash(response.url())) {
        result.stage = 'document-changed';
        throw new Error('Main document changed during collection');
      }
    };
    assertDocument();
    // Keep document-bound metadata private until response and DOM have been matched.
    const headers = response.headers();
    const metadata = {
      httpStatus: response.status(), contentType: (headers['content-type'] ?? '').slice(0, 200),
      xRobotsTag: (headers['x-robots-tag'] ?? '').slice(0, 500),
      final: describeUrl(documentUrl), guardrailBlocked: headers['cf-mitigated'] === 'guardrails',
    };
    if (new URL(documentUrl).origin !== config.origin) {
      result.stage = 'unexpected-origin';
    } else if (metadata.httpStatus !== 200) {
      result.stage = 'http-status';
    } else if (!/^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i.test(metadata.contentType)) {
      result.state = 'skipped';
      result.stage = 'non-html';
    } else {
      result.stage = 'ready-selector';
      await page.waitForSelector(config.readySelector);
      assertDocument();
      result.stage = 'extract';
      const { documentUrl: extractedUrl, ...dom } = await page.evaluate(() => {
        const values = (selector, attribute) => Array.from(document.querySelectorAll(selector))
          .slice(0, 10).map((node) => (node.getAttribute(attribute) ?? '').slice(0, 1000));
        const canonicals = document.querySelectorAll('link[rel~="canonical"]');
        return {
          documentUrl: location.href,
          title: document.title.slice(0, 500), canonicalCount: canonicals.length,
          canonicals: Array.from(canonicals).slice(0, 10).map((node) => ({
            empty: !(node.getAttribute('href') ?? '').trim(),
            resolved: node.href,
          })),
          robots: values('meta[name="robots" i]', 'content'),
          googlebot: values('meta[name="googlebot" i]', 'content'),
          h1Count: document.querySelectorAll('h1').length,
          linkCount: document.querySelectorAll('a[href]').length,
        };
      });
      assertDocument(extractedUrl);
      result.dom = { ...dom, canonicals: dom.canonicals.map((item) => ({
        empty: item.empty, target: item.empty ? null : describeUrl(item.resolved),
      })) };
      result.state = 'collected';
      result.stage = 'done';
    }
    Object.assign(result, metadata);
  } catch {
    // A selector/evaluation error may itself have been caused by navigation.
    try { assertDocument?.(); } catch { /* The stage records document-changed. */ }
    // Report the failing stage, not raw errors that may include sensitive URLs.
    result.state = 'failed';
  } finally {
    result.cleanup = { contextClosed: !context, disconnected: !client };
    try {
      if (context) { await context.close(); result.cleanup.contextClosed = true; }
    } catch { result.state = 'failed'; }
    finally {
      try {
        if (client) { await client.disconnect(); result.cleanup.disconnected = true; }
      } catch { result.state = 'failed'; }
    }
  }
  return result;
}

/**
 * The batch owns its session: no random session discovery or sharing with other tenants.
 * Two independent CDP clients at a time; each URL gets a fresh context.
 * Only the owner closes the browser, after both consumers have settled.
 */
export async function runAudit(puppeteer, binding, input) {
  const config = prepareConfig(input); // Validate before spending browser quota.
  const report = { schemaVersion: 1, startedAt: new Date().toISOString(), pages: [], browserClosed: false };
  const owner = await puppeteer.launch(binding, { guardrails: { allowedDomains: config.allowedDomains } });
  try {
    const sessionId = owner.sessionId();
    let cursor = 0;
    const consume = async () => {
      while (cursor < config.urls.length) {
        const index = cursor++;
        report.pages[index] = await inspectPage(puppeteer, binding, sessionId, config.urls[index], config);
      }
    };
    // allSettled prevents terminating siblings early if an unexpected helper error occurs.
    const workers = await Promise.allSettled(Array.from({ length: Math.min(2, config.urls.length) }, consume));
    if (workers.some((worker) => worker.status === 'rejected')) throw new Error('Audit worker failed');
  } finally {
    try { await owner.close(); report.browserClosed = true; } catch { /* Caller sees false, not a green report. */ }
  }
  report.finishedAt = new Date().toISOString();
  return report;
}
