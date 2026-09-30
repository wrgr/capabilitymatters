import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { programMap, frontlineDiagnostic, harmonizeRules, safeSourceUrl } from '../src/lib/lens-tools-core.mjs';
import { bindRuleReviewInvalidation } from '../src/lib/lens-tools-ui.mjs';

const stage = overrides => ({ course: 'Capstone', opportunity: 'independent', context: 'new', observedContext: 'new', evidence: 'independent', result: 'met', note: 'Unseen case scored with agreed rubric.', ...overrides });
const program = stages => programMap({ capability: 'Choose under uncertainty', standard: 'Justify tradeoffs', stages });

test('program distinguishes opportunities from evidence and ignores completion as transfer', () => {
  const result = program([stage({ evidence: 'activity' })]);
  assert.deepEqual(result.missingOpportunities, []);
  assert.deepEqual(result.demonstratedTransfer, []);
  assert.deepEqual(result.evidenceGaps, ['Capstone']);
});
test('program transfer requires new context, independence, documented sample, and met standard', () => {
  assert.deepEqual(program([stage({})]).demonstratedTransfer, ['Capstone']);
  for (const change of [{ observedContext: 'familiar' }, { observedContext: 'unknown' }, { observedContext: undefined }, { evidence: 'guided' }, { note: '  ' }, { result: 'unknown' }, { result: 'not-yet' }]) {
    assert.deepEqual(program([stage(change)]).demonstratedTransfer, []);
  }
  assert.deepEqual(program([stage({ context: 'familiar' })]).missingOpportunities, ['Capstone']);
});
test('planned context and opportunity changes cannot manufacture or erase observed transfer', () => {
  for (const observedContext of ['unknown', 'familiar', undefined, 'invalid', 'new']) {
    for (const context of ['familiar', 'new']) {
      for (const opportunity of ['none', 'scaffolded', 'independent']) {
        const result = program([stage({ observedContext, context, opportunity })]);
        assert.equal(result.stages[0].transferOpportunity, context === 'new' && opportunity === 'independent');
        assert.equal(result.stages[0].transferEvidence, observedContext === 'new');
        assert.deepEqual(result.demonstratedTransfer, observedContext === 'new' ? ['Capstone'] : []);
        if (!observedContext || observedContext === 'invalid') assert.equal(result.stages[0].observedContext, 'unknown');
      }
    }
  }
});
test('program rejects empty target, standard, and course', () => {
  assert.throws(() => programMap({ capability: ' ', standard: 'Rubric', stages: [] }), /capability/);
  assert.throws(() => programMap({ capability: 'Judge', standard: ' ', stages: [] }), /standard/);
  assert.throws(() => program([stage({ course: '' })]), /stage 1/);
});

const frontline = overrides => frontlineDiagnostic({ task: 'Set up machine', standard: 'Match job specification', source: 'unknown', observation: '', supported: 'unknown', supportNote: '', voice: '', conditions: [{ label: 'Equipment', state: 'unknown', note: '' }], ...overrides });
test('frontline never turns proxies or unsupported assertions into training hypotheses', () => {
  for (const source of ['unknown', 'proxy']) {
    const result = frontline({ source, observation: 'Low output', supported: 'cannot', supportNote: 'Reported difficulty' });
    assert.equal(result.trainingHypotheses.length, 0);
    assert.ok(result.unknowns.some(item => item.includes('Task performance is unknown')));
  }
  assert.equal(frontline({ source: 'direct', supported: 'cannot', supportNote: 'Claim' }).trainingHypotheses.length, 0);
  assert.equal(frontline({ source: 'direct', observation: 'Wrong setup', supported: 'cannot' }).trainingHypotheses.length, 0);
});
test('frontline preserves mixed causes and routes documented constraints to process owners', () => {
  const result = frontline({ source: 'direct', observation: 'Wrong setup', supported: 'cannot', supportNote: 'Difficulty with working tools', conditions: [{ label: 'Equipment', state: 'present', note: 'Ambiguous selector labels' }] });
  assert.equal(result.trainingHypotheses.length, 1);
  assert.equal(result.constraints.length, 1);
  assert.match(result.actions[0], /process owner/);
});
test('frontline distinguishes unknown from checked absence and supported success', () => {
  const unknown = frontline({ conditions: [{ label: 'Equipment', state: 'absent', note: '  ' }] });
  assert.equal(unknown.reviewed.length, 0);
  assert.ok(unknown.unknowns.some(item => item.startsWith('Equipment: unknown')));
  const result = frontline({ source: 'direct', observation: 'Correct setup with support', supported: 'can', supportNote: 'Readable labels and adequate time', conditions: [{ label: 'Equipment', state: 'absent', note: 'Checked at start' }] });
  assert.equal(result.trainingHypotheses.length, 0);
  assert.equal(result.reviewed.length, 1);
  assert.ok(result.actions.some(item => item.includes('weakens')));
  assert.throws(() => frontline({ task: ' ' }), /task/);
});

const rule = overrides => ({ decision: 'Escalation', action: 'Call supervisor', source: 'Guide §2', url: '', scope: 'system', unit: '', role: '', owner: 'Process owner', version: 'v1', review: 'reviewed', ...overrides });
const harmonize = rules => harmonizeRules({ task: 'Intake', unit: 'North', role: 'Coordinator', rules });
test('rule edit listeners invalidate only the affected row for every reviewed field and event type', () => {
  const rows = new EventTarget();
  bindRuleReviewInvalidation(rows);
  const editedReview = { value: 'reviewed' };
  const untouchedReview = { value: 'reviewed' };
  const editedRow = { querySelector: selector => { assert.equal(selector, '[name="review"]'); return editedReview; } };
  for (const type of ['input', 'change']) {
    for (const name of ['action', 'source', 'version', 'owner', 'scope', 'decision', 'unit', 'role', 'url', 'review']) {
      editedReview.value = 'reviewed';
      const event = new Event(type);
      Object.defineProperty(event, 'target', { value: { name, closest: selector => { assert.equal(selector, 'fieldset'); return editedRow; } } });
      rows.dispatchEvent(event);
      assert.equal(editedReview.value, name === 'review' ? 'reviewed' : 'pending', `${type}: ${name}`);
      assert.equal(untouchedReview.value, 'reviewed');
      assert.equal(harmonize([rule({ review: editedReview.value })]).branchHeld, name !== 'review');
    }
  }
});
test('harmonization preserves disjoint local variations and applicable source provenance', () => {
  const result = harmonize([rule({ decision: 'Check ID' }), rule({ scope: 'unit', unit: ' North ', action: 'Call North' }), rule({ scope: 'unit-role', unit: 'South', role: 'Coordinator', action: 'Call South' })]);
  assert.equal(result.conflicts.length, 0);
  assert.equal(result.common.length, 1);
  assert.equal(result.variants.length, 2);
  assert.deepEqual(result.branch.map(item => item.id), ['R1', 'R2']);
  assert.equal(result.branch[1].source, 'Guide §2');
  assert.equal(result.branchHeld, false);
});
test('overlapping system/local or role/local rules with different actions are held for reconciliation', () => {
  for (const first of [rule({}), rule({ scope: 'role', role: 'Coordinator' })]) {
    const result = harmonize([first, rule({ scope: 'unit', unit: 'North', action: 'Call lead' })]);
    assert.equal(result.conflicts.length, 1);
    assert.equal(result.branchHeld, true);
    assert.ok(result.branch.every(item => item.held));
  }
});
test('same words remain separate comparison candidates, never confirmed equivalence', () => {
  const result = harmonize([rule({}), rule({ scope: 'unit', unit: 'North', action: ' CALL  supervisor ' })]);
  assert.equal(result.matches.length, 1);
  assert.match(result.matches[0].message, /does not confirm equivalent policy/);
  assert.equal(result.rules.length, 2);
});
test('governance omissions, no matching scope, and empty rules block a usable branch', () => {
  for (const change of [{ owner: '' }, { version: '' }, { review: 'pending' }]) {
    assert.equal(harmonize([rule(change)]).branchHeld, true);
  }
  assert.equal(harmonize([rule({ scope: 'unit', unit: 'South' })]).branchHeld, true);
  for (const rules of [[], [rule({ source: ' ' })], [rule({ scope: 'unit', unit: ' ' })], [rule({ scope: 'role', role: '' })]]) assert.throws(() => harmonize(rules));
});
test('source links reject executable protocols and embedded credentials', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,bad', 'file:///private/doc', 'https://user:secret@example.com', 'not a URL']) assert.equal(safeSourceUrl(value), null);
  assert.equal(safeSourceUrl('https://example.com/policy#section-2'), 'https://example.com/policy#section-2');
});

test('forms start disabled when JavaScript is unavailable and rendering has no HTML injection sink', () => {
  for (const slug of ['program-judgment-map', 'frontline-performance-diagnostic', 'training-harmonization-assistant']) {
    const page = readFileSync(new URL(`../src/pages/prototypes/${slug}.astro`, import.meta.url), 'utf8');
    assert.match(page, /<fieldset[^>]*data-client-gate disabled>/);
    assert.match(page, /<noscript>/);
  }
  const script = readFileSync(new URL('../src/lib/lens-tools-ui.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(script, /innerHTML|outerHTML|insertAdjacentHTML|localStorage|sessionStorage|fetch\(/);
  assert.ok(script.indexOf("form.querySelector('[data-client-gate]').disabled = false") > script.indexOf("form.addEventListener('submit'"));
});
