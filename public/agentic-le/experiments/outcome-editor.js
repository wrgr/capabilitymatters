/** Configure an explicitly illustrative synthetic world before observing its recorded results. */
import {el, field, select, button, check, disclosure, jsonBlock} from './dom.js';

/** @param {object} target @param {object[]} fields @param {Function} changed @returns {HTMLElement} Bind catalog-defined bounded numeric assumptions without changing their meaning. */
function numericFields(target, fields, changed) {
  const grid = el('div', 'two-columns');
  for (const item of fields || []) grid.append(field(item.label, target[item.id], value => { target[item.id] = value; changed(); },
    {type: 'number', min: item.minimum, max: item.maximum, step: item.step, help: item.description}));
  return grid;
}

/** @param {HTMLElement} root @param {object} config @param {object|null} catalog @param {Function} changed @returns {void} Expose synthetic cohort conditions separately from competency assignments. */
export function renderOutcomes(root, config, catalog, changed) {
  root.replaceChildren(el('h2', '', 'Synthetic outcome model'));
  if (!config.outcomes || !catalog) {
    root.append(el('p', 'muted', 'Apply a current study preset to add the illustrative outcome model. Existing journals retain their original settings.'));
    return;
  }
  const model = config.outcomes;
  root.append(el('p', 'muted small', 'An uncalibrated policy model applies declared Build design choices to a synthetic cohort. It does not verify the HTML implementation or measure actual people.'),
    check('Record synthetic outcome assessments', model.enabled, value => { model.enabled = value; changed(true); }));
  if (!model.enabled) return;
  const cohort = el('div', 'two-columns');
  cohort.append(field('Synthetic cohort size', model.cohort_size, value => { model.cohort_size = value; changed(); }, {type: 'number', min: 1, max: 10000, step: 1}),
    field('Synthetic random seed', model.seed, value => { model.seed = value; changed(); }, {type: 'number', min: 0, max: 4294967295, step: 1}));
  root.append(cohort, worldConditions(model, catalog, changed));
  for (const challenge of config.challenges.filter(item => Object.keys(item.simulation_effects || {}).length)) {
    const effects = Object.entries(challenge.simulation_effects).map(([key, value]) => `${catalog.fields.conditions.find(item => item.id === key)?.label || key}: ${value}`).join('; ');
    root.append(el('p', 'mode-note', `Scheduled override before ${challenge.stage}: ${effects}. Edit or remove this challenge’s numeric changes when comparing other worlds.`));
  }
  const criteria = disclosure('Success and failure thresholds');
  criteria.append(numericFields(model.criteria, catalog.fields?.criteria, changed));
  const assumptions = disclosure('Model assumptions and limitations');
  assumptions.append(numericFields(model.assumptions, catalog.fields?.assumptions, changed));
  for (const text of catalog.limitations || []) assumptions.append(el('p', 'muted small', text));
  const formulas = disclosure('Inspect the evaluation rules');
  formulas.append(jsonBlock(catalog.formulas || {})); assumptions.append(formulas);
  root.append(criteria, assumptions, el('p', 'fingerprint', `Outcome model: ${model.model_id} · ${catalog.version || ''}`));
}

/** @param {object} model @param {object} catalog @param {Function} changed @returns {HTMLElement} Apply named world conditions only after an explicit action. */
function worldConditions(model, catalog, changed) {
  const panel = disclosure('Synthetic world conditions', true);
  let presetId = catalog.presets?.find(item => Object.entries(item.conditions).every(([key, value]) => model.conditions[key] === value))?.id || '';
  const row = el('div', 'persona-controls');
  const description = el('p', 'muted small', catalog.presets?.find(item => item.id === presetId)?.description || 'Custom conditions are editable below.');
  const action = button('Apply world conditions', () => {
    const preset = catalog.presets.find(item => item.id === presetId);
    if (!preset) return;
    model.conditions = structuredClone(preset.conditions); changed(true);
  });
  action.disabled = !presetId;
  row.append(select('World condition preset', presetId, [['', 'Custom conditions'], ...(catalog.presets || []).map(item => [item.id, item.name])], value => {
    presetId = value; description.textContent = catalog.presets.find(item => item.id === value)?.description || 'Custom conditions are editable below.';
    action.disabled = !value;
  }), action);
  panel.append(row, description, numericFields(model.conditions, catalog.fields?.conditions, changed),
    el('p', 'muted small', 'Fixed challenges can override these conditions when they arrive. Configure those changes inside each challenge.'));
  return panel;
}

/** @param {object} challenge @param {object} catalog @param {Function} changed @returns {HTMLElement} Make numerical changes to the synthetic world explicit beside the fictional challenge. */
export function simulationEffects(challenge, catalog, changed) {
  const panel = disclosure('Synthetic world change');
  panel.append(el('p', 'muted small', 'Only checked numeric overrides affect the synthetic assessment. The written challenge remains a separate instruction to the agents.'));
  for (const item of catalog.fields?.conditions || []) {
    const active = Object.hasOwn(challenge.simulation_effects || {}, item.id);
    panel.append(check(`Override ${item.label.toLowerCase()}`, active, enabled => {
      challenge.simulation_effects ||= {};
      if (enabled) challenge.simulation_effects[item.id] = catalog.defaults.conditions[item.id];
      else delete challenge.simulation_effects[item.id];
      if (!Object.keys(challenge.simulation_effects).length) delete challenge.simulation_effects;
      changed(true);
    }));
    if (active) panel.append(field(item.label, challenge.simulation_effects[item.id], value => { challenge.simulation_effects[item.id] = value; changed(); },
      {type: 'number', min: item.minimum, max: item.maximum, step: item.step}));
  }
  return panel;
}
