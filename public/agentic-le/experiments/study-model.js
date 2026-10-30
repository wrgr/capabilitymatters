/** Materialize study and persona presets identically in the static builder and local runner. */

/** @param {object} config @returns {boolean} Identify the single executing identity without confusing its reference schedule. */
export function isIndividual(config) {
  return config.participation?.mode === 'individual';
}

/** @param {object} config @param {object} baseline @returns {object} Explicitly upgrade a legacy configuration while retaining its original experiment choices. */
export function upgradeConfig(config, baseline) {
  const copy = structuredClone(config);
  if (copy.schema_version === 2) return copy;
  if (baseline.schema_version !== 2) throw new Error('Version 2 study presets require the current experiment catalog.');
  copy.schema_version = 2;
  for (const actor of copy.team) actor.persona_ref = null;
  copy.participation = structuredClone(baseline.participation);
  copy.participation.mode = 'team';
  copy.outcomes = structuredClone(baseline.outcomes);
  return copy;
}

/** @param {object} actor @param {object} persona @returns {void} Copy a named persona's instructions while retaining identity and contribution timing. */
export function applyPersona(actor, persona) {
  actor.competencies = [...persona.competencies];
  actor.behavior = {...persona.behavior};
  actor.persona_ref = {id: persona.id, version: persona.version};
}

/** @param {object} config @param {object} baseline @param {object} catalog @param {object} choice @returns {object} Apply an explicit study choice without losing the fictional case. */
export function applyStudyPreset(config, baseline, catalog, choice) {
  const copy = upgradeConfig(config, baseline);
  if (choice.mode === 'default') {
    for (const key of ['team', 'integration', 'omit_competencies', 'participation']) copy[key] = structuredClone(baseline[key]);
  } else if (choice.mode === 'ablation') {
    if (!catalog.competencies.some(item => item.id === choice.competency)) throw new Error('Choose a catalog competency to omit.');
    copy.participation.mode = 'team';
    copy.omit_competencies = [...new Set([...copy.omit_competencies, choice.competency])];
  } else if (choice.mode === 'individual') {
    const persona = catalog.personas?.find(item => item.id === choice.persona_id);
    if (!persona) throw new Error('Choose a named individual persona.');
    copy.participation.mode = 'individual';
    applyPersona(copy.participation.individual, persona);
  } else throw new Error('Unknown study preset.');
  return copy;
}

/** @param {object} comparison @param {number} repetitions @returns {number} Count planned fresh executions from an explicit comparison specification. */
export function comparisonCount(comparison, repetitions) {
  return (comparison.kind === 'configured' ? 1 : 2) * comparison.integration_modes.length * repetitions;
}

/** @param {object} config @returns {object[]} Identify actors that can actually execute requests in the selected participation mode. */
export function executingActors(config) {
  return isIndividual(config) ? [config.participation.individual] : config.team.filter(actor => actor.available);
}
