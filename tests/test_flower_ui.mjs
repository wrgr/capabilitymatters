/** Verify flower choices, legacy isolation, and strict full-solution evidence boundaries. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activeCatalog, comparisonCount, applyStudyPreset, upgradeConfig} from '../public/agentic-le/experiments/study-model.js';
import {declaredCoverage} from '../public/agentic-le/experiments/config-model.js';
import {verifyBlindPacket} from '../public/agentic-le/experiments/scorecard-model.js';
import {digest} from '../public/agentic-le/replay/state.js';
const load = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const legacyCatalog = load('../src/data/lifecycle/experiment-catalog.json');
const flowerCatalog = load('../src/data/lifecycle/flower-catalog.json');
const catalog = {...legacyCatalog, flower: flowerCatalog.flower,
  competencies: [...flowerCatalog.competencies, ...legacyCatalog.competencies],
  personas: [...flowerCatalog.personas, ...legacyCatalog.personas]};
const baseline = load('../src/data/lifecycle/experiments/flower-baseline.json');
const legacy = load('../src/data/lifecycle/experiments/baseline.json');

test('flower UI exposes exactly the eight current domains and their compatible presets', () => {
  const active = activeCatalog(baseline, catalog);
  assert.deepEqual(active.competencies.map(row => row.id), flowerCatalog.flower.domains.map(row => row.id));
  assert(active.personas.every(row => row.id.startsWith('flower-')));
  assert.equal(declaredCoverage(baseline, catalog).length, 8);
  const unassigned = structuredClone(baseline);
  unassigned.framework = 'learning-engineering-flower-v1';
  unassigned.team.forEach(actor => { actor.competencies = []; });
  unassigned.participation.individual.competencies = [];
  assert.equal(activeCatalog(unassigned, catalog).competencies.length, 8);
  assert.equal(comparisonCount({kind: 'flower', integration_modes: ['explicit']}, 3), 15);
});

test('imported legacy choices retain their own modules without an invented flower crosswalk', () => {
  const active = activeCatalog(legacy, catalog);
  assert.deepEqual(active.competencies.map(row => row.id), legacyCatalog.competencies.map(row => row.id));
  assert(active.personas.every(row => !row.id.startsWith('flower-')));
  const restored = applyStudyPreset(legacy, legacy, catalog, {mode: 'default'});
  assert.deepEqual(restored.team, legacy.team);
  assert(!('framework' in restored));
  const versionOne = structuredClone(legacy);
  versionOne.schema_version = 1; delete versionOne.participation; delete versionOne.outcomes;
  versionOne.team.forEach(actor => { delete actor.persona_ref; });
  assert.deepEqual(upgradeConfig(versionOne, legacy).participation, legacy.participation);
  const mixed = structuredClone(baseline);
  mixed.team[1].competencies.push('measurement');
  assert(activeCatalog(mixed, catalog).competencies.some(row => row.id === 'measurement'));
});

test('v1 frozen evidence remains valid and cannot silently acquire full-solution plan evidence', async () => {
  const frozen = load('../tools/lifecycle/tests/fixtures/scorecard-v1-frozen.json');
  await verifyBlindPacket(frozen.packet);
  const altered = structuredClone(frozen.packet);
  altered.evaluation_scope = 'full_solution';
  const {packet_hash, ...body} = altered;
  altered.packet_hash = await digest(body);
  await assert.rejects(verifyBlindPacket(altered), /unexpected fields/);
});
