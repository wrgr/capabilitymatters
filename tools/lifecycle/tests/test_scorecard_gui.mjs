/** Verify browser-side blind boundaries and portable scorecards against the actual Python scoring and iteration contracts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {digest} from '../../../public/agentic-le/replay/state.js';
import {defaultAssumptions, validateAssumptions} from '../../../public/agentic-le/experiments/scorecard-settings.js';
import {verifyBlindPacket, importBlindSet, emptyReview, reviewProblems, scenarioGroups} from '../../../public/agentic-le/experiments/scorecard-model.js';
import {importFrozen, verifyFrozen} from '../../../public/agentic-le/experiments/scorecard-records.js';
import {applyScenario, iterationMatches, verifyIteration} from '../../../public/agentic-le/experiments/iteration-model.js';
import {percent} from '../../../public/agentic-le/experiments/scorecard-view.js';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const script = `import copy,json,sys,tempfile
from pathlib import Path
sys.path.insert(0,'tools/lifecycle')
from experiment_config import default_config
from experiment_scenarios import scenario_catalog,apply_scenario,get_scenario
from experiment_runtime import run_experiment
from experiment_scorecard import build_blind_packet,review_template,freeze_review,default_settings,stable_hash
from experiment_iteration import create_iteration
catalog=scenario_catalog(); baseline=default_config()
applied=[apply_scenario(baseline,s['id']) for s in catalog['scenarios']]
settings=default_settings();settings.update(draws=100,cohort_size=8)
config=copy.deepcopy(applied[0]['config']);config['name']='HIDDEN_ASSIGNMENT_LABEL';config['execution']['through']='build'
with tempfile.TemporaryDirectory() as directory:
 root=Path(directory)
 run=run_experiment(config,root).run
 packet,mapping=build_blind_packet(run,get_scenario('feedback-conversation'))
 blank=review_template(packet);review=copy.deepcopy(blank)
 review['reviewer']['id']='offline-gui-contract-test'
 for rating in review['ratings'].values():
  rating.update(score=3,lower=2.5,upper=3.5,rationale='Authored test rating; not research evidence.',evidence_refs=[dict(evidence_id='E1',quote='Technical dry-run candidate',locator='h1')])
 frozen=freeze_review(packet,review,settings);incomplete=freeze_review(packet,blank,settings)
 body=dict(config=config,comparison=None,scenario_reference=applied[0]['scenario_reference'],scorecard_assumptions=settings,change_note='Offline test baseline')
 parent=create_iteration(root,body)
 body.update(parent_iteration_id=parent['iteration_id'],parent_hash=parent['content_hash'],change_note='Offline test fork')
 body['config']['omit_competencies']=['learning']
 child=create_iteration(root,body)
 print(json.dumps(dict(defaults=default_settings(),baseline=baseline,applied=applied,packet=packet,blank=blank,review=review,frozen=frozen,incomplete=incomplete,parent=parent,child=child),ensure_ascii=False))`;
const sample = JSON.parse((await promisify(execFile)('python3', ['-c', script], {cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024})).stdout);
const catalog = JSON.parse(await readFile(new URL('../../../public/agentic-le/experiments/scenario-catalog.json', import.meta.url), 'utf8'));

test('all three static scenario applications exactly match the Python transformations and sidecar hashes', async () => {
  assert.equal(catalog.scenarios.length, 3);
  for (const [index, scenario] of catalog.scenarios.entries()) {
    const result = await applyScenario(sample.baseline, catalog, scenario.id, sample.baseline);
    assert.deepEqual(result, sample.applied[index]);
    assert.deepEqual(result.config.team, sample.baseline.team);
    assert.deepEqual(result.config.execution, sample.baseline.execution);
  }
});

test('shared default assumptions include explicit human variation and noncompensable criterion floors', () => {
  assert.deepEqual(defaultAssumptions(), sample.defaults);
  assert.deepEqual(validateAssumptions(sample.defaults), sample.defaults);
  assert.equal(sample.defaults.variability.team_sd.learning, 0);
  assert.equal(sample.defaults.variability.person_sd_scale, 1);
  assert.equal(sample.defaults.criterion_floors.agency_dignity, 2);
  const bad = structuredClone(sample.defaults); bad.variability.person_sd_scale = 3.1;
  assert.throws(() => validateAssumptions(bad), /Invalid/);
});

test('real packets verify and blank review values stay null without generation assignment metadata', async () => {
  assert.deepEqual(await verifyBlindPacket(sample.packet), sample.packet);
  assert.deepEqual(await emptyReview(sample.packet), sample.blank);
  assert(!JSON.stringify(sample.packet).includes('HIDDEN_ASSIGNMENT_LABEL'));
  assert(Object.values(sample.blank.ratings).every(value => value.score === null));
  assert.equal(percent(null), 'Unavailable');
  assert.equal(percent(0), '0.0%');
});

test('packet imports fail closed on journals, private keys, concealed assignment fields, and altered evidence', async () => {
  await assert.rejects(importBlindSet({packets: [sample.packet], private_mapping: {}}), /unexpected fields/);
  const concealed = structuredClone(sample.packet); concealed.scenario.condition = 'hidden-condition';
  await assert.rejects(verifyBlindPacket(concealed), /unexpected fields/);
  const altered = structuredClone(sample.packet); altered.evidence[0].text += 'Changed.';
  await assert.rejects(verifyBlindPacket(altered), /Evidence hash/);
  const changedTask = structuredClone(sample.packet); changedTask.task.title += 'Changed';
  await assert.rejects(verifyBlindPacket(changedTask), /Packet content hash/);
});

test('prospective settings remain hash-bound to public packet bundles', async () => {
  const bundle = {schema_version: 1, kind: 'blind_packet_bundle', packets: [sample.packet], settings: structuredClone(sample.defaults), settings_hash: await digest(sample.defaults)};
  assert.deepEqual((await importBlindSet(bundle)).settings, sample.defaults);
  bundle.settings.variability.person_sd_scale = 2;
  await assert.rejects(importBlindSet(bundle), /assumptions hash/);
});

test('evidence-linked ratings require exact quotes while missing criteria remain explicitly unknown', () => {
  assert.deepEqual(reviewProblems(sample.packet, sample.review), []);
  const review = structuredClone(sample.review); review.ratings.alignment.evidence_refs[0].quote = 'not in the evidence';
  assert(reviewProblems(sample.packet, review).some(message => message.includes('exact evidence quote')));
  assert(reviewProblems(sample.packet, sample.blank).some(message => message.includes('unknown')));
});

test('complete and incomplete frozen records verify the same Python hashes and retained draws', async () => {
  assert.deepEqual(await verifyFrozen(sample.frozen), sample.frozen);
  assert.deepEqual(await verifyFrozen(sample.incomplete), sample.incomplete);
  assert.equal(sample.incomplete.assessment.axes, null);
  const set = await importFrozen({schema_version: 1, kind: 'frozen_scorecard_bundle', records: [sample.frozen]});
  assert.equal(set[0].assessment.independent_empirical_sample_size, 0);
});

test('edited frozen summaries are rejected even when the outer content hash is recalculated', async () => {
  const changed = structuredClone(sample.frozen); changed.assessment.axes.learning.mean += 3;
  const {record_hash, ...body} = changed; changed.record_hash = await digest(body);
  await assert.rejects(verifyFrozen(changed), /summary differs/);
  const invented = structuredClone(sample.incomplete); invented.assessment.axes = {learning: 0};
  const {record_hash: prior, ...rest} = invented; invented.record_hash = await digest(rest);
  await assert.rejects(verifyFrozen(invented), /Incomplete evidence/);
});

test('scenario grouping retains distinct task strata without pooling their outcome scores', () => {
  const second = structuredClone(sample.frozen); second.assessment.scenario.id = 'science-evidence';
  assert.deepEqual(scenarioGroups([sample.frozen, second]).map(group => group.id), ['feedback-conversation', 'science-evidence']);
});

test('iteration forks verify immutable ancestry and every edited study input invalidates execution attachment', async () => {
  const parent = await verifyIteration(sample.parent), child = await verifyIteration(sample.child);
  assert.equal(child.parent_iteration_id, parent.iteration_id);
  assert.equal(child.parent_hash, parent.content_hash);
  assert.deepEqual(parent.config.omit_competencies, []);
  assert.deepEqual(child.config.omit_competencies, ['learning']);
  assert(iterationMatches(parent, parent));
  const edited = structuredClone(parent); edited.scorecard_assumptions.variability.person_sd_scale = 2;
  assert(!iterationMatches(parent, edited));
  await assert.rejects(verifyIteration(edited), /content hash differs/);
});
