import test from 'node:test';
import assert from 'node:assert/strict';
import { runSuite } from '../competency_pilot.mjs';

const axes = ['capability','agency','throughput','recovery'];
for (const mode of ['mvp','v2']) {
  test(mode + ': complete paired study and numeric outcomes', () => {
    const result = runSuite(mode);
    const expected = mode === 'mvp' ? 9 : 240;
    assert.equal(result.n_designs, expected);
    assert.equal(result.n_deployments, expected * 3);
    assert.equal(result.rows.length, expected);
    assert.equal(result.traces.length, mode === 'mvp' ? 3 : 6);
    for (const record of result.rows) {
      assert.ok(record.spent <= result.scenario.budget);
      assert.equal(record.tests.length, 3);
      for (const tested of record.tests) {
        for (const axis of axes) {
          assert.equal(typeof tested.outcomes[axis], 'number', axis);
          assert.ok(Number.isFinite(tested.outcomes[axis]), axis);
        }
      }
    }
    for (const item of result.summary) {
      for (const level of ['easy','medium','hard'])
        for (const axis of axes)
          assert.ok(Number.isFinite(item.mean_outcomes[level][axis]));
    }
    assert.ok(Object.values(result.validity_audits).every(BooleanOrZero));
    assert.deepEqual(result, runSuite(mode), 'replay must be exact');
  });
}
function BooleanOrZero(x) { return x === 0 || x === true; }

test('consultation remains scenario dependent', () => {
  const result = runSuite('v2');
  const rates = result.summary.map(x => x.consultation_rate);
  assert.equal(rates[0], 0);
  assert.ok(rates[1] > 0 && rates[1] < 1);
  assert.ok(rates[2] > rates[1] && rates[2] < 1);
});

test('study is explicitly labeled mechanistic', () => {
  const result = runSuite('v2');
  assert.match(result.evidence_type, /NOT independently generated LLM/);
  assert.match(result.model_status, /No external provider/);
});
