import test from 'node:test';
import assert from 'node:assert/strict';
import { teacherFeedback, teacherCases, newWorkflow, workflowStep, clinicalCases, commitClinical, clinicalFeedback } from '../src/data/prototypes/aile-practice-core.mjs';

test('teacher consequences require reasoning and a valid decision', () => {
  assert.throws(() => teacherFeedback(0, 0, '   '));
  assert.throws(() => teacherFeedback(0, -1, 'reason'));
  assert.throws(() => teacherFeedback(0, 0.5, 'reason'));
  assert.throws(() => teacherFeedback(9, 0, 'reason'));
  teacherCases.forEach((scenario, index) => {
    assert.equal(new Set(scenario.choices.map((choice, choiceIndex) => teacherFeedback(index, choiceIndex, 'My reasoning'))).size, 3);
  });
  assert.match(teacherFeedback(0, 1, '<script>bad</script>'), /does not guarantee accuracy/);
});

test('workflow blocks shortcuts and permits evidence-led fault recovery', () => {
  let state = newWorkflow();
  const original = structuredClone(state);
  assert.throws(() => workflowStep(state, 'isolate', '  '));
  assert.throws(() => workflowStep(state, 'unknown', 'prediction'));
  assert.equal(workflowStep(state, 'connect', 'prediction').connected, false);
  assert.deepEqual(state, original);
  const step = action => { state = workflowStep(state, action, 'Expected change'); };
  step('release'); assert.equal(state.released, false);
  step('isolate'); step('repair'); assert.equal(state.fault, true);
  step('connect'); step('configure'); step('power'); step('test');
  assert.equal(state.passed, false);
  step('inspect'); step('repair'); assert.equal(state.fault, true);
  step('isolate'); step('repair'); assert.equal(state.fault, false);
  step('power'); step('release'); assert.equal(state.released, false);
  step('test'); assert.equal(state.passed, true);
  step('isolate'); assert.equal(state.passed, false);
  step('power'); step('test'); step('release'); assert.equal(state.released, true);
  step('isolate'); assert.equal(state.powered, true);
});

test('clinical advice requires all independent reflections and valid confidence', () => {
  for (const inputs of [['', 'source', 'uncertainty'], ['assessment', ' ', 'uncertainty'], ['assessment', 'source', '']]) {
    assert.throws(() => commitClinical(0, ...inputs, 'low'));
  }
  assert.throws(() => commitClinical(0, 'assessment', 'source', 'unknown', ''));
  assert.throws(() => clinicalFeedback(null, 'supported', 'accept', 'reason'));
});

test('clinical comparisons support calibrated acceptance as well as challenge', () => {
  clinicalCases.forEach((scenario, index) => {
    const committed = commitClinical(index, '<img onerror=alert(1)>', 'original record', 'unknown source', 'low');
    const result = clinicalFeedback(committed, scenario.expected, scenario.response, 'Source comparison');
    assert.equal(result.evidenceMatch, true);
    assert.equal(result.responseMatch, true);
    assert.match(result.limitation, /not scored/);
    assert.throws(() => clinicalFeedback(committed, scenario.expected, scenario.response, '  '));
    assert.throws(() => clinicalFeedback(committed, 'invalid', scenario.response, 'reason'));
    const wrong = clinicalFeedback(committed, scenario.expected === 'missing' ? 'supported' : 'missing', scenario.response === 'accept' ? 'challenge' : 'accept', 'reason');
    assert.equal(wrong.evidenceMatch, false); assert.equal(wrong.responseMatch, false);
  });
  assert.equal(clinicalCases[2].response, 'accept');
});
