import test from 'node:test';
import assert from 'node:assert/strict';
import { policy, family, packet, mastery, generate } from '../src/lib/aile-foundation-core.mjs';

const learner = { prerequisite: 'unobserved', explanation: 'unobserved', transfer: 'unobserved', override: 'recommended' };
test('mastery distinguishes missing evidence from observed difficulty', () => {
  assert.match(mastery(learner).text, /RULE RECOMMENDATION: diagnostic/);
  assert.match(mastery(learner).text, /Missing evidence is not poor performance/);
  assert.match(mastery({ ...learner, prerequisite: 'developing', evidence: 'Could not match thirds with sixths after a drawing prompt.' }).text, /RULE RECOMMENDATION: prerequisite/);
  assert.throws(() => mastery({ ...learner, prerequisite: 'developing' }), /observed work/);
});
test('mastery override retains rationale and never silently changes evidence', () => {
  assert.throws(() => mastery({ ...learner, override: 'extend' }), /reason/);
  const result = mastery({ ...learner, override: 'transfer', reason: 'Gather an oral response first.' }).text;
  assert.match(result, /RULE RECOMMENDATION: diagnostic/);
  assert.match(result, /TEACHER DECISION: transfer/);
  assert.match(result, /Equivalent fractions: unobserved/);
  assert.match(result, /Gather an oral response first/);
});
test('uneven mastery evidence prompts reconciliation rather than hidden prerequisite tracking', () => {
  const result = mastery({ ...learner, prerequisite: 'developing', transfer: 'demonstrated', evidence: 'Correct recipe solution but uncertain fraction drawing.' }).text;
  assert.match(result, /Evidence is uneven/);
  assert.match(result, /new-context attempt each cycle/);
});
test('mastery routes all 27 evidence combinations consistently with stable standards', () => {
  for (const prerequisite of ['unobserved', 'developing', 'demonstrated']) {
    for (const explanation of ['unobserved', 'developing', 'demonstrated']) {
      for (const transfer of ['unobserved', 'developing', 'demonstrated']) {
        const expected = prerequisite === 'unobserved' ? 'diagnostic' : prerequisite === 'developing' ? 'prerequisite' : explanation === 'unobserved' ? 'diagnostic' : explanation === 'developing' ? 'guided' : transfer === 'demonstrated' ? 'extend' : 'transfer';
        const result = mastery({ ...learner, prerequisite, explanation, transfer, evidence: 'Teacher observed sample work.' }).text;
        assert.ok(result.includes(`RULE RECOMMENDATION: ${expected}`));
        assert.match(result, /SAME EVIDENCE STANDARD/);
        assert.match(result, /revisit on a later day/);
      }
    }
  }
});
test('dispatch rejects unknown tools and preserves entered markup as literal text', () => {
  assert.throws(() => generate('other', {}), /Unknown tool/);
  assert.match(generate('mastery-pathway-planner', { ...learner, override: 'diagnostic', reason: '<img src=x onerror=alert(1)>' }).text, /<img src=x onerror=alert\(1\)>/);
});

const curriculum = { title: 'Water cycle', source: 'Evaporation changes liquid water into water vapor.\nCondensation changes water vapor into liquid droplets.', terms: 'evaporation\nCondensation', support: 'guided' };
test('packet exercises and keys retain source provenance with separate exports', () => {
  const result = packet(curriculum);
  assert.match(result.text, /________ changes liquid water/);
  assert.match(result.text, /source line 2/);
  assert.match(result.teacher, /1\. Evaporation/);
  assert.match(result.teacher, /Source line 2: Condensation changes water vapor into liquid droplets\./);
  assert.doesNotMatch(result.text, /ANSWER KEY/);
  assert.match(result.text, /website itself is not cached/);
  assert.doesNotMatch(packet({ ...curriculum, support: 'independent' }).text, /WORD BANK/);
});
test('packet refuses absent terms, partial words, duplicate terms, and silently truncated sources', () => {
  for (const terms of ['rain', 'vaporization', 'water\nWATER', 'vap']) assert.throws(() => packet({ ...curriculum, terms }));
  assert.throws(() => packet({ ...curriculum, source: Array(13).fill('Water flows.').join('\n') }), /12 source lines/);
  assert.throws(() => packet({ ...curriculum, source: ' ' }), /source text/);
  assert.throws(() => packet({ ...curriculum, source: 'Evaporation', terms: 'Evaporation' }), /explanatory context/);
});
test('packet treats regex punctuation literally and handles accented terms', () => {
  const result = packet({ ...curriculum, source: 'C++ is a language.\nÉnergie is a French word.', terms: 'C++\nénergie' });
  assert.match(result.text, /________ is a language/);
  assert.match(result.teacher, /2\. Énergie/);
});

const proposal = { purpose: 'Revise claims', evidence: 'Independent draft', age: 'older', use: 'feedback', data: 'synthetic', oversight: 'before' };
test('bounded policy discussion never grants approval', () => {
  const result = policy(proposal).text;
  assert.match(result, /BOUNDED TRIAL DISCUSSION/);
  assert.match(result, /not institutional or legal approval/);
});
const home = { target: 'Infer using clues', context: 'A wet umbrella', strategy: 'inference', minutes: '3', mode: 'oral', observation: 'unobserved', share: 'no', note: 'Private optional question' };
test('family activity excludes observations unless a separate note is opted into', () => {
  const result = family(home);
  assert.equal(result.teacher, '');
  assert.doesNotMatch(result.text, /Private optional question/);
  const opted = family({ ...home, share: 'yes' });
  assert.match(opted.teacher, /not evidence of difficulty/);
  assert.match(opted.teacher, /Private optional question/);
  assert.doesNotMatch(opted.teacher, /A wet umbrella/);
});
test('family prompts change with strategy, time, and access without requiring identity', () => {
  const result = family({ ...home, strategy: 'vocabulary', minutes: '10', mode: 'text', explanation: 'Una explicación' }).text;
  assert.match(result, /replacement word/);
  assert.match(result, /second example today/);
  assert.match(result, /read it aloud/);
  assert.match(result, /Una explicación/);
  assert.throws(() => family({ ...home, context: ' ' }), /story/);
});
test('risk factors route independently and unknown data is not treated as safe', () => {
  for (const change of [{ data: 'unknown' }, { data: 'sensitive' }, { data: 'identifiable' }, { age: 'younger' }, { use: 'generation' }, { oversight: 'after' }, { oversight: 'none' }]) {
    assert.match(policy({ ...proposal, ...change }).text, /HUMAN REVIEW NEEDED/);
  }
  assert.throws(() => policy({ ...proposal, purpose: '  ' }), /instructional purpose/);
  assert.throws(() => policy({ ...proposal, data: 'safe' }), /valid data/);
});
