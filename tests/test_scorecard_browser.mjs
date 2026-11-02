/** Exercise blind review, frozen probability results, and immutable iteration forks against a real isolated local runner. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp, readFile, mkdir, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {emptyReview} from '../public/agentic-le/experiments/scorecard-model.js';
import {verifyFrozen} from '../public/agentic-le/experiments/scorecard-records.js';

const output = resolve(process.env.SCORECARD_GUI_OUTPUT || '../scorecard_gui_qa');
const temporary = await mkdtemp(resolve(tmpdir(), 'scorecard-gui-'));
const report = {fixture_only: true, checks: [], audits: [], page_errors: []};
const python = `import sys
from pathlib import Path
sys.path.insert(0,'tools/lifecycle')
import server
server.RUNS=Path(sys.argv[1])
http=server.ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
print(http.server_port,flush=True)
http.serve_forever()`;
const runner = spawn('python3', ['-u', '-c', python, temporary], {cwd: process.cwd(), env: {...process.env, CAPABILITY_MATTERS_LIVE: '0'}, stdio: ['ignore', 'pipe', 'pipe']});
let serverLog = '', browser;
runner.stderr.on('data', chunk => { serverLog += chunk.toString(); });
const port = await new Promise((accept, reject) => {
  runner.stdout.once('data', chunk => accept(Number(chunk.toString().trim())));
  runner.once('error', reject); runner.once('exit', code => reject(new Error(`Runner exited ${code}: ${serverLog}`)));
});
const origin = `http://127.0.0.1:${port}`;
await mkdir(output, {recursive: true});

/** @param {import('playwright').Page} page @param {string} name @returns {Promise<void>} Audit every visible review surface for WCAG A and AA regressions. */
async function audit(page, name) {
  const result = await new AxeBuilder({page}).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  const violations = result.violations.map(item => ({id: item.id, nodes: item.nodes.map(node => node.target)}));
  report.audits.push({name, violations}); assert.deepEqual(violations, [], name);
}

/** @param {import('playwright').Page} page @param {string} name @returns {Promise<void>} Record small-screen geometry before asserting horizontal reflow. */
async function mobile(page, name) {
  await page.setViewportSize({width: 320, height: 900});
  await page.screenshot({path: resolve(output, `${name}-mobile.png`), fullPage: true});
  const geometry = await page.evaluate(() => ({width: document.documentElement.scrollWidth, viewport: innerWidth,
    wide: [...document.querySelectorAll('body *')].filter(node => node.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 12).map(node => ({tag: node.tagName, id: node.id, className: node.className, right: node.getBoundingClientRect().right}))}));
  assert(geometry.width <= geometry.viewport, JSON.stringify(geometry)); await audit(page, `${name} mobile`);
}

/** @param {import('playwright').Page} page @param {string} path @param {Function} action @returns {Promise<object>} Observe the authoritative response to an actual GUI action. */
async function submitted(page, path, action) {
  const response = page.waitForResponse(value => value.url().endsWith(path) && value.request().method() === 'POST');
  await action(); const result = await response;
  assert(result.ok(), await result.text()); return await result.json();
}

/** @param {import('playwright').Page} page @param {string} name @param {object} value @returns {Promise<void>} Use the page's explicit import action with a local JSON file. */
async function upload(page, name, value) {
  const chooser = page.waitForEvent('filechooser'); await page.getByRole('button', {name, exact: true}).click();
  await (await chooser).setFiles({name: 'gui-fixture.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value))});
}

/** @param {import('playwright').Page} page @param {string} name @returns {Promise<object>} Read an exported original record without rewriting its contents. */
async function downloaded(page, name) {
  const download = page.waitForEvent('download'); await page.getByRole('button', {name, exact: true}).click();
  return JSON.parse(await readFile(await (await download).path(), 'utf8'));
}

/** @param {import('playwright').Page} page @param {string} id @returns {Promise<void>} Wait only for the deterministic fixture execution to stop. */
async function stopped(page, id) {
  for (let index = 0; index < 80; index += 1) {
    const run = await (await page.request.get(`${origin}/api/runs/${id}`)).json();
    if (['completed', 'failure', 'cancelled'].includes(run.events.at(-1).kind)) { assert.equal(run.events.at(-1).kind, 'completed'); return; }
    await new Promise(accept => setTimeout(accept, 100));
  }
  throw new Error('Fixture execution did not stop.');
}

/** @param {import('playwright').Page} page @returns {Promise<object>} Save and execute an explicitly pinned scenario using actual studio controls. */
async function initialStudy(page) {
  await page.goto(origin + '/agentic-le/experiments/'); await page.locator('#workspace').waitFor({state: 'visible'});
  await page.getByLabel('Scenario preset', {exact: true}).selectOption('science-evidence');
  await submitted(page, '/api/experiments/scenarios/apply', () => page.getByRole('button', {name: 'Apply scenario', exact: true}).click());
  assert.equal(await page.getByLabel('Case title', {exact: true}).inputValue(), 'Reasoning from a fictional plant-growing comparison');
  await page.getByLabel('Iteration execution plan', {exact: true}).selectOption('single');
  await page.locator('#scorecard-assumptions').getByText('Sampling and meaningful difference', {exact: true}).click();
  await page.getByLabel('Monte Carlo draws', {exact: true}).fill('100');
  await page.getByLabel('Simulated people per draw', {exact: true}).fill('5');
  await page.locator('#scorecard-assumptions').getByText('Context and residual sensitivity assumptions', {exact: true}).click();
  await page.getByLabel('Person spread multiplier', {exact: true}).fill('1.2');
  await page.locator('#review-tab').click(); await page.getByLabel('Last stage', {exact: true}).selectOption('build');
  await page.locator('#configure-tab').click(); await page.getByLabel('Change note', {exact: true}).fill('Offline GUI fixture baseline; no research findings.');
  const iteration = await submitted(page, '/api/experiments/iterations', () => page.getByRole('button', {name: 'Save iteration', exact: true}).click());
  await page.locator('#notice').filter({hasText: 'Saved iteration-'}).waitFor();
  await page.screenshot({path: resolve(output, 'scenario-iteration-desktop.png'), fullPage: true}); await audit(page, 'Scenario and iteration desktop');
  await page.locator('#review-tab').click();
  const run = await submitted(page, '/api/experiments/runs', () => page.getByRole('button', {name: 'Start one run', exact: true}).click());
  await stopped(page, run.run_id);
  await page.locator('#run-status').filter({hasText: 'Completed'}).waitFor();
  const link = JSON.parse(await readFile(resolve(temporary, 'iterations/executions', `${run.run_id}.json`), 'utf8'));
  assert.equal(link.iteration_id, iteration.iteration_id);
  report.checks.push('Scenario preset, human-variance assumption, saved iteration, and exact run linkage through GUI');
  return {iteration, run: run.run_id};
}

/** @param {import('playwright').Page} page @param {object} parent @returns {Promise<object>} Fork a competency ablation without altering the first study or its journal. */
async function forkStudy(page, parent) {
  await page.locator('#configure-tab').click();
  await page.getByLabel('Study preset', {exact: true}).selectOption('ablation');
  await page.getByLabel('Domain to omit', {exact: true}).selectOption('learning_sciences');
  await page.getByRole('button', {name: 'Apply study preset', exact: true}).click();
  await page.locator('#notice').filter({hasText: 'Applied domain omission'}).waitFor();
  assert.match(await page.locator('.iteration-status').innerText(), /working copy changed/);
  await page.getByLabel('Change note', {exact: true}).fill('Offline fixture fork omits learning instructions; ratings below are authored test inputs.');
  const iteration = await submitted(page, '/api/experiments/iterations', () => page.getByRole('button', {name: 'Fork iteration', exact: true}).click());
  assert.equal(iteration.parent_hash, parent.iteration.content_hash);
  const savedParent = await (await page.request.get(`${origin}/api/experiments/iterations/${parent.iteration.iteration_id}`)).json();
  assert.deepEqual(savedParent, parent.iteration);
  await page.locator('#notice').filter({hasText: `Saved ${iteration.iteration_id}`}).waitFor();
  await page.locator('#review-tab').click();
  const run = await submitted(page, '/api/experiments/runs', () => page.getByRole('button', {name: 'Start one run', exact: true}).click());
  await stopped(page, run.run_id); await page.locator('#run-status').filter({hasText: 'Completed'}).waitFor();
  report.checks.push('Ablation fork preserves the exact parent snapshot and creates a new execution');
  return {iteration, run: run.run_id};
}

/** @param {import('playwright').Page} page @param {string[]} runs @returns {Promise<object>} Prepare and export public evidence and private key as separate artifacts. */
async function prepareSet(page, runs) {
  await page.locator('#scorecard-tab').click();
  await page.getByRole('button', {name: 'Refresh runs', exact: true}).click();
  await page.locator('#scorecard-panel label').filter({hasText: runs[0]}).waitFor({state: 'attached'});
  await page.getByLabel('Packet scenario', {exact: true}).selectOption('science-evidence');
  await page.locator('summary').filter({hasText: 'Select saved local runs'}).click();
  for (const id of runs) await page.getByRole('checkbox', {name: new RegExp(id)}).check();
  await submitted(page, '/api/experiments/scorecards/packets', () => page.getByRole('button', {name: 'Prepare assessment set', exact: true}).click());
  const bundle = await downloaded(page, 'Export opaque packet bundle');
  const mapping = await downloaded(page, 'Export private assignment key');
  assert.equal(bundle.packets.length, 2); assert.equal(bundle.settings.variability.person_sd_scale, 1.2);
  assert(!JSON.stringify(bundle).includes(runs[0])); assert(!('private_mapping' in bundle));
  report.checks.push('Shuffled opaque packets export separately from private mapping and retain prospective assumptions');
  return {bundle, mapping};
}

/** @param {import('playwright').Page} page @param {object} packet @param {object} settings @returns {Promise<object>} Exercise a real review form then freeze explicitly labeled synthetic test ratings. */
async function scorePacket(page, packet, settings) {
  await page.getByLabel('Opaque candidate', {exact: true}).selectOption(packet.id);
  const review = await emptyReview(packet); review.reviewer.id = 'browser-workflow-fixture';
  for (const rating of Object.values(review.ratings)) Object.assign(rating, {score: 3, lower: 2.5, upper: 3.5,
    rationale: 'Authored workflow test rating, not an empirical or independent artifact evaluation.',
    evidence_refs: [{evidence_id: 'E1', quote: 'Technical dry-run candidate', locator: 'h1'}]});
  await upload(page, 'Import review draft', {schema_version: 1, kind: 'blind_review_draft', review, settings});
  await page.locator('#blind-notice').filter({hasText: 'Restored the hash-bound draft'}).waitFor();
  await page.locator('[data-criterion="agency_dignity"]>summary').click();
  await page.getByLabel('Agency and dignity · Best-supported rating', {exact: true}).selectOption('3.5');
  assert.match(await page.locator('#review-status').innerText(), /9 of 9/);
  const frozen = await submitted(page, '/api/experiments/scorecards/freeze', () => page.getByRole('button', {name: 'Freeze scorecard', exact: true}).click());
  await page.locator('#blind-notice').filter({hasText: 'Review and probability assumptions frozen'}).waitFor();
  assert.equal(await page.getByLabel('Agency and dignity · Best-supported rating', {exact: true}).isDisabled(), true);
  const exported = await downloaded(page, 'Export frozen scorecard'); assert.deepEqual(exported, frozen);
  await verifyFrozen(exported); return frozen;
}

/** @param {import('playwright').Page} page @param {object} data @param {import('playwright').Page} organizer @returns {Promise<void>} Verify blind review refuses private keys and keeps numeric scores unavailable until actual ratings exist. */
async function reviewSet(page, data, organizer) {
  await page.goto(origin + '/agentic-le/experiments/blind-review.html');
  await page.locator('#blind-connection').filter({hasText: 'connected'}).waitFor();
  await upload(page, 'Import opaque packets', data.mapping);
  await page.locator('#blind-notice').filter({hasText: 'Packet import failed'}).waitFor();
  await upload(page, 'Import opaque packets', data.bundle);
  await page.locator('#blind-workspace').waitFor({state: 'visible'});
  assert.match(await page.locator('#review-status').innerText(), /0 of 9/);
  assert.equal(await page.locator('#blind-assumptions input:not(:disabled)').count(), 0);
  const contents = await page.locator('body').innerText();
  for (const row of data.mapping.mappings) assert(!contents.includes(row.run_id));
  await page.getByRole('button', {name: 'Open isolated preview', exact: true}).click();
  const frame = page.frameLocator('iframe'); await frame.getByText('Technical dry-run candidate', {exact: true}).waitFor();
  const sandbox = await page.locator('iframe').getAttribute('sandbox'); assert.equal(sandbox, 'allow-scripts');
  assert.equal(await page.locator('iframe').evaluate(node => { try { return Boolean(node.contentWindow.document); } catch { return false; } }), false);
  await page.getByRole('button', {name: 'Close preview', exact: true}).click();
  await scorePacket(page, data.bundle.packets[0], data.bundle.settings);
  await organizer.getByRole('button', {name: 'Load local frozen reviews', exact: true}).click();
  await organizer.locator('#notice').filter({hasText: 'Loaded 1 frozen review'}).waitFor();
  assert.equal(await organizer.getByRole('button', {name: 'Replay source run', exact: true}).count(), 0);
  await upload(organizer, 'Import key and reveal assignments', data.mapping);
  await organizer.locator('#notice').filter({hasText: 'Assignments remain withheld'}).waitFor();
  await scorePacket(page, data.bundle.packets[1], data.bundle.settings);
  await page.screenshot({path: resolve(output, 'blind-review-desktop.png'), fullPage: true}); await audit(page, 'Blind review desktop');
  await mobile(page, 'blind-review');
  report.checks.push('Strict blind packet boundary, sandboxed preview, pinned assumptions, draft import, freeze/export lock, and blocked early reveal');
}

/** @param {import('playwright').Page} page @param {object} data @returns {Promise<void>} Reveal the complete frozen set and inspect probabilities and trace links without inflating sample size. */
async function results(page, data) {
  await page.getByRole('button', {name: 'Load local frozen reviews', exact: true}).click();
  await page.locator('#notice').filter({hasText: 'Loaded 2 frozen reviews'}).waitFor();
  assert.equal(await page.getByRole('button', {name: 'Replay source run', exact: true}).count(), 0);
  await upload(page, 'Import key and reveal assignments', data.mapping);
  await page.locator('#notice').filter({hasText: 'assignments revealed'}).waitFor();
  assert.equal(await page.getByRole('button', {name: 'Replay source run', exact: true}).count(), 1);
  assert.match(await page.locator('#scorecard-panel').innerText(), /0 observed human participants/);
  assert.equal(await page.locator('.scorecard-axis[data-axis]').count(), 3);
  assert.match(await page.locator('.joint-card').innerText(), /every cohort-mean threshold/);
  await submitted(page, '/api/experiments/scorecards/compare', () => page.getByRole('button', {name: 'Compare frozen candidates', exact: true}).click());
  await page.getByRole('heading', {name: 'Conditional candidate contrast', exact: true}).waitFor();
  await page.screenshot({path: resolve(output, 'scorecard-desktop.png'), fullPage: true}); await audit(page, 'Scorecard desktop');
  await mobile(page, 'scorecard');
  await page.getByRole('button', {name: 'Replay source run', exact: true}).click(); await page.locator('#replay-content').waitFor({state: 'visible'});
  report.checks.push('Three unpooled axes, modeled intervals, criterion gates, joint probability, distinct-candidate strata, post-reveal contrast and replay');
}

try {
  browser = await chromium.launch({executablePath: process.env.CHROME_BINARY || undefined, args: process.env.CHROME_ARGS ? JSON.parse(process.env.CHROME_ARGS) : undefined, headless: true});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
  const organizer = await context.newPage(), reviewer = await context.newPage();
  for (const page of [organizer, reviewer]) page.on('pageerror', error => report.page_errors.push(error.message));
  const parent = await initialStudy(organizer), child = await forkStudy(organizer, parent);
  const data = await prepareSet(organizer, [parent.run, child.run]);
  await reviewSet(reviewer, data, organizer); await results(organizer, data);
  assert.deepEqual(report.page_errors, []);
  console.log(`Scorecard browser: ${report.checks.length} workflow checks and ${report.audits.length} accessibility audits passed.`);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({...report, server_log: serverLog}, null, 2));
  if (browser) await browser.close();
  runner.kill('SIGTERM'); await new Promise(accept => runner.once('exit', accept));
  await rm(temporary, {recursive: true, force: true});
}
