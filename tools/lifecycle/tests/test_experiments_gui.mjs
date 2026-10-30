/** Check that browser replay accepts real experiment journals and rejects altered provenance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {importConfig, newActor, membership, declaredCoverage} from '../../../public/agentic-le/experiments/config-model.js';
import {verifyExperimentRun, replayAt, isFixture, runStatus} from '../../../public/agentic-le/experiments/replay-model.js';
import {batchFinished} from '../../../public/agentic-le/experiments/remote.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const baseline = JSON.parse(readFileSync(new URL('../../../src/data/lifecycle/experiments/baseline.json', import.meta.url), 'utf8'));
const catalog = JSON.parse(readFileSync(new URL('../../../src/data/lifecycle/experiment-catalog.json', import.meta.url), 'utf8'));
const script = `import json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'tools/lifecycle')
from experiment_config import default_config
from experiment_runtime import create_experiment,execute_experiment
with tempfile.TemporaryDirectory() as directory:
 journal=create_experiment(default_config(),Path(directory))
 execute_experiment(journal)
 print(json.dumps(journal.run,ensure_ascii=False))`;
const generated = await promisify(execFile)('python3', ['-c', script], {cwd: root, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024});
const run = JSON.parse(generated.stdout);

test('portable browser replay accepts the actual Python journal and pinned configuration', async () => {
  assert.equal(await verifyExperimentRun(run), true);
  assert.equal(isFixture(run), true);
  assert.equal(runStatus(run), 'Completed record');
});

test('replay never exposes future artifacts at an earlier event', () => {
  const first = run.events.find(event => event.kind === 'artifact');
  assert.deepEqual(replayAt(run, first.seq - 1).artifacts, {});
  const visible = replayAt(run, first.seq);
  assert.equal(visible.artifacts[first.payload.id].content_hash, first.payload.content_hash);
  assert.equal(visible.events.at(-1).seq, first.seq);
  assert.equal(replayAt(run, 99999).position, run.events.length);
});

test('altered prompts and altered experiment configuration are rejected on import', async () => {
  const changedPrompt = structuredClone(run);
  changedPrompt.events.find(event => event.kind === 'request').payload.prompt += 'Changed';
  await assert.rejects(verifyExperimentRun(changedPrompt), /integrity failed/);
  const changedConfig = structuredClone(run);
  changedConfig.experiment.config.integration.mode = 'handoff';
  await assert.rejects(verifyExperimentRun(changedConfig), /Pinned experiment/);
});

test('declared coverage distinguishes unavailable members from explicit global omissions', () => {
  const config = importConfig(baseline);
  const original = declaredCoverage(config, catalog).find(row => row.id === 'measurement');
  assert(original.actors.length > 0);
  config.omit_competencies.push('measurement');
  const omitted = declaredCoverage(config, catalog).find(row => row.id === 'measurement');
  assert(omitted.omitted);
  assert.deepEqual(omitted.actors, original.actors);
  for (const actor of config.team) actor.available = false;
  assert(declaredCoverage(config, catalog).every(row => row.actors.length === 0));
});

test('new team identities remain unique while toggles preserve other assignments', () => {
  const config = importConfig(baseline);
  const actor = newActor(config);
  assert(!config.team.some(item => item.id === actor.id));
  config.team.push(actor);
  assert.notEqual(newActor(config).id, actor.id);
  assert.deepEqual(membership(['systems', 'measurement'], 'measurement', false), ['systems']);
  assert.deepEqual(membership(['systems'], 'systems', true), ['systems']);
  assert.throws(() => importConfig(run), /configuration needs/);
});

test('comparison polling terminates on retained failure and cancellation', () => {
  assert.equal(batchFinished({status: 'running'}), false);
  for (const status of ['completed', 'failed', 'cancelled', 'completed_with_failures']) assert.equal(batchFinished({status}), true);
});
