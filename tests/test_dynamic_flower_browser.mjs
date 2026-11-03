/** Exercise editable dynamic inputs and source-bound replay using explicitly scripted fixtures, never provider calls. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {access, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {buildUiFixture} from './test_dynamic_flower_ui.mjs';
const output = resolve(process.argv[2] || '../dynamic_ui_qa');
const report = {started_at: new Date().toISOString(), status: 'running', fixture_mode: 'fixture', provider_calls: 0, checks: [], audits: [], page_errors: []};
const mime = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png'};

async function staticServer() {
  const root = resolve('dist'); await access(resolve(root, 'agentic-le/dynamic/index.html'));
  const server = createServer(async (request, response) => {
    let path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (!extname(path)) path = path.replace(/\/$/, '') + '/index.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) { response.writeHead(403); response.end('Outside publication'); return; }
    try { const bytes = await readFile(file); response.writeHead(200, {'Content-Type': mime[extname(file)] || 'application/octet-stream'}); response.end(bytes); }
    catch (error) { response.writeHead(error.code === 'ENOENT' ? 404 : 500); response.end(error.code === 'ENOENT' ? 'Not found' : 'Static test server could not read the file'); }
  });
  await new Promise(accept => server.listen(0, '127.0.0.1', accept));
  return {server, origin: `http://127.0.0.1:${server.address().port}`};
}

async function launch() {
  const executable = process.env.CHROME_BINARY || chromium.executablePath();
  try { await access(executable); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    report.status = 'not_run_browser_unavailable'; report.reason = 'Playwright Chromium is not installed. Run the existing Playwright browser install in a supported development or CI environment.'; return null;
  }
  return chromium.launch({headless: true, ...(process.env.CHROME_BINARY ? {executablePath: executable} : {})});
}

async function ready(page) {
  await page.waitForFunction(() => document.querySelector('#export-config')?.disabled === false);
}

async function downloaded(page, button, name) {
  const event = page.waitForEvent('download'); await button.click();
  const download = await event, file = resolve(output, name); await download.saveAs(file); return {file, bytes: await readFile(file)};
}

async function audit(page, name) {
  const result = await new AxeBuilder({page}).include('.dynamic-lab').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const violations = result.violations.map(item => ({id: item.id, nodes: item.nodes.map(node => node.target)}));
  const overflow = await page.evaluate(() => ({width: innerWidth, scroll_width: document.documentElement.scrollWidth}));
  report.audits.push({name, violations, overflow}); assert.deepEqual(violations, [], name); assert(overflow.scroll_width <= overflow.width + 1, `${name}: horizontal overflow`);
}

async function editConfig(page, data) {
  await page.getByLabel('Case preset', {exact: true}).selectOption(data.catalog.cases[1].id);
  await page.getByLabel('Team condition preset', {exact: true}).selectOption('generalist');
  await page.getByRole('button', {name: 'Apply selected preset', exact: true}).click(); await ready(page);
  assert.equal(await page.getByLabel('Agent to edit', {exact: true}).inputValue(), 'generalist');
  await page.getByLabel('Problem and intended capability', {exact: true}).fill('A user-edited fictional task for the interface regression.');
  await page.getByLabel('Knowledge brief', {exact: true}).fill('Broad introductory knowledge; ask for specialist review when uncertain.');
  await page.getByLabel('Test facts — one per line', {exact: true}).fill('The fictional handoff now has two constraints.');
  await page.getByLabel('Viewport width', {exact: true}).fill('390');
  await page.getByLabel('Offline test condition', {exact: true}).check();
  await page.getByLabel('New user constraint or request', {exact: true}).fill('The user now requires a shorter practice.');
  await page.getByRole('button', {name: 'Queue this change', exact: true}).click();
  await page.locator('#next-version').click(); await ready(page);
  const exported = await downloaded(page, page.locator('#export-config'), 'edited-config.json'), config = JSON.parse(exported.bytes);
  assert(config.id.endsWith('-v2')); assert.equal(config.case_id, data.catalog.cases[1].id);
  assert.equal(config.agents.find(agent => agent.id === 'generalist').brief, 'Broad introductory knowledge; ask for specialist review when uncertain.');
  assert.deepEqual(config.scenarios[0].actions.find(action => action.type === 'scenario').value.facts, ['The fictional handoff now has two constraints.']);
  assert.equal(config.scenarios[0].conditions.viewport.width, 390); assert.equal(config.scenarios[0].conditions.offline, true);
  assert.equal(config.updates[0].after_turn, 3); assert.equal(config.updates[0].message, 'The user now requires a shorter practice.');
  await page.locator('#save-draft').click(); await page.reload(); await ready(page);
  assert.equal(await page.getByLabel('Configuration version ID', {exact: true}).inputValue(), config.id);
  assert.equal(await page.getByLabel('Problem and intended capability', {exact: true}).inputValue(), config.case.brief);
  await page.locator('#config-import').setInputFiles(exported.file); await ready(page);
  report.checks.push('Real case, knowledge brief, scenario action data, offline viewport, queued change, version, export/import, and saved draft round-trip');
}

async function jsonErrors(page) {
  await page.getByText('Exact configuration JSON', {exact: true}).click();
  const before = await page.locator('#config-source').inputValue();
  await page.locator('#config-source').fill('{"schema_version":"wrong"}'); assert(await page.locator('#export-config').isDisabled());
  await page.locator('#apply-config-json').click(); assert(await page.locator('#config-error').isVisible());
  await page.locator('#reload-config-json').click(); await ready(page); assert.equal(await page.locator('#config-source').inputValue(), before);
  await page.getByText('Exact configuration JSON', {exact: true}).click();
  await page.locator('#configuration-tab').focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('#record-tab').getAttribute('aria-selected'), 'true');
  await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator('#configuration-tab').getAttribute('aria-selected'), 'true');
  report.checks.push('Unapplied and invalid JSON cannot export; keyboard tabs preserve accessible selection');
}

async function seek(page, seq) {
  await page.locator('#event-range').evaluate((input, value) => { input.value = String(value); input.dispatchEvent(new Event('input', {bubbles: true})); }, seq);
}

async function replay(page, run, file) {
  await page.locator('#record-tab').click(); await page.locator('#run-import').setInputFiles(file);
  await page.locator('#record-content').waitFor({state: 'visible'});
  assert.match(await page.locator('#run-summary').innerText(), /Scripted interface demonstration — not an agentic result/);
  assert.equal(await page.locator('.phase-panel').count(), 2); assert.equal(await page.locator('.evaluation-card').count(), 4);
  assert.match(await page.locator('#record-evaluation').innerText(), /Scripted: Unknown/);
  assert.match(await page.locator('#record-observations').innerText(), /Browser observations were unavailable/);
  const firstEvaluation = run.events.find(event => event.kind === 'evaluation');
  await seek(page, firstEvaluation.seq - 1); assert.equal(await page.locator('.evaluation-card').count(), 0);
  const objection = run.events.find(event => event.kind === 'message' && event.payload.response.kind === 'objection');
  await seek(page, objection.seq); assert.match(await page.locator('#record-state').innerText(), /a concern remains/);
  await page.locator('#latest-event').click(); assert(!/a concern remains/.test(await page.locator('#record-state').innerText()));
  const original = await downloaded(page, page.locator('#export-run'), 'original-fixture-record.json'); assert.deepEqual(original.bytes, await readFile(file));
  await page.getByRole('button', {name: 'Open isolated preview', exact: true}).click();
  const frame = page.locator('iframe[title="Isolated generated candidate"]'); assert.equal(await frame.getAttribute('sandbox'), 'allow-scripts');
  assert.match(await frame.getAttribute('srcdoc'), /connect-src 'none'/);
  await page.frameLocator('iframe[title="Isolated generated candidate"]').getByRole('heading', {name: 'Scripted fixture, not a study result'}).waitFor();
  await page.getByRole('button', {name: 'Close preview', exact: true}).click();
  report.checks.push('Fixture mode, two-phase transcript, author-only objection resolution, cursor-limited evaluation, unavailable observations, exact byte export, and isolated preview');
}

async function rejectedRecord(page, run, directory) {
  const bad = structuredClone(run); bad.events.find(event => event.kind === 'message').payload.response.content = 'Tampered message.';
  const file = resolve(directory, 'tampered.json'); await writeFile(file, JSON.stringify(bad));
  await page.locator('#run-import').setInputFiles(file);
  await page.locator('#workspace-status').filter({hasText: 'Run import rejected'}).waitFor();
  assert.match(await page.locator('#run-summary').innerText(), /Scripted interface demonstration/);
  await page.locator('#copy-run-config').click(); await ready(page);
  assert.equal(await page.getByLabel('Configuration version ID', {exact: true}).inputValue(), run.config.id.replace(/-v1$/, '-v2'));
  report.checks.push('Tampered run rejected without losing prior record; pinned configuration copied into a distinct editable version');
}

async function savedRecord(page, run, file, origin) {
  await page.unroute('**/agentic-le/dynamic/study/index.json');
  await page.route('**/agentic-le/dynamic/study/index.json', route => route.fulfill({json: {entries: [{id: run.id, label: 'Scripted loader regression fixture', status: 'fixture', url: '/agentic-le/dynamic/study/fixture.json'}]}}));
  const bytes = await readFile(file);
  await page.route('**/agentic-le/dynamic/study/fixture.json', route => route.fulfill({contentType: 'application/json', body: bytes}));
  await page.goto(origin + '/agentic-le/dynamic/'); await ready(page);
  await page.getByRole('button', {name: 'Open saved conversation', exact: true}).click();
  await page.locator('#record-content').waitFor({state: 'visible'});
  assert.match(await page.locator('#run-summary').innerText(), /Scripted interface demonstration — not an agentic result/);
  report.checks.push('Optional same-site saved-record loader reuses validated import and preserves explicit fixture mode');
  await page.goto(origin + '/agentic-le/dynamic/?run=' + encodeURIComponent(run.id));
  await page.locator('#record-content').waitFor({state: 'visible'});
  assert.equal(await page.getByLabel('Published run', {exact: true}).inputValue(), run.id);
  assert.match(await page.locator('#run-summary').innerText(), /Scripted interface demonstration — not an agentic result/);
  report.checks.push('A requested saved-run link selects the indexed record and opens the same verified reader');
}

async function viewportChecks(page) {
  await page.setViewportSize({width: 1280, height: 900}); await audit(page, 'Replay desktop');
  await page.screenshot({path: resolve(output, 'replay-desktop.png'), fullPage: false});
  await page.setViewportSize({width: 390, height: 844}); await audit(page, 'Replay mobile');
  await page.screenshot({path: resolve(output, 'replay-mobile.png'), fullPage: false});
  await page.locator('#configuration-tab').click(); await audit(page, 'Configuration mobile');
  await page.screenshot({path: resolve(output, 'configuration-mobile.png'), fullPage: true});
  await page.setViewportSize({width: 320, height: 720}); await audit(page, 'Configuration narrow mobile');
}

async function main() {
  let browser, service, fixture;
  await mkdir(output, {recursive: true});
  try {
    browser = await launch();
    if (!browser) { process.exitCode = 2; return; }
    service = await staticServer(); fixture = await buildUiFixture();
    const file = resolve(fixture.directory, 'run.json'); await writeFile(file, JSON.stringify(fixture.data.run, null, 2) + '\n');
    const context = await browser.newContext({viewport: {width: 1280, height: 900}, reducedMotion: 'reduce'});
    const page = await context.newPage();
    page.on('pageerror', error => report.page_errors.push(error.message));
    await page.route('**/*', route => new URL(route.request().url()).origin === service.origin ? route.continue() : route.abort());
    await page.route('**/agentic-le/dynamic/study/index.json', route => route.fulfill({status: 404, body: 'No published records in this fixture test.'}));
    await page.goto(service.origin + '/agentic-le/dynamic/'); await ready(page);
    const about = page.locator('[data-resource-about="agentic-dynamic-flower"]');
    assert.equal(await about.count(), 1); assert.equal(await about.getAttribute('open'), null);
    assert(await page.locator('#published-runs').isHidden());
    await editConfig(page, fixture.data); await jsonErrors(page); await audit(page, 'Configuration desktop');
    await replay(page, fixture.data.run, file); await rejectedRecord(page, fixture.data.run, fixture.directory);
    await savedRecord(page, fixture.data.run, file, service.origin); await viewportChecks(page);
    assert.deepEqual(report.page_errors, []); report.status = 'passed_scripted_interface_browser_checks';
  } catch (error) { report.status = 'failed'; report.error = error.stack; process.exitCode = 1; }
  finally {
    if (browser) await browser.close();
    if (service) await new Promise(accept => service.server.close(accept));
    if (fixture) await rm(fixture.directory, {recursive: true, force: true});
    report.finished_at = new Date().toISOString(); await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({status: report.status, checks: report.checks.length, audits: report.audits.length, provider_calls: 0, report: resolve(output, 'report.json')}));
  }
}

await main();
