/** Check runnable UI inputs and imported replay against the real Python engine using only scripted fixtures. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeConfig, nextVersionId, runnerCommands, validateConfig} from '../public/agentic-le/dynamic/config-model.js';
import {canonical, contentHash, replayState, verifyRecord} from '../public/agentic-le/dynamic/record-model.js';
import {savedEntries} from '../public/agentic-le/dynamic/saved-runs.js';

/** @returns {Promise<{directory:string,data:object}>} Build clearly labeled fixtures through the real offline runtime, never a provider. */
export async function buildUiFixture() {
  const directory = await mkdtemp(resolve(tmpdir(), 'dynamic-ui-fixture-'));
  const program = `import json,sys
from pathlib import Path
sys.path[:0]=['tools/lifecycle','tools/lifecycle/tests']
from dynamic_contract import load_catalog,make_config,digest
from dynamic_journal import create,load
from dynamic_runtime import freeze,observe
from dynamic_state import snapshot
from dynamic_evaluator import evaluation_packet,request_evaluation,accept_evaluation
from test_dynamic_flow import step,response,evidence_for,rating,HTML
c=load_catalog();configs=[make_config(c,a['id'],b['id']) for a in c['cases'] for b in c['conditions']]
config=make_config(c,'feedback_handoff','generalist');config['budgets']['max_context_chars']=1000000
d=Path(sys.argv[1])/'fixture-run';create(d,config,c,'fixture')
first=step(d,response('question',['generalist'],'SCRIPTED UI FIXTURE: develop a small candidate.'))
sub=step(d,response('question',['facilitator'],'SCRIPTED UI FIXTURE: clarify the constraint.'))
step(d,response('answer',['generalist'],'SCRIPTED UI FIXTURE: use the supplied brief.',reply_to=[sub['payload']['message_id']]))
step(d,response('implementation',['facilitator'],reply_to=[first['payload']['message_id']],artifact={'html':HTML,'change_summary':'Authored UI fixture only','parent_version':None}))
step(d,response('ready',['generalist'],'SCRIPTED UI FIXTURE: ready for testing.'));freeze(d)
for scenario in config['scenario_ids']:observe(d,evidence_for(load(d),scenario,'unavailable' if scenario.endswith('hard') else 'observed'))
question=step(d,response('question',['generalist'],'SCRIPTED UI FIXTURE: review the remaining concern.'))
objection=step(d,response('objection',['facilitator'],'SCRIPTED UI FIXTURE: a concern remains.',reply_to=[question['payload']['message_id']]))
issue=objection['payload']['message_id']
step(d,response('answer',['generalist'],'SCRIPTED UI FIXTURE: acknowledged, not resolved.',reply_to=[issue]))
step(d,response('resolve',['facilitator'],'SCRIPTED UI FIXTURE: author withdraws the concern.',reply_to=[issue],issue_id=issue))
for scenario in [None,*config['scenario_ids']]:
 packet=evaluation_packet(load(d),scenario);request_evaluation(d,scenario);accept_evaluation(d,rating(packet,None if scenario and scenario.endswith('hard') else 2))
run=load(d);snapshots=[]
for i in range(1,len(run['events'])+1):
 s=snapshot({**run,'events':run['events'][:i]});snapshots.append({'seq':i,'phase':s['phase'],'turns':s['turns'],'questions':s['open_questions'],'objections':s['open_objections'],'reviews':s['review_status'],'decisions':[e['payload']['message_id'] for e in s['decisions']]})
print(json.dumps({'catalog':c,'configs':configs,'run':run,'snapshots':snapshots,'digest':digest(config)}))`;
  try {
    const stdout = execFileSync('python3', ['-c', program, directory], {cwd: process.cwd(), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024});
    return {directory, data: JSON.parse(stdout)};
  } catch (error) { await rm(directory, {recursive: true, force: true}); throw error; }
}

function configTests(data) {
  for (const expected of data.configs) assert.deepEqual(makeConfig(data.catalog, expected.case_id, expected.condition_id), expected);
  const edited = structuredClone(data.configs[0]); edited.case.brief = 'User-edited capability and context.';
  edited.agents[0].brief = 'User-edited bounded knowledge.'; edited.scenarios[0].conditions.offline = true;
  edited.scenarios[0].actions[0].value.facts = ['The user supplied a changed fictional fact.'];
  edited.updates.push({id: 'change-1', phase: 'design_develop', after_turn: 3, message: 'The practice must work with less time.'});
  edited.id = nextVersionId(edited.id); validateConfig(edited, data.catalog);
  const roundtrip = JSON.parse(JSON.stringify(edited)); assert.deepEqual(roundtrip, edited);
  const verified = execFileSync('python3', ['-c', "import json,sys;sys.path.insert(0,'tools/lifecycle');from dynamic_contract import load_catalog,validate_config,digest;c=json.load(sys.stdin);validate_config(c,load_catalog());print(digest(c))"], {input: JSON.stringify(edited), encoding: 'utf8'}).trim();
  assert.match(verified, /^[a-f0-9]{64}$/); assert(runnerCommands(edited).includes(`${edited.id}.json`));
  assert.equal(nextVersionId('custom-v7'), 'custom-v8');
  for (const mutate of [value => { value.scenarios.pop(); }, value => { value.agents.find(a => a.kind === 'facilitator').domains = ['software_engineering']; }, value => { value.budgets.design_develop = 0; }, value => { value.updates[0].after_turn = 999; }, value => { value.scenarios[0].conditions.viewport.width = 100.5; }]) {
    const invalid = structuredClone(edited); mutate(invalid); assert.throws(() => validateConfig(invalid, data.catalog));
  }
  return {edited, verified};
}

async function recordTests(data) {
  await verifyRecord(data.run); assert.equal(await contentHash(data.run.config), data.digest);
  for (const expected of data.snapshots) {
    const actual = replayState(data.run, expected.seq);
    assert.deepEqual({seq: expected.seq, phase: actual.phase, turns: actual.turns, questions: actual.questions, objections: actual.objections, reviews: actual.review_status, decisions: actual.decisions.map(e => e.payload.message_id)}, expected);
  }
  const changed = structuredClone(data.run); changed.events.find(event => event.kind === 'message').payload.response.content = 'Changed without a new retained identity.';
  await assert.rejects(() => verifyRecord(changed), /integrity/);
  const pin = structuredClone(data.run); pin.config.case.title = 'Changed pinned case'; await assert.rejects(() => verifyRecord(pin), /fingerprint/);
  const firstEvaluation = data.run.events.find(event => event.kind === 'evaluation');
  assert.equal(replayState(data.run, firstEvaluation.seq - 1).evaluations.length, 0);
  assert.equal(replayState(data.run, data.run.events.length).evaluations.length, 4);
  assert(replayState(data.run, data.run.events.length).evaluations.at(-1).payload.scores.every(row => row.score === null));
  assert.throws(() => canonical({fraction: 1.5}), /safe integer/);
  const final = replayState(data.run, data.run.events.length);
  assert.equal(final.observations.length, 3); assert.equal(final.observations.at(-1).payload.evidence.status, 'unavailable');
  const origin = 'https://capabilitymatters.org', entry = {id: data.run.id, label: 'Scripted test fixture', status: 'fixture', url: '/agentic-le/dynamic/study/run.json'};
  assert.equal(savedEntries({entries: [entry]}, origin)[0].url, origin + entry.url);
  assert.throws(() => savedEntries([entry, entry], origin), /unique/);
  assert.throws(() => savedEntries([{...entry, url: 'https://example.com/run.json'}], origin), /hosted/);
  assert.throws(() => savedEntries([{...entry, url: '/agentic-le/paper/data.json'}], origin), /hosted/);
}

/** @returns {Promise<void>} Execute interface-contract checks without labeling fixtures as research or browser results. */
async function main() {
  const fixture = await buildUiFixture();
  try {
    const {edited, verified} = configTests(fixture.data); assert.equal(await contentHash(edited), verified);
    await recordTests(fixture.data);
    const source = await readFile('src/pages/agentic-le/dynamic.astro', 'utf8');
    assert(source.includes('<ResourceAbout resource="agentic-dynamic-flower"'));
    assert(source.includes('This hosted page does not call models.'));
    console.log(JSON.stringify({status: 'passed_offline_contract_tests',preset_parity: fixture.data.configs.length,replay_prefixes: fixture.data.snapshots.length,fixture_mode: fixture.data.run.mode,browser_tested: false,provider_calls: 0}));
  } finally { await rm(fixture.directory, {recursive: true, force: true}); }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
