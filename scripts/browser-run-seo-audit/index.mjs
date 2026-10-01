import puppeteer from '@cloudflare/puppeteer';
import { runAudit } from './audit.mjs';

export default {
  // No public scan endpoint. Scheduled invocation is explicitly configured by the operator.
  fetch() { return new Response('Not found', { status: 404 }); },
  async scheduled(_controller, env) {
    if (env.AUDIT_ENABLED !== 'true') return;
    if (!env.REPORTS?.put) throw new Error('Private REPORTS bucket is required');
    const input = JSON.parse(env.AUDIT_CONFIG);
    const report = await runAudit(puppeteer, env.MYBROWSER, input);
    const key = `seo-audit/${crypto.randomUUID()}.json`;
    await env.REPORTS.put(key, JSON.stringify(report), {
      httpMetadata: { contentType: 'application/json' },
    });
    if (!report.browserClosed || report.pages.some((page) => page.state !== 'collected')) {
      throw new Error('Audit incomplete; inspect the private report');
    }
  },
};
