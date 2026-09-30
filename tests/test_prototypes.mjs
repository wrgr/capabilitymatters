import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { Script, runInNewContext } from 'node:vm';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const inlineScripts = (source) => [...source.matchAll(/<script is:inline>([\s\S]*?)<\/script>/g)].map((match) => match[1]);

function fixture(page, rootId) {
  const source = read(`src/pages/prototypes/${page}.astro`);
  const elements = new Map();
  for (const [, id] of source.matchAll(/\bid="([^"]+)"/g)) {
    elements.set(`#${id}`, {
      value: '', textContent: '', innerHTML: '', hidden: true, focused: false,
      listeners: {}, children: [], selectedOptions: [{ textContent: 'Test selection' }],
      addEventListener(event, handler) { this.listeners[event] = handler; },
      focus() { this.focused = true; },
      reset() {},
      replaceChildren() { this.children = []; },
      append(child) { this.children.push(child); },
    });
  }
  const root = { querySelector: (selector) => elements.get(selector) };
  runInNewContext(inlineScripts(source)[0], {
    document: { getElementById: (id) => id === rootId ? root : null, createElement: () => ({ textContent: '' }) },
    alert: () => assert.fail('Unexpected validation alert'),
  });
  return {
    get: (id) => elements.get(`#${id}`),
    input(id, value) { const element = elements.get(`#${id}`); element.value = value; element.listeners.input?.(); },
    fire(id, event = 'click') { elements.get(`#${id}`).listeners[event]({ preventDefault() {} }); },
  };
}

test('all prototype and gallery inline scripts parse', () => {
  const pages = ['src/pages/problems-to-prototypes.astro', ...readdirSync(new URL('../src/pages/prototypes/', import.meta.url)).map((name) => `src/pages/prototypes/${name}`)];
  for (const page of pages) for (const script of inlineScripts(read(page))) new Script(script, { filename: page });
});

test('brief IDs are unique and every evidence reference resolves', () => {
  const directory = 'src/data/problems-to-prototypes/';
  const evidence = JSON.parse(read(`${directory}evidence.json`));
  const sources = new Set(evidence.map((source) => source.id));
  assert.equal(sources.size, evidence.length);
  const ids = new Set();
  for (const name of readdirSync(new URL(`../${directory}`, import.meta.url))) {
    if (['meta.json', 'evidence.json'].includes(name)) continue;
    for (const idea of JSON.parse(read(directory + name))) {
      assert(!ids.has(idea.id), `Duplicate brief: ${idea.id}`);
      ids.add(idea.id);
      assert(idea.evidence.length, `Missing evidence: ${idea.id}`);
      for (const anchor of idea.evidence) assert(sources.has(anchor), `Unknown evidence: ${anchor}`);
    }
  }
  assert.equal(ids.size, 38);
});

test('every brief has explicit status and working tools have a route and critical review', () => {
  const statuses = JSON.parse(read('src/data/prototypes/status.json'));
  const reviews = Object.assign({}, ...readdirSync(new URL('../src/data/prototypes/', import.meta.url))
    .filter((name) => name.startsWith('reviews-') && name.endsWith('.json'))
    .map((name) => JSON.parse(read(`src/data/prototypes/${name}`))));
  const ids = readdirSync(new URL('../src/data/problems-to-prototypes/', import.meta.url))
    .filter((name) => !['meta.json', 'evidence.json'].includes(name))
    .flatMap((name) => JSON.parse(read(`src/data/problems-to-prototypes/${name}`)).map((idea) => idea.id));
  assert.deepEqual(Object.keys(statuses).sort(), ids.sort());
  const urls = new Set();
  for (const [id, status] of Object.entries(statuses)) {
    assert.equal(typeof status.workingPrototype, 'boolean', id);
    if (!status.workingPrototype) continue;
    assert.match(status.url, /^\/prototypes\/[a-z0-9-]+\/$/);
    assert(!urls.has(status.url), `Duplicate route: ${status.url}`);
    urls.add(status.url);
    assert(existsSync(new URL(`../src/pages${status.url.slice(0, -1)}.astro`, import.meta.url)), id);
    const review = reviews[id];
    assert(review, `Missing critical review: ${id}`);
    for (const key of ['assumption', 'failureMode', 'falsificationTest', 'nonAiAlternative', 'measurement', 'risks']) {
      assert.equal(typeof review[key], 'string', `${id}: ${key}`);
      assert(review[key].trim().length > 20, `${id}: empty review ${key}`);
    }
    assert(review.edits.length > 0, `No review edits: ${id}`);
    assert(review.tests.length > 0, `No review checks: ${id}`);
  }
});

test('auditor rejects blank input and focuses the missing field', () => {
  const app = fixture('edtech-alignment-auditor', 'alignment-auditor');
  app.fire('audit');
  assert.equal(app.get('result').hidden, true);
  assert.equal(app.get('objective').focused, true);
  assert.match(app.get('audit-status').textContent, /Add an objective/);
});

test('auditor detects an objective/activity mismatch with subject-neutral advice', () => {
  const app = fixture('edtech-alignment-auditor', 'alignment-auditor');
  app.input('objective', 'Explain a chemical reaction');
  app.input('activity', 'Select the correct formula');
  app.input('evidence', 'Correct selections');
  app.input('reasoning-actor', 'learner');
  app.input('learner-artifact', 'present');
  app.fire('audit');
  assert.equal(app.get('result').hidden, false);
  assert.match(app.get('gap').innerHTML, /Alignment warning/);
  assert.doesNotMatch(app.get('redesign-copy').textContent, /vocabulary|textual|reading/);
  app.input('activity', 'Explain the reaction');
  assert.equal(app.get('result').hidden, true);
});

for (const evidence of ['Completion and time', 'Stored records', 'Correct answers']) {
  test(`auditor does not certify reasoning from ${evidence.toLowerCase()}`, () => {
    const app = fixture('edtech-alignment-auditor', 'alignment-auditor');
    app.input('objective', 'Explain a chemical reaction');
    app.input('activity', 'Explain a chemical reaction');
    app.input('evidence', evidence);
    app.input('reasoning-actor', 'learner');
    app.input('learner-artifact', 'present');
    app.fire('audit');
    assert.match(app.get('gap').innerHTML, /Evidence warning/);
  });
}

test('auditor keeps plausible alignment provisional', () => {
  const app = fixture('edtech-alignment-auditor', 'alignment-auditor');
  app.input('objective', 'Discuss competing explanations');
  app.input('activity', 'Discuss and respond to peers');
  app.input('evidence', 'Written explanation scored against a standard');
  app.input('reasoning-actor', 'learner');
  app.input('learner-artifact', 'present');
  app.fire('audit');
  assert.equal(app.get('activity-level').textContent, 'Interactive');
  assert.match(app.get('gap').innerHTML, /does not establish alignment/);
});

test('debate compares the submitted attempt and resets results on resubmission', () => {
  const app = fixture('ai-debate-coach', 'debate-coach');
  app.input('claim', 'Service builds community');
  app.input('evidence', 'A survey of 20 students');
  app.input('reasoning', 'Because shared work creates ties');
  app.input('confidence', '65');
  app.fire('debate-form', 'submit');
  app.input('revision', 'Because shared work creates ties, however access matters');
  app.fire('compare');
  assert.match(app.get('comparison').innerHTML, /submitted claim \+ reasoning 8 words/);
  assert.match(app.get('comparison').innerHTML, /65%/);
  app.input('revision', 'A different revision');
  assert.equal(app.get('comparison').hidden, true);
  app.fire('debate-form', 'submit');
  assert.equal(app.get('revision').value, '');
  assert.equal(app.get('comparison').hidden, true);
});

for (const field of ['claim', 'evidence', 'reasoning', 'confidence']) {
  test(`debate invalidates feedback when initial ${field} changes`, () => {
    const app = fixture('ai-debate-coach', 'debate-coach');
    for (const input of ['claim', 'evidence', 'reasoning']) app.input(input, 'Original attempt');
    app.fire('debate-form', 'submit');
    app.input('revision', 'Because this is a revision');
    app.fire('compare');
    app.input(field, '');
    assert.equal(app.get('feedback').hidden, true);
    assert.equal(app.get('comparison').hidden, true);
    app.fire('compare');
    assert.equal(app.get('comparison').hidden, true);
  });
}

test('delegation records one decision per case and resets a complete round', () => {
  const app = fixture('human-ai-delegation-simulator', 'delegation-simulator');
  app.input('decision', 'accept');
  app.input('rationale', '   ');
  app.fire('decision-form', 'submit');
  assert.equal(app.get('consequence').hidden, true);
  for (const action of ['accept', 'verify', 'escalate']) {
    app.input('decision', action);
    app.input('rationale', 'The stated authority and source support this choice.');
    app.input('decision-confidence', '65%');
    app.fire('inspect-source');
    app.fire('decision-form', 'submit');
    assert.equal(app.get('decision-fields').disabled, true);
    assert.equal(app.get('consequence').hidden, false);
    app.fire('decision-form', 'submit');
    app.fire('next-case');
  }
  assert.equal(app.get('session-review').hidden, false);
  assert.equal(app.get('decision-log').children.length, 3);
  assert.match(app.get('decision-log').children[1].textContent, /verify; confidence 65%; source inspected before decision: yes/);
  app.fire('restart');
  assert.equal(app.get('progress').textContent, 'Case 1 of 3');
  assert.equal(app.get('decision-fields').disabled, false);
  assert.equal(app.get('session-review').hidden, true);
  assert.equal(app.get('source-record').hidden, true);
});

test('mapper distinguishes activity, transfer, and comparison limits', () => {
  const app = fixture('evidence-to-impact-mapper', 'impact-mapper');
  for (const id of ['outcome', 'capability', 'intervention', 'measure', 'criterion', 'rival']) app.input(id, `Example ${id}`);
  app.input('evidence-type', 'activity');
  app.input('transfer-type', 'none');
  app.input('comparison-type', 'none');
  app.fire('impact-form', 'submit');
  assert.equal(app.get('evidence-plan').hidden, false);
  assert.match(app.get('plan-gaps').children[0].textContent, /participation/);
  assert.match(app.get('claim-limit').textContent, /Do not infer improvement/);
  app.input('transfer-type', 'independent');
  app.fire('impact-form', 'submit');
  assert.equal(app.get('evidence-plan').hidden, true);
  assert.equal(app.get('transfer').focused, true);
  app.input('transfer', 'An unfamiliar case two weeks later without hints');
  app.input('evidence-type', 'performance');
  app.input('comparison-type', 'concurrent');
  app.fire('impact-form', 'submit');
  assert.match(app.get('claim-limit').textContent, /starting differences/);
  assert.match(app.get('plan-preview').textContent, /Example criterion/);
  assert.match(app.get('next-measure').textContent, /two reviewers/);
  app.fire('impact-form', 'input');
  assert.equal(app.get('evidence-plan').hidden, true);
});
