/** Keep team edits predictable before authoritative validation by the local runner. */

/** @param {unknown} value @returns {object} Check the shape required to safely edit an imported configuration. */
export function importConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schema_version !== 1) {
    throw new Error('This is not a version 1 experiment configuration.');
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
  for (const actor of value.team) {
    if (!actor || typeof actor.id !== 'string' || !Array.isArray(actor.competencies) || !Array.isArray(actor.stages) || !actor.behavior) {
      throw new Error('Each team member needs an identity, competencies, stages, and behavior settings.');
    }
    if (!['name', 'role', 'authority'].every(key => typeof actor[key] === 'string') || typeof actor.available !== 'boolean'
      || !['challenge', 'revision', 'communication'].every(key => typeof actor.behavior[key] === 'string')) {
      throw new Error('A team member has incomplete identity or behavior controls.');
    }
  }
  if (value.challenges.some(item => !item || !['id', 'stage', 'description'].every(key => typeof item[key] === 'string'))) throw new Error('Each challenge needs an identity, stage, and changed fact.');
  return JSON.parse(JSON.stringify(value));
}

/** @param {object} config @returns {object} Create a uniquely identified fictional team member. */
export function newActor(config) {
  let index = 1;
  while (config.team.some(actor => actor.id === `member-${index}`)) index += 1;
  return {id: `member-${index}`, name: `Team member ${index}`, role: 'Project contributor',
    competencies: [], stages: ['design'], behavior: {challenge: 'balanced', revision: 'open', communication: 'concise'},
    authority: 'advisory', available: true};
}

/** @param {string[]} values @param {string} key @param {boolean} included @returns {string[]} Toggle one membership without duplicate values. */
export function membership(values, key, included) {
  return included ? [...new Set([...values, key])] : values.filter(value => value !== key);
}

/** @param {object} config @param {object} catalog @returns {object[]} Show declared coverage while leaving runtime resolution to the server. */
export function declaredCoverage(config, catalog) {
  return catalog.competencies.map(module => ({...module,
    omitted: config.omit_competencies.includes(module.id),
    actors: config.team.filter(actor => actor.available && actor.competencies.includes(module.id)).map(actor => actor.name),
  }));
}
