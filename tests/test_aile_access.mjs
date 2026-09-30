import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setupAccessTools } from '../src/lib/aile-access-client.js';
import { navigate, compareDrafts, numericTokens, familyTemplate, startCuriosity, finishCuriosity, rehearseLanguage, reviseLanguage, languageTasks } from '../src/lib/aile-access.js';

test('navigation requires a question and routes unsupported topics to people', () => {
  assert.throws(() => navigate({ question: '  ' }), /Enter/);
  const result = navigate({ topic: 'other', question: 'Where can I park?' });
  assert.deepEqual(result.cards, []);
  assert.match(result.text, /No approved fictional card/);
  assert.match(result.text, /information desk/);
});
test('sensitive text overrides a harmless topic without inventing policy', () => {
  const result = navigate({ topic: 'schedule', question: 'Will I lose aid if I drop a course?', format: 'message' });
  assert.ok(result.cards.includes('F2'));
  assert.match(result.text, /Human answer required/);
  assert.match(result.text, /Financial aid/);
  assert.match(result.text, /Practice message/);
});
test('access and wellbeing can route together', () => {
  const result = navigate({ topic: 'access', question: 'I need mental health support.' });
  assert.match(result.text, /Access services/);
  assert.match(result.text, /counseling/);
});

test('draft comparison counts repeated numbers and normalizes common numeral scripts', () => {
  assert.deepEqual(numericTokens('１２ ٦ ۸'), ['12', '6', '8']);
  const result = compareDrafts({ original: 'Room 12, 12 guests', adapted: 'Room 12', action: 'Visit' });
  assert.equal(result.numbersMatch, false);
  assert.equal(result.confirmed, false);
  assert.match(result.text, /UNREVIEWED/);
});
test('matching template numbers never certify meaning or publication', () => {
  const result = compareDrafts({ ...familyTemplate, reviewed: 'yes', reviewer: 'Liaison', meaning: '' });
  assert.equal(result.numbersMatch, true);
  assert.equal(result.confirmed, false);
  assert.match(result.text, /does NOT verify/);
  assert.throws(() => compareDrafts({ ...familyTemplate, adapted: ' ' }), /adapted draft/);
});
test('human review is labeled self-reported and numeric differences remain visible', () => {
  const result = compareDrafts({ ...familyTemplate, adapted: 'Meet at 7', reviewed: 'yes', reviewer: 'Liaison', meaning: 'Timing needs correction', access: 'internet' });
  assert.equal(result.confirmed, true);
  assert.equal(result.numbersMatch, false);
  assert.match(result.text, /self-reported/);
  assert.match(result.text, /Numeric tokens differ/);
  assert.match(result.text, /phone, paper/);
});

test('curiosity honors custom paths and rejects empty goals or challenges', () => {
  assert.throws(() => startCuriosity({ goal: ' ', path: 'debug' }), /goal/);
  assert.throws(() => startCuriosity({ goal: 'Explore', path: 'own', custom: '' }), /challenge/);
  const cycle = startCuriosity({ goal: 'Explore sound', path: 'own', custom: 'How can a rhythm suggest a mood?' });
  assert.equal(cycle.challenge, 'How can a rhythm suggest a mood?');
  assert.equal(cycle.path, 'own');
});
test('curiosity requires attempt, reflection and reason and never changes the chosen path', () => {
  const cycle = startCuriosity({ goal: 'Make a game', path: 'debug' });
  const values = { attempt: 'Compared frame rates', reflection: 'Distance doubled', next: 'switch', reason: 'I want to explore visual cues' };
  for (const field of ['attempt', 'reflection', 'reason']) assert.throws(() => finishCuriosity(cycle, { ...values, [field]: ' ' }), /Enter/);
  assert.throws(() => finishCuriosity(null, values), /Start/);
  const result = finishCuriosity(cycle, values);
  assert.equal(result.path, 'debug');
  assert.equal(result.next, 'switch');
  assert.equal(cycle.path, 'debug');
});

test('language support requires an attempt and differs for each communication task', () => {
  assert.throws(() => rehearseLanguage({ task: 'clarify', attempt: ' ' }), /first attempt/);
  assert.throws(() => rehearseLanguage({ task: 'unknown', attempt: 'Hello' }), /task/);
  const outputs = Object.keys(languageTasks).map(task => rehearseLanguage({ task, attempt: 'My words' }).text);
  assert.equal(new Set(outputs).size, 3);
  assert.match(outputs[0], /AUTHORED SUPPORT/);
  assert.match(outputs[2], /classmate turn/);
});
test('language revision requires conversation, reflection and a transfer plan without scoring', () => {
  const session = rehearseLanguage({ task: 'clarify', attempt: 'Can you give an example?', home: 'أحتاج إلى مثال' });
  const values = { revision: 'Can you give an example?', reply: 'So I need one action from each character?', reflection: 'I asked for an example', transfer: 'Try with a peer using a new instruction' };
  assert.throws(() => reviseLanguage(null, values), /first attempt/);
  for (const field of Object.keys(values)) assert.throws(() => reviseLanguage(session, { ...values, [field]: ' ' }), /Enter/);
  const result = reviseLanguage(session, values);
  assert.equal(result.unchanged, true);
  assert.match(result.text, /no proficiency score/);
  assert.match(result.text, /أحتاج إلى مثال/);
  assert.match(result.text, /Human review/);
});

function fakeNode() {
  const handlers = new Map();
  return {
    value: '', textContent: '', hidden: true, disabled: true, checked: false,
    addEventListener(type, handler) { handlers.set(type, handler); },
    fire(type, target = this) { handlers.get(type)?.({ target, preventDefault() {} }); },
    focus() {},
  };
}

function withForm(kind, initial, selectors, run) {
  const fields = Object.fromEntries(Object.entries(initial).map(([name, value]) => [name, { ...fakeNode(), name, value }]));
  const nodes = Object.fromEntries(['status', 'result', 'output', 'export', 'local-controls', ...selectors].map(name => [`[data-${name}]`, fakeNode()]));
  const root = {
    ...fakeNode(), dataset: { aileAccess: kind },
    elements: { namedItem(name) { return fields[name]; } },
    querySelector(selector) { return nodes[selector] ?? (selector === '[name="reviewed"]' ? fields.reviewed : null); },
    querySelectorAll(selector) { return selector.split(', ').map(part => nodes[part]).filter(Boolean); },
  };
  const previousDocument = globalThis.document;
  const previousFormData = globalThis.FormData;
  globalThis.document = { querySelectorAll() { return [root]; } };
  globalThis.FormData = class {
    constructor() { this.values = Object.entries(fields).filter(([name, field]) => name !== 'reviewed' || field.checked).map(([name, field]) => [name, field.value]); }
    [Symbol.iterator]() { return this.values[Symbol.iterator](); }
  };
  try {
    setupAccessTools();
    assert.equal(nodes['[data-local-controls]'].disabled, false);
    run({ root, fields, node: name => nodes[`[data-${name}]`] });
  } finally {
    globalThis.document = previousDocument;
    globalThis.FormData = previousFormData;
  }
}

test('local form remains disabled in server markup; every brief has all eight cycle steps', () => {
  const component = readFileSync(new URL('../src/components/prototypes/aile-access-tool.astro', import.meta.url), 'utf8');
  assert.match(component, /<fieldset data-local-controls disabled>/);
  assert.match(component, /<noscript>/);
  const meta = JSON.parse(readFileSync(new URL('../src/data/problems-to-prototypes/meta.json', import.meta.url)));
  const briefs = JSON.parse(readFileSync(new URL('../src/data/problems-to-prototypes/aile-3.json', import.meta.url)));
  for (const brief of briefs) {
    const cycle = meta.designCycle.map((name, index) => [name, brief.cycle[name.toLowerCase()] ?? meta.aileCommonSteps[String(index + 1)]]);
    assert.equal(cycle.length, 8);
    assert.ok(cycle.every(([name, text]) => name && text));
  }
});

test('client clears stale output/export and resets communication review on edits', () => {
  withForm('communication', { ...familyTemplate, reviewed: 'yes', reviewer: 'Liaison', meaning: 'Action checked', terms: '', feedback: '', access: 'print' }, ['template'], ({ root, fields, node }) => {
    fields.reviewed.checked = true;
    root.fire('submit');
    assert.equal(node('export').disabled, false);
    assert.match(node('output').textContent, /self-reported/);
    fields.adapted.value = '<img src=x onerror=alert(1)> 12';
    root.fire('input', fields.adapted);
    assert.equal(fields.reviewed.checked, false);
    assert.equal(node('export').disabled, true);
    assert.equal(node('result').hidden, true);
    assert.equal(node('output').textContent, '');
    root.fire('submit');
    assert.match(node('output').textContent, /<img src=x onerror=alert\(1\)>/);
    root.fire('reset');
    assert.equal(node('export').disabled, true);
    assert.equal(node('output').textContent, '');
  });
});

test('client gates curiosity reflection, invalidates revised attempts and retains learner path', () => {
  withForm('curiosity', { goal: 'Design a game', path: 'debug', custom: '', attempt: '', reflection: '', next: 'switch', reason: '' }, ['start-cycle', 'save-attempt', 'cycle-work', 'reflect', 'challenge', 'hint'], ({ root, fields, node }) => {
    node('start-cycle').fire('click');
    node('save-attempt').fire('click');
    assert.equal(node('reflect').hidden, true);
    fields.attempt.value = 'I compared two frame rates';
    node('save-attempt').fire('click');
    assert.equal(node('reflect').hidden, false);
    fields.reflection.value = 'Distance changed';
    root.fire('input', fields.attempt);
    assert.equal(fields.reflection.value, '');
    assert.equal(node('reflect').hidden, true);
    root.fire('submit');
    assert.equal(node('export').disabled, true);
    node('save-attempt').fire('click');
    fields.reflection.value = 'Distance changed';
    fields.reason.value = 'Try visual design next';
    root.fire('submit');
    assert.equal(fields.path.value, 'debug');
    assert.match(node('output').textContent, /Cycle 1/);
    assert.equal(node('export').disabled, false);
    root.fire('reset');
    node('start-cycle').fire('click');
    fields.attempt.value = 'A new test';
    node('save-attempt').fire('click');
    fields.reflection.value = 'New evidence';
    fields.reason.value = 'Keep exploring';
    root.fire('submit');
    assert.doesNotMatch(node('output').textContent, /I compared two frame rates|Cycle 2/);
  });
});

test('client requires a language attempt and clears hints/revision on task changes', () => {
  withForm('language', { task: 'clarify', attempt: '', context: '', home: '', revision: '', reply: '', reflection: '', transfer: '' }, ['language-attempt', 'language-revision', 'language-hints', 'situation'], ({ root, fields, node }) => {
    node('language-attempt').fire('click');
    assert.equal(node('language-revision').hidden, true);
    root.fire('submit');
    assert.equal(node('export').disabled, true);
    fields.attempt.value = 'Could you explain evidence?';
    node('language-attempt').fire('click');
    assert.equal(node('language-revision').hidden, false);
    fields.reply.value = 'So I need a detail for each character?';
    fields.reflection.value = 'I checked the instruction';
    fields.transfer.value = 'Ask a teacher about a new instruction';
    root.fire('submit');
    assert.equal(node('export').disabled, false);
    fields.task.value = 'group';
    root.fire('change', fields.task);
    assert.equal(node('language-revision').hidden, true);
    assert.equal(node('language-hints').textContent, '');
    assert.equal(fields.revision.value, '');
    assert.equal(node('export').disabled, true);
    assert.match(node('situation').textContent, /garden/);
  });
});
