import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { checkPracticeTools, checkLensTools, checkFoundationTools, checkAccessTools } from './prototype-interactions.mjs';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const base = new URL('../dist/', import.meta.url).pathname;
const statuses = JSON.parse(await readFile(new URL('../src/data/prototypes/status.json', import.meta.url), 'utf8'));
const working = Object.values(statuses).filter((status) => status.workingPrototype);
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
const server = createServer(async (request, response) => {
  let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (!extname(path)) path = path.replace(/\/$/, '') + '/index.html';
  try {
    const body = await readFile(join(base, path));
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.CHROME_BINARY || undefined, headless: true });
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/prototypes/`);
  await page.waitForURL('**/problems-to-prototypes/?workingPrototype=true');
  assert.equal(await page.locator('.card:visible').count(), working.length);
  await page.selectOption('#collection', 'LXD');
  assert.equal(await page.locator('.card:visible').count(), 1);
  await page.reload();
  assert.equal(await page.locator('.card:visible').count(), 1);
  await page.fill('#search', 'nonexistent-query');
  assert.equal(await page.locator('.card:visible').count(), 0);
  assert(await page.locator('#none').isVisible());
  await page.goto(`${origin}/problems-to-prototypes/`);
  assert.equal(await page.locator('.card:visible').count(), 38);
  await page.selectOption('#availability', 'brief');
  assert.equal(await page.locator('.card:visible').count(), 38 - working.length);
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (process.env.PROTOTYPE_SCREENSHOTS) await page.screenshot({ path: join(process.env.PROTOTYPE_SCREENSHOTS, 'gallery-mobile.png') });

  await page.goto(`${origin}/prototypes/ai-debate-coach/`);
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('#feedback').isVisible(), false);
  await page.fill('#claim', 'Service builds community');
  await page.fill('#evidence', 'A survey of 20 students');
  await page.fill('#reasoning', 'Because shared work creates ties');
  await page.selectOption('#confidence', '65');
  await page.click('button[type=submit]');
  assert(await page.locator('#feedback').isVisible());
  await page.fill('#revision', 'Because shared work creates ties, however access matters');
  await page.click('#compare');
  assert.match(await page.locator('#comparison').innerText(), /8 words/);
  assert.match(await page.locator('#comparison').innerText(), /65%/);
  await page.fill('#claim', 'Edited claim with many extra words');
  assert.equal(await page.locator('#feedback').isVisible(), false);
  assert.equal(await page.locator('#comparison').isVisible(), false);
  await page.click('button[type=submit]');
  assert.equal(await page.inputValue('#revision'), '');
  assert.equal(await page.locator('#comparison').isVisible(), false);

  await page.goto(`${origin}/prototypes/edtech-alignment-auditor/`);
  await page.click('#audit');
  assert.match(await page.locator('#gap').innerText(), /Confirmation warning/);
  await page.fill('#activity', 'Infer and justify a motivation');
  assert.equal(await page.locator('#result').isVisible(), false);
  await page.fill('#evidence', 'Stored records');
  await page.selectOption('#reasoning-actor', 'learner');
  await page.selectOption('#learner-artifact', 'present');
  await page.click('#audit');
  assert.match(await page.locator('#gap').innerText(), /Evidence warning/);
  await page.fill('#objective', ' ');
  await page.click('#audit');
  assert.equal(await page.locator('#result').isVisible(), false);
  assert.equal(await page.locator('#objective').evaluate((element) => element === document.activeElement), true);
  await page.setViewportSize({ width: 1360, height: 900 });
  if (process.env.PROTOTYPE_SCREENSHOTS) await page.screenshot({ path: join(process.env.PROTOTYPE_SCREENSHOTS, 'auditor-desktop.png') });

  await page.goto(`${origin}/prototypes/workforce-capability-map/`);
  await page.locator('#checks input').nth(0).check();
  assert.match(await page.locator('#readiness').innerText(), /Partial evidence coverage/);
  await page.selectOption('#role', 'analyst');
  assert.equal(await page.locator('#checks input:checked').count(), 0);
  await page.locator('#checks input').nth(1).check();
  await page.selectOption('#role', 'lead');
  assert(await page.locator('#checks input').nth(0).isChecked());
  assert.equal(await page.locator('#checks input').nth(1).isChecked(), false);
  await page.selectOption('#role', 'analyst');
  assert(await page.locator('#checks input').nth(1).isChecked());
  await page.goto(`${origin}/prototypes/human-ai-delegation-simulator/`);
  for (const action of ['accept', 'verify', 'escalate']) {
    await page.selectOption('#decision', action);
    await page.fill('#rationale', 'The authority and source evidence justify this choice. <b>Plain text</b>');
    await page.click('#inspect-source');
    await page.click('#decision-form button');
    assert(await page.locator('#consequence').isVisible());
    assert(await page.locator('#decision').isDisabled());
    await page.click('#next-case');
  }
  assert.equal(await page.locator('#decision-log li').count(), 3);
  assert.equal(await page.locator('#decision-log b').count(), 0);
  const decisionsDownload = page.waitForEvent('download');
  await page.click('#download-decisions');
  const decisions = JSON.parse(await readFile(await (await decisionsDownload).path(), 'utf8'));
  assert.equal(decisions.records.length, 3);
  assert.equal(decisions.records[1].action, 'verify');
  assert.equal(decisions.records[1].sourceInspected, true);
  if (process.env.PROTOTYPE_SCREENSHOTS) await page.screenshot({ path: join(process.env.PROTOTYPE_SCREENSHOTS, 'delegation-desktop.png') });
  await page.click('#restart');
  assert.equal(await page.locator('#session-review').isVisible(), false);
  assert.equal(await page.inputValue('#rationale'), '');
  assert.equal(await page.inputValue('#decision'), '');

  await page.goto(`${origin}/prototypes/evidence-to-impact-mapper/`);
  await page.click('#impact-form button');
  assert.match(await page.locator('#plan-gaps').innerText(), /participation/);
  assert.match(await page.locator('#claim-limit').innerText(), /Do not infer improvement/);
  await page.selectOption('#transfer-type', 'independent');
  assert.equal(await page.locator('#evidence-plan').isVisible(), false);
  await page.click('#impact-form button');
  assert.equal(await page.locator('#evidence-plan').isVisible(), false);
  assert.equal(await page.locator('#transfer').evaluate((element) => element === document.activeElement), true);
  await page.fill('#transfer', 'New support case two weeks later, with no hints');
  await page.selectOption('#evidence-type', 'performance');
  await page.selectOption('#comparison-type', 'concurrent');
  await page.click('#impact-form button');
  assert.match(await page.locator('#claim-limit').innerText(), /starting differences/);
  const planDownload = page.waitForEvent('download');
  await page.click('#download-plan');
  const plan = await readFile(await (await planDownload).path(), 'utf8');
  assert.match(plan, /New support case two weeks later/);
  assert.match(plan, /Performance criterion:/);
  if (process.env.PROTOTYPE_SCREENSHOTS) await page.screenshot({ path: join(process.env.PROTOTYPE_SCREENSHOTS, 'evidence-desktop.png') });

  await page.goto(`${origin}/problems-to-prototypes/`);
  await page.getByRole('link', { name: 'Try the simulation' }).click();
  assert.equal(await page.locator('#sim-tab').getAttribute('aria-selected'), 'true');
  assert(await page.locator('#simulation').isVisible());
  assert.equal(await page.locator('#cases').isVisible(), false);
  await page.click('#case-tab');
  assert(page.url().endsWith('#cases'));
  await page.reload();
  assert.equal(await page.locator('#case-tab').getAttribute('aria-selected'), 'true');
  await page.goto(`${origin}/experiments/`);
  assert.equal(await page.locator('a[href$="capability-pipeline/index.html#simulation"]').count(), 2);

  await checkPracticeTools(page, origin);
  await checkLensTools(page, origin);
  await checkFoundationTools(page, origin);
  await checkAccessTools(page, origin);
  for (const { url } of working) {
    const route = url.split('/')[2];
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${origin}/prototypes/${route}/`);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route);
    await page.locator('.brief > details > summary').click();
    assert(await page.getByRole('heading', { name: 'Evidence anchors' }).isVisible());
    assert.equal(await page.locator('.brief .cycle > li').count(), 8, route);
    assert.equal(await page.locator('main').count(), 1);
    await page.locator('.critical-review > summary').click();
    assert.match(await page.locator('.critical-review').innerText(), /Changes made during review/);
    assert.equal(await page.locator('.critical-review li').count() > 0, true);
  }
  assert.deepEqual(errors, []);
  console.log('PASS: all 19 working prototypes, interactions and exports, stale-state guards, gallery filters, adventure links, source anchors, critical reviews, mobile overflow, and no browser script errors.');
} finally {
  await browser?.close();
  server.close();
}
