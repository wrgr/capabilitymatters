/** Keep team edits predictable before authoritative validation by the local runner. */
import {executingActors, isIndividual} from './study-model.js';

/** @param {unknown} value @returns {object} Check the shape required to safely edit an imported configuration. */
export function importConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![1, 2].includes(value.schema_version)) {
    throw new Error('This is not a supported experiment configuration (version 1 or 2).');
  }
  if (!value.seed || !value.integration || !value.environment || !value.execution || !Array.isArray(value.team)) {
    throw new Error('The configuration needs a case, team, integration policy, environment, and execution settings.');
  }
  if (!Array.isArray(value.challenges) || !Array.isArray(value.omit_competencies) || value.team.length > 20) {
    throw new Error('Invalid challenge, competency, or team configuration.');
  }
  if (typeof value.id !== 'string' || typeof value.name !== 'string'
    || !['title', 'idea', 'domain', 'people', 'constraints'].every(key => typeof value.seed[key] === 'string')
    || !Array.isArray(value.environment.constraints) || !value.environment.constraints.every(item => typeof item === 'string')
    || typeof value.environment.resources !== 'string' || typeof value.environment.time_pressure !== 'string'
    || !['mode', 'coordinator'].every(key => typeof value.integration[key] === 'string')
    || !['provider', 'model', 'through'].every(key => typeof value.execution[key] === 'string')
    || !['repetitions', 'max_calls', 'max_output_chars'].every(key => Number.isFinite(value.execution[key]))) {
    throw new Error('The imported configuration has incomplete or incorrectly typed controls.');
  }
  if (value.schema_version === 2) checkVersionTwo(value);
  for (const actor of [...value.team, ...(value.schema_version === 2 ? [value.participation.individual] : [])]) {
    if (!actor || typeof actor.id !== 'string' || !Array.isArray(actor.competencies) || !Array.isArray(actor.stages) || !actor.behavior) {
      throw new Error('Each team member needs an identity, competencies, stages, and behavior settings.');
    }
    if (!['name', 'role', 'authority'].every(key => typeof actor[key] === 'string') || typeof actor.available !== 'boolean'
      || !['challenge', 'revision', 'communication'].every(key => typeof actor.behavior[key] === 'string')) {
      throw new Error('A team member has incomplete identity or behavior controls.');
    }
    if (value.schema_version === 2 && actor.persona_ref !== null
      && (!actor.persona_ref || !['id', 'version'].every(key => typeof actor.persona_ref[key] === 'string'))) throw new Error('A named persona needs its catalog identity and version.');
  }
  if (value.challenges.some(item => !item || !['id', 'stage', 'description'].every(key => typeof item[key] === 'string'))) throw new Error('Each challenge needs an identity, stage, and changed fact.');
  return JSON.parse(JSON.stringify(value));
}

/** @param {object} config @returns {void} Check the additional editable controls while retaining authoritative runner validation. */
function checkVersionTwo(config) {
  if (!config.participation || !['team', 'individual'].includes(config.participation.mode)
    || config.participation.allocation !== 'matched_slots' || !config.participation.individual) throw new Error('Version 2 needs a participation mode and matched individual profile.');
  const model = config.outcomes;
  if (!model || typeof model.enabled !== 'boolean' || typeof model.model_id !== 'string'
    || !Number.isFinite(model.seed) || !Number.isFinite(model.cohort_size)
    || !['conditions', 'assumptions', 'criteria'].every(key => model[key] && typeof model[key] === 'object' && !Array.isArray(model[key])
      && Object.values(model[key]).every(Number.isFinite))) throw new Error('Version 2 needs complete numeric outcome-model settings.');
}

/** @param {object} config @returns {object} Create a uniquely identified fictional team member. */
export function newActor(config) {
  let index = 1;
  while (config.team.some(actor => actor.id === `member-${index}`) || config.participation?.individual.id === `member-${index}`) index += 1;
  const actor = {id: `member-${index}`, name: `Team member ${index}`, role: 'Project contributor',
    competencies: [], stages: ['design'], behavior: {challenge: 'balanced', revision: 'open', communication: 'concise'},
    authority: 'advisory', available: true};
  if (config.schema_version === 2) actor.persona_ref = null;
  return actor;
}

/** @param {string[]} values @param {string} key @param {boolean} included @returns {string[]} Toggle one membership without duplicate values. */
export function membership(values, key, included) {
  return included ? [...new Set([...values, key])] : values.filter(value => value !== key);
}

/** @param {object} config @param {object} catalog @returns {object[]} Show declared coverage while leaving runtime resolution to the server. */
export function declaredCoverage(config, catalog) {
  return catalog.competencies.map(module => ({...module,
    omitted: config.omit_competencies.includes(module.id),
    actors: executingActors(config).filter(actor => actor.available && actor.competencies.includes(module.id)
      && (!isIndividual(config) || config.team.some(source => source.available && source.competencies.includes(module.id)))).map(actor => actor.name),
  }));
}
