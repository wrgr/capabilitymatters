import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/pages/prototypes/edtech-alignment-auditor.astro', import.meta.url), 'utf8');
function setup() {
  const nodes = new Map();
  function find(selector) {
    if (!nodes.has(selector)) nodes.set(selector, { value: '', hidden: true, textContent: '', innerHTML: '', handlers: {}, addEventListener(event, handler) { this.handlers[event] = handler; }, focus() { this.focused = true; } });
    return nodes.get(selector);
  }
  vm.runInNewContext(source.match(/<script is:inline>([\s\S]*?)<\/script>/)[1], { document: { getElementById: () => ({ querySelector: find }) } });
  const values = { objective: 'Students explain how evidence supports a claim.', activity: 'Students explain their inference independently.', evidence: 'A written response with an explanation scored against the stated standard.', 'reasoning-actor': 'unknown', 'learner-artifact': 'unknown' };
  for (const [id, value] of Object.entries(values)) find('#' + id).value = value;
  return { find, audit: () => find('#audit').handlers.click() };
}

test('confirmation defaults are unknown and either unknown blocks provisional alignment', () => {
  for (const id of ['reasoning-actor', 'learner-artifact']) {
    assert.match(source, new RegExp('id="' + id + '">\\s*<option value="unknown">'));
    const { find, audit } = setup();
    find('#reasoning-actor').value = 'learner'; find('#learner-artifact').value = 'present';
    find('#' + id).value = 'unknown'; audit();
    assert.match(find('#gap').innerHTML, /Confirmation warning/);
    assert.doesNotMatch(find('#gap').innerHTML, /No mismatch/);
  }
});

test('teacher explanation and explicitly absent learner response cannot be promoted by keywords', () => {
  const { find, audit } = setup();
  find('#activity').value = 'Students watch a teacher explain';
  find('#evidence').value = 'Completion only; no written response or explanation is collected';
  find('#reasoning-actor').value = 'other'; find('#learner-artifact').value = 'absent'; audit();
  assert.equal(find('#activity-level').textContent, 'Learner reasoning not demonstrated');
  assert.equal(find('#evidence-level').textContent, 'No learner reasoning/performance artifact');
  assert.match(find('#gap').innerHTML, /Evidence warning/);
  find('#learner-artifact').value = 'present'; audit();
  assert.match(find('#gap').innerHTML, /Alignment warning/);
});

test('actual learner explanation with collected response permits only provisional alignment', () => {
  const { find, audit } = setup();
  find('#reasoning-actor').value = 'learner'; find('#learner-artifact').value = 'present'; audit();
  assert.equal(find('#activity-level').textContent, 'Constructive');
  assert.equal(find('#evidence-level').textContent, 'Reasoning/performance evidence');
  assert.match(find('#gap').innerHTML, /No mismatch/);
  assert.match(find('#gap').innerHTML, /provisional.*does not establish alignment/);
});

test('every text edit clears confirmations, stale feedback and the previous override', () => {
  for (const id of ['objective', 'activity', 'evidence']) {
    const { find, audit } = setup();
    find('#reasoning-actor').value = 'learner'; find('#learner-artifact').value = 'present'; audit();
    find('#override').value = 'Previous interpretation';
    find('#' + id).value += ' changed'; find('#' + id).handlers.input();
    assert.equal(find('#result').hidden, true);
    assert.equal(find('#reasoning-actor').value, 'unknown');
    assert.equal(find('#learner-artifact').value, 'unknown');
    assert.equal(find('#override').value, '');
    audit(); assert.match(find('#gap').innerHTML, /Confirmation warning/);
  }
});

test('confirmation changes hide results; blank text still blocks audit', () => {
  for (const id of ['reasoning-actor', 'learner-artifact']) {
    const { find, audit } = setup();
    audit(); assert.equal(find('#result').hidden, false);
    find('#' + id).handlers.change(); assert.equal(find('#result').hidden, true);
  }
  const { find, audit } = setup();
  find('#activity').value = '   '; audit();
  assert.equal(find('#result').hidden, true);
  assert.equal(find('#activity').focused, true);
});
