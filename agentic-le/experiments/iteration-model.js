/** Preserve scenario transformations and content-bound study snapshots independently of original run journals. */
import {canonical, digest} from '../replay/state.js';
import {importConfig} from './config-model.js';
import {upgradeConfig} from './study-model.js';

/** @param {object} config @param {object} catalog @param {string} id @param {object} [baseline] @returns {Promise<object>} Apply the same case replacement as the server without changing the team or execution plan. */
export async function applyScenario(config, catalog, id, baseline) {
  const scenario = catalog.scenarios.find(item => item.id === id);
  if (!scenario) throw new Error('Choose a known scenario.');
  const result = upgradeConfig(config, baseline);
  result.id = `${id}-study`; result.name = scenario.name;
  for (const key of ['seed', 'environment', 'challenges']) result[key] = structuredClone(scenario[key]);
  result.outcomes.conditions = structuredClone(scenario.legacy_outcome_conditions);
  return {config: importConfig(result), scenario_reference: {schema_version: 1, scenario_id: scenario.id,
    scenario_version: scenario.version, catalog_version: catalog.version, scenario_hash: await digest(scenario)}};
}

/** @param {object} snapshot @param {object} current @returns {boolean} Match all pinned study inputs before attaching an execution to an iteration. */
export function iterationMatches(snapshot, current) {
  if (!snapshot) return false;
  return ['config', 'comparison', 'scenario_reference', 'scorecard_assumptions'].every(key => canonical(snapshot[key] ?? null) === canonical(current[key] ?? null));
}

/** @param {object} value @returns {Promise<object>} Reject altered immutable snapshots before loading their editable working copy. */
export async function verifyIteration(value) {
  if (value?.schema_version !== 1 || value.kind !== 'experiment_iteration' || !/^iteration-[a-zA-Z0-9_-]+$/.test(value.iteration_id || '')) throw new Error('Choose an exported experiment iteration.');
  const keys = ['schema_version', 'kind', 'iteration_id', 'parent_iteration_id', 'parent_hash', 'created_at', 'change_note',
    'scenario_reference', 'config', 'config_hash', 'comparison', 'scorecard_assumptions', 'content_hash'];
  if (Object.keys(value).some(key => !keys.includes(key)) || keys.some(key => !(key in value))) throw new Error('Iteration fields do not match the versioned contract.');
  if ((value.parent_iteration_id === null) !== (value.parent_hash === null)) throw new Error('Parent identity and hash must be preserved together.');
  if (typeof value.change_note !== 'string' || !value.change_note.trim()) throw new Error('The iteration change note is missing.');
  importConfig(value.config);
  const {content_hash, ...body} = value;
  if (await digest(body) !== content_hash) throw new Error('Iteration content hash differs.');
  if (await digest(value.config) !== value.config_hash) throw new Error('Iteration configuration hash differs.');
  return structuredClone(value);
}
