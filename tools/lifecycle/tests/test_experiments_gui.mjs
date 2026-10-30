/** Check that browser replay accepts real experiment journals and rejects altered provenance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {importConfig, newActor, membership, declaredCoverage} from '../../../public/agentic-le/experiments/config-model.js';
import {verifyExperimentRun, replayAt, isFixture, runStatus, replayActors} from '../../../public/agentic-le/experiments/replay-model.js';
import {batchFinished} from '../../../public/agentic-le/experiments/remote.js';
import {applyStudyPreset, applyPersona, upgradeConfig, comparisonCount} from '../../../public/agentic-le/experiments/study-model.js';
import {latestAssessment} from '../../../public/agentic-le/experiments/outcome-view.js';

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
const presetScript = `import json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'tools/lifecycle')
from experiment_config import default_config,apply_study_preset,apply_persona,upgrade_config
from experiment_runtime import create_experiment,execute_experiment
source=default_config()
source['name']='Preserve this study'
source['seed']['title']='Preserve this case'
source['team'][1]['name']='Custom contributor'
source['omit_competencies']=['human']
choices=[dict(mode='default'),dict(mode='ablation',competency='systems'),dict(mode='individual',persona_id='evidence-engineer')]
legacy=default_config()
legacy['schema_version']=1
legacy.pop('participation');legacy.pop('outcomes')
for actor in legacy['team']:actor.pop('persona_ref')
for challenge in legacy['challenges']:challenge.pop('simulation_effects',None)
individual=apply_study_preset(default_config(),'individual')
with tempfile.TemporaryDirectory() as directory:
 journal=create_experiment(individual,Path(directory));execute_experiment(journal)
 print(json.dumps(dict(source=source,choices=choices,presets=[apply_study_preset(source,**choice) for choice in choices],persona=apply_persona(source,'member-1','learning-designer'),legacy=legacy,upgraded=upgrade_config(legacy),individual=journal.run),ensure_ascii=False))`;
const samples = JSON.parse((await promisify(execFile)('python3', ['-c', presetScript], {cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024})).stdout);

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

test('static study presets exactly match runner transformations while preserving the fictional case', () => {
  for (const [index, choice] of samples.choices.entries()) {
    const actual = applyStudyPreset(samples.source, baseline, catalog, choice);
    assert.deepEqual(actual, samples.presets[index]);
    assert.deepEqual(actual.seed, samples.source.seed);
    assert.equal(actual.name, samples.source.name);
  }
  const ablation = samples.presets[1];
  assert.deepEqual(ablation.omit_competencies, ['human', 'systems']);
});

test('named persona application preserves identity, authority, and matched contribution timing', () => {
  const config = structuredClone(samples.source);
  const actor = config.team.find(item => item.id === 'member-1');
  applyPersona(actor, catalog.personas.find(item => item.id === 'learning-designer'));
  assert.deepEqual(config, samples.persona);
  assert.equal(actor.id, 'member-1');
  assert.deepEqual(actor.stages, ['understand']);
});

test('legacy configurations remain editable and upgrade only through an explicit preset operation', () => {
  assert.equal(importConfig(samples.legacy).schema_version, 1);
  assert.deepEqual(upgradeConfig(samples.legacy, baseline), samples.upgraded);
  assert.equal(samples.legacy.schema_version, 1);
  assert(!Object.hasOwn(samples.legacy, 'outcomes'));
});

test('individual replay exposes one actual executing identity across the full matched call schedule', async () => {
  const individual = samples.individual;
  assert.equal(await verifyExperimentRun(individual), true);
  const requests = individual.events.filter(event => event.kind === 'request');
  assert.deepEqual([...new Set(requests.map(event => event.agent))], ['individual']);
  assert.equal(requests.length, run.events.filter(event => event.kind === 'request').length);
  assert.equal(replayActors(individual).size, 1);
  for (const event of requests) assert.equal(individual.experiment.agent_specs[event.payload.profile_key].identity.actor_id, event.agent);
});

test('synthetic outcome cards see only assessments already reached by playback', () => {
  const assessment = run.events.find(event => event.kind === 'outcome_assessment');
  assert(assessment, 'Current v2 run records its explicit illustrative assessment');
  assert.equal(latestAssessment(replayAt(run, assessment.seq - 1).events), null);
  assert.equal(latestAssessment(replayAt(run, assessment.seq).events), assessment);
  assert.equal(assessment.payload.human_outcomes_observed, false);
  assert.equal(assessment.payload.input_origin, 'authored_fixture');
});

test('comparison count follows selected factors instead of assuming a fixed four-condition matrix', () => {
  assert.equal(comparisonCount({kind: 'configured', integration_modes: ['explicit']}, 3), 3);
  assert.equal(comparisonCount({kind: 'ablation', integration_modes: ['explicit', 'handoff']}, 2), 8);
  assert.equal(comparisonCount({kind: 'team_individual', integration_modes: ['explicit']}, 1), 2);
});
