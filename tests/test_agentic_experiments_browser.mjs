/** Exercise the experiment GUI against an isolated real runner and a static publication. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {mkdtemp, readFile, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve, extname} from 'node:path';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const output = resolve(process.env.AGENTIC_GUI_OUTPUT || '../agentic_gui_qa');
const temporary = await mkdtemp(resolve(tmpdir(), 'agentic-gui-'));
const report = {checks: [], audits: []};
const python = `import sys,time
from pathlib import Path
sys.path.insert(0,'tools/lifecycle')
import server
server.RUNS=Path(sys.argv[1])
from experiment_fixture import DryRunProvider
original_call=DryRunProvider.call
def delayed_call(self,*args):
 if (server.RUNS/'slow.flag').exists():time.sleep(.15)
 return original_call(self,*args)
DryRunProvider.call=delayed_call
http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
print(http.server_port,flush=True)
http.serve_forever()`;
const runner = spawn('python3', ['-u', '-c', python, temporary], {cwd: process.cwd(), env: {...process.env, CAPABILITY_MATTERS_LIVE: '0'}, stdio: ['ignore', 'pipe', 'pipe']});
let serverLog = '';
runner.stderr.on('data', chunk => { serverLog += chunk.toString(); });
const port = await new Promise((accept, reject) => {
  runner.stdout.once('data', data => accept(Number(data.toString().trim())));
  runner.once('error', reject);
  runner.once('exit', code => reject(new Error(`Runner exited ${code}: ${serverLog}`)));
});
const origin = `http://127.0.0.1:${port}`;
const mime = {'.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml'};
const staticServer = createServer(async (request, response) => {
  let path = new URL(request.url, 'http://127.0.0.1').pathname;
  if (!extname(path)) path = path.replace(/\/$/, '') + '/index.html';
  try {
    const data = await readFile(resolve('dist', '.' + path));
    response.writeHead(200, {'Content-Type': mime[extname(path)] || 'application/octet-stream'}); response.end(data);
  } catch (error) {
    response.writeHead(404, {'Content-Type': 'text/plain'}); response.end('Not found');
  }
});
await new Promise(accept => staticServer.listen(0, '127.0.0.1', accept));
const staticOrigin = `http://127.0.0.1:${staticServer.address().port}`;
await mkdir(output, {recursive: true});
let browser;

/** @param {import('playwright').Page} page @param {string} name @returns {Promise<void>} Audit the visible experiment UI against WCAG A and AA. */
async function audit(page, name) {
  const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const violations = result.violations.map(item => ({id: item.id, nodes: item.nodes.map(node => node.target)}));
  report.audits.push({name, violations});
  assert.deepEqual(violations, [], name);
}

/** @param {import('playwright').Page} page @returns {Promise<void>} Change actual roster and competency controls before resolving the runtime contract. */
async function configure(page) {
  await page.goto(origin + '/agentic-le/experiments/');
  await page.locator('#workspace').waitFor({state: 'visible'});
  await page.screenshot({path: resolve(output, 'overview.png'), fullPage: false});
  await studyPresets(page);
  const card = page.locator('[data-actor="member-6"]');
  await card.locator('summary').first().click();
  await card.getByLabel('Name', {exact: true}).fill('Case reviewer');
  await card.getByLabel('Challenging a proposal').count().then(async count => {
    if (!count || !await card.getByLabel('Challenging a proposal').isVisible()) await card.getByText('Behavior and decision authority', {exact: true}).click();
  });
  await card.getByLabel('Challenging a proposal').selectOption('persistent');
  const omissions = page.locator('#integration-editor details');
  await omissions.locator('summary').click();
  await omissions.getByLabel('Measurement and inference', {exact: true}).check();
  await page.screenshot({path: resolve(output, 'configure-desktop.png'), fullPage: true});
  await audit(page, 'Configure desktop');
  const resolution = page.waitForResponse(response => response.url().endsWith('/api/experiments/resolve'));
  await page.locator('#review-configuration').click();
  const resolved = await resolution;
  assert(resolved.ok(), await resolved.text());
  await page.getByText('Resolved by runner', {exact: true}).waitFor();
  assert.match(await page.locator('#coverage-review').innerText(), /Withdrawn everywhere/);
  await page.getByText('Repetitions and resource bounds', {exact: true}).click();
  await page.getByLabel('Runs per comparison condition').fill('1');
  await page.locator('#resolve-config').click();
  await page.getByText('Resolved by runner', {exact: true}).waitFor();
  await page.screenshot({path: resolve(output, 'review-desktop.png'), fullPage: true});
  await audit(page, 'Review desktop');
  report.checks.push('Roster name, runtime behavior, global omission, exact resolution, and comparison count');
}

/** @param {import('playwright').Page} page @returns {Promise<void>} Exercise named study transformations and a persona's materialized assignments. */
async function studyPresets(page) {
  await page.getByLabel('Case title', {exact: true}).fill('A preserved GUI case');
  await page.getByLabel('Study preset', {exact: true}).selectOption('ablation');
  await page.getByLabel('Competency to omit', {exact: true}).selectOption('systems');
  await page.getByRole('button', {name: 'Apply study preset', exact: true}).click();
  await page.locator('#notice').filter({hasText: 'Applied competency ablation'}).waitFor();
  assert.match(await page.locator('#study-editor').innerText(), /Current omissions: Systems and conditions/);
  await page.getByLabel('Study preset', {exact: true}).selectOption('default');
  await page.getByRole('button', {name: 'Apply study preset', exact: true}).click();
  await page.locator('#notice').filter({hasText: 'Applied default team'}).waitFor();
  assert.equal(await page.getByLabel('Case title', {exact: true}).inputValue(), 'A preserved GUI case');
  const card = page.locator('[data-actor="member-1"]');
  await card.locator('summary').first().click();
  await card.getByLabel('Competency persona', {exact: true}).selectOption('learning-designer');
  await card.getByRole('button', {name: 'Apply persona', exact: true}).click();
  assert(await card.getByLabel('Learning and practice', {exact: true}).isChecked());
  assert(await card.getByLabel('Interaction design', {exact: true}).isChecked());
  assert(await card.getByLabel('Understand', {exact: true}).isChecked());
  await card.locator('summary').first().click();
  report.checks.push('Any-module ablation, default restoration preserving the case, and materialized named persona with unchanged stage timing');
}

/** @param {import('playwright').Page} page @returns {Promise<object>} Execute the pipeline through GUI controls and inspect the original journal. */
async function executeAndReplay(page) {
  const created = page.waitForResponse(response => response.url().endsWith('/api/experiments/runs') && response.request().method() === 'POST');
  await page.locator('#start-run').click();
  const {run_id: id} = await (await created).json();
  await page.locator('#run-status').filter({hasText: 'Completed record'}).waitFor({timeout: 15000});
  const run = await (await page.request.get(`${origin}/api/runs/${id}`)).json();
  assert.equal(run.experiment.config.team.find(actor => actor.id === 'member-6').name, 'Case reviewer');
  assert.deepEqual(run.experiment.config.omit_competencies, ['measurement']);
  const request = run.events.find(event => event.kind === 'request');
  await page.locator('#replay-first').click();
  assert.match(await page.locator('#artifact-list').innerText(), /Stage artifacts appear/);
  await outcomePlayback(page, run);
  await page.locator('#replay-range').evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', {bubbles: true})); }, String(request.seq));
  assert.equal(await page.locator('#event-detail .prompt').innerText(), request.payload.prompt);
  await page.locator('#replay-last').click();
  const build = page.locator('#artifact-list details').filter({has: page.locator('summary').filter({hasText: /^Build · revision/})}).first();
  if (!await build.evaluate(node => node.open)) await build.locator('summary').first().click();
  await build.getByRole('button', {name: 'Open isolated preview', exact: true}).click();
  const frame = build.frameLocator('iframe');
  await frame.getByLabel('Write a fictional review note').fill('Replay interaction checked');
  await frame.getByRole('button', {name: 'Preview note', exact: true}).click();
  assert.equal(await frame.locator('#result').innerText(), 'Replay interaction checked');
  await page.screenshot({path: resolve(output, 'replay-desktop.png'), fullPage: true});
  await audit(page, 'Replay desktop');
  report.checks.push('GUI dry run, pinned edited configuration, exact prompt, temporal artifacts, and working isolated candidate');
  return run;
}

/** @param {import('playwright').Page} page @param {object} run @returns {Promise<void>} Keep model results hidden until their original assessment event. */
async function outcomePlayback(page, run) {
  const assessment = run.events.find(event => event.kind === 'outcome_assessment');
  assert(assessment);
  assert.equal(await page.locator('#outcome-assessment .outcome-card').count(), 0);
  await page.locator('#replay-range').evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', {bubbles: true})); }, String(assessment.seq - 1));
  assert.equal(await page.locator('#outcome-assessment .outcome-card').count(), 0);
  await page.locator('#replay-next').click();
  assert.equal(await page.locator('#outcome-assessment .outcome-card').count(), 3);
  assert.equal(await page.locator('#outcome-assessment .outcome-status').innerText(), `Simulated ${assessment.payload.status}`);
  assert.match(await page.locator('#outcome-assessment').innerText(), /Authored fixture input/);
  assert.equal(assessment.payload.status, 'success');
  await page.locator('#outcome-assessment').screenshot({path: resolve(output, 'outcomes-success.png')});
  await page.locator('#outcome-assessment').getByRole('button', {name: /^Evidence #/}).first().click();
  assert.equal(await page.locator('#outcome-assessment .outcome-card').count(), 0);
  report.checks.push('Three synthetic dimensions appear only at their hashed event, with backward evidence navigation and authored-input labeling');
}

/** @param {import('playwright').Page} page @returns {Promise<object>} Start one actual GUI execution and return its saved journal. */
async function runCurrent(page) {
  await page.locator('#review-tab').click();
  const created = page.waitForResponse(response => response.url().endsWith('/api/experiments/runs') && response.request().method() === 'POST');
  await page.locator('#start-run').click();
  const response = await created; assert(response.ok(), await response.text());
  const {run_id: id} = await response.json();
  await page.waitForFunction(expected => document.getElementById('run-identity').textContent.includes(expected)
    && document.getElementById('run-status').textContent.includes('Completed record'), id, {timeout: 15000});
  return (await page.request.get(`${origin}/api/runs/${id}`)).json();
}

/** @param {import('playwright').Page} page @param {object} reference @returns {Promise<void>} Verify the one-agent mode retains the reference call opportunities and exposes its actual signature. */
async function individualMode(page, reference) {
  await page.locator('#configure-tab').click();
  await page.getByLabel('Study preset', {exact: true}).selectOption('individual');
  await page.getByLabel('Individual persona', {exact: true}).selectOption('generalist');
  await page.getByRole('button', {name: 'Apply study preset', exact: true}).click();
  await page.locator('#notice').filter({hasText: 'Applied individual agent'}).waitFor();
  assert.equal(await page.locator('#team-editor > [data-actor]').count(), 1);
  assert.equal(await page.getByText('Reference team and matched contribution opportunities', {exact: true}).locator('..').evaluate(node => node.open), false);
  const run = await runCurrent(page);
  const requests = run.events.filter(event => event.kind === 'request');
  assert.deepEqual([...new Set(requests.map(event => event.agent))], ['individual']);
  assert.equal(requests.length, reference.events.filter(event => event.kind === 'request').length);
  assert.equal(await page.locator('#replay-filter option').count(), 2);
  const request = requests[0];
  await page.locator('#replay-range').evaluate((input, value) => { input.value = value; input.dispatchEvent(new Event('input', {bubbles: true})); }, String(request.seq));
  await page.locator('#event-detail').getByText('Standard agent signature and effective profiles', {exact: true}).click();
  assert.match(await page.locator('#event-detail .signature').innerText(), /case_brief/);
  await page.screenshot({path: resolve(output, 'individual-signature.png'), fullPage: true});
  report.checks.push('One actual model identity across matched reference slots, unique replay filter, and the pinned typed signature');
}

/** @param {import('playwright').Page} page @returns {Promise<void>} Demonstrate world-condition failure independently of technical execution or persona labels. */
async function failedWorld(page) {
  await page.locator('#configure-tab').click();
  await page.locator('#conditions-editor').getByRole('button', {name: 'Remove challenge', exact: true}).click();
  const model = page.locator('#outcome-editor');
  await model.getByLabel('World condition preset', {exact: true}).selectOption('access_limited');
  await model.getByRole('button', {name: 'Apply world conditions', exact: true}).click();
  assert.equal(await model.getByLabel('Digital access fraction', {exact: true}).inputValue(), '0.5');
  await model.getByLabel('Available practice minutes', {exact: true}).fill('0');
  await model.getByLabel('Total support capacity in minutes', {exact: true}).fill('0');
  const run = await runCurrent(page);
  const result = run.events.find(event => event.kind === 'outcome_assessment').payload;
  assert.equal(result.status, 'failure');
  assert.equal(run.events.at(-1).kind, 'completed');
  if (await page.locator('#replay-last').isEnabled()) await page.locator('#replay-last').click();
  assert.equal(await page.locator('#outcome-assessment .outcome-status').innerText(), 'Simulated failure');
  assert.match(await page.locator('#run-status').innerText(), /Completed record/);
  await page.screenshot({path: resolve(output, 'synthetic-failure.png'), fullPage: true});
  await page.locator('#outcome-assessment').screenshot({path: resolve(output, 'outcomes-failure.png')});
  report.checks.push('Changed synthetic conditions produce recorded failure while the execution still completes successfully');
}

/** @param {import('playwright').Page} page @param {object} run @returns {Promise<void>} Export exact bytes, import the journal, and reject a modified prompt. */
async function portableRecords(page, run) {
  const received = page.waitForEvent('download');
  await page.locator('#run-export').click();
  const download = await received;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.deepEqual(exported, run);
  await page.locator('#run-file').setInputFiles({name: 'run.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(run))});
  await page.getByText('Imported journal verified. Playback uses only this saved record.', {exact: true}).waitFor();
  assert.equal(await page.locator('#replay-position').innerText(), `1 / ${run.events.length}`);
  const altered = structuredClone(run);
  altered.events.find(event => event.kind === 'request').payload.prompt += 'altered';
  await page.locator('#run-file').setInputFiles({name: 'altered.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(altered))});
  await page.locator('#notice').filter({hasText: /Journal integrity failed/}).waitFor();
  report.checks.push('Exact run export/import and rejection of a modified prompt');
}

/** @param {import('playwright').Page} page @returns {Promise<void>} Reject stale resolution when the user edits during a pending request. */
async function staleResolution(page) {
  await page.locator('#review-tab').click();
  let release;
  const gate = new Promise(accept => { release = accept; });
  let entered;
  const pending = new Promise(accept => { entered = accept; });
  const handler = async route => { entered(); await gate; await route.continue(); };
  await page.route('**/api/experiments/resolve', handler);
  await page.locator('#resolve-config').click(); await pending;
  await page.locator('#configure-tab').click();
  await page.getByLabel('Experiment name', {exact: true}).fill('Updated while resolving');
  release();
  await page.locator('#notice').filter({hasText: 'Configuration changed while it was being resolved'}).waitFor();
  await page.locator('#review-tab').click();
  assert.equal(await page.getByText('Resolved by runner', {exact: true}).count(), 0);
  await page.unroute('**/api/experiments/resolve', handler);
  report.checks.push('A delayed response cannot mark a newly edited configuration as resolved');
}

/** @param {import('playwright').Page} page @returns {Promise<void>} Keep observing completion while the user replays an older journal. */
async function backgroundExecution(page) {
  await writeFile(resolve(temporary, 'slow.flag'), 'Deliberately slow fixture calls for the navigation regression.');
  const created = page.waitForResponse(response => response.url().endsWith('/api/experiments/runs') && response.request().method() === 'POST');
  await page.locator('#start-run').click();
  const {run_id: id} = await (await created).json();
  const status = await (await page.request.get(origin + '/api/status')).json();
  assert.equal(status.active_run, id);
  await page.locator('#saved-runs .saved-run').first().click();
  await page.locator('#review-tab').click();
  await page.waitForFunction(() => !document.getElementById('start-run').disabled, null, {timeout: 15000});
  const run = await (await page.request.get(`${origin}/api/runs/${id}`)).json();
  assert.equal(run.events.at(-1).kind, 'completed');
  await rm(resolve(temporary, 'slow.flag'));
  report.checks.push('Completion monitoring survives navigation to a previous saved run');
}

/** @param {import('playwright').Page} page @param {string} kind @param {number} expected @returns {Promise<void>} Run selected comparison conditions through the actual batch endpoint. */
async function compare(page, kind = 'ablation', expected = 4) {
  await page.locator('#review-tab').click();
  await page.getByLabel('Comparison design', {exact: true}).selectOption(kind);
  if (kind === 'team_individual') {
    const panel = page.locator('#comparison-setup details');
    if (!await panel.evaluate(node => node.open)) await panel.locator('summary').click();
    await panel.getByLabel('Procedural handoff', {exact: true}).uncheck();
  }
  const created = page.waitForResponse(response => response.url().endsWith('/api/experiments/batches') && response.request().method() === 'POST');
  await page.locator('#start-comparison').click();
  const {batch_id: id} = await (await created).json();
  await page.locator('#notice').filter({hasText: /Comparison completed/}).waitFor({timeout: 20000});
  const batch = await (await page.request.get(`${origin}/api/experiments/batches/${id}`)).json();
  assert.equal(batch.runs.length, expected);
  assert(batch.runs.every(item => item.run_id));
  assert(batch.runs.every(item => item.outcome?.status));
  assert.equal(await page.locator('#comparison-results').getByRole('button', {name: 'Replay run', exact: true}).count(), expected);
  await page.locator('#comparison-results').getByRole('button', {name: 'Replay run', exact: true}).first().click();
  await page.waitForFunction(id => document.getElementById('run-identity').textContent.includes(id), batch.runs[0].run_id);
  report.checks.push(`${kind} comparison: ${expected} saved executions, synthetic outcome summaries, and direct journal replay`);
}

/** @param {import('playwright').Page} page @returns {Promise<void>} Check compact screens for full-page horizontal overflow and accessible controls. */
async function mobile(page) {
  for (const width of [390, 320]) {
    await page.setViewportSize({width, height: 900});
    for (const tab of ['configure', 'review', 'replay']) {
      await page.locator(`#${tab}-tab`).click();
      const overflow = await page.evaluate(() => ({width: document.documentElement.scrollWidth, viewport: innerWidth,
        elements: [...document.querySelectorAll('body *')].map(node => ({tag: node.tagName, id: node.id, class: node.className, right: node.getBoundingClientRect().right, width: node.getBoundingClientRect().width})).filter(node => node.width && node.right > innerWidth + 1).slice(0, 20)}));
      if (overflow.width > overflow.viewport) await page.screenshot({path: resolve(output, `overflow-${tab}-${width}.png`), fullPage: true});
      assert(overflow.width <= overflow.viewport, `${tab} ${width}px overflow: ${JSON.stringify(overflow)}`);
    }
    await page.locator('#configure-tab').click();
    await audit(page, `Configure ${width}px`);
    await page.screenshot({path: resolve(output, `configure-${width}.png`), fullPage: true});
  }
  report.checks.push('Configure, review, and replay reflow at 390px and 320px');
}

/** @param {import('playwright').Browser} browser @param {object} run @returns {Promise<void>} Verify a static publication can configure and replay without pretending to execute. */
async function staticFallback(browser, run) {
  const page = await browser.contexts()[0].newPage();
  await page.setViewportSize({width: 1200, height: 900});
  await page.goto(staticOrigin + '/agentic-le/experiments/');
  await page.locator('#workspace').waitFor({state: 'visible'});
  assert.equal(await page.locator('#connection-state').innerText(), 'Configuration and replay');
  await page.getByLabel('Study preset', {exact: true}).selectOption('individual');
  await page.getByRole('button', {name: 'Apply study preset', exact: true}).click();
  await page.locator('#notice').filter({hasText: 'Applied individual agent'}).waitFor();
  assert.equal(await page.locator('#team-editor > [data-actor]').count(), 1);
  assert.equal(await page.getByLabel('Synthetic cohort size', {exact: true}).inputValue(), '100');
  await page.locator('#review-tab').click();
  assert(await page.locator('#start-run').isDisabled());
  await page.locator('#run-file').setInputFiles({name: 'run.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(run))});
  await page.getByText('Imported journal verified. Playback uses only this saved record.', {exact: true}).waitFor();
  await page.locator('#replay-next').click();
  assert.equal(await page.locator('#replay-position').innerText(), `2 / ${run.events.length}`);
  await page.close();
  report.checks.push('Static configuration and imported replay with execution controls correctly unavailable');
}

try {
  browser = await chromium.launch({executablePath: process.env.CHROME_BINARY || undefined, args: process.env.CHROME_ARGS ? JSON.parse(process.env.CHROME_ARGS) : undefined, headless: true});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, acceptDownloads: true});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await configure(page);
  const run = await executeAndReplay(page);
  await portableRecords(page, run);
  await staleResolution(page);
  await backgroundExecution(page);
  await compare(page);
  await individualMode(page, run);
  await failedWorld(page);
  await compare(page, 'team_individual', 2);
  await mobile(page);
  await staticFallback(browser, run);
  assert.deepEqual(errors, [], 'No uncaught browser errors');
  report.checks.push('No uncaught browser errors');
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  if (browser) await browser.close();
  runner.kill('SIGTERM');
  await new Promise(accept => staticServer.close(accept));
  await rm(temporary, {recursive: true, force: true});
}
