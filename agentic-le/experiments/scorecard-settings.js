/** Expose the assumptions behind conditional scorecard probabilities without presenting them as field estimates. */
import {el, field, disclosure} from './dom.js';

export const AXES = ['human_flourishing', 'system_performance', 'learning'];
export const AXIS_LABELS = {human_flourishing: 'Human flourishing', system_performance: 'System performance', learning: 'Learning'};
const CRITERION_LABELS = {agency_dignity: 'Agency and dignity', access_inclusion: 'Access and inclusion', burden_wellbeing: 'Burden and wellbeing',
  functional_correctness: 'Functional correctness', reliability_recovery: 'Reliability and recovery', feasibility: 'Feasibility',
  alignment: 'Capability alignment', practice_feedback: 'Practice feedback and revision', transfer_evidence: 'Learning evidence design'};

/** @returns {object} Provide the versioned illustrative defaults shared with the local assessment engine. */
export function defaultAssumptions() {
  return {schema_version: 1, seed: 2026, draws: 1000, cohort_size: 100, meaningful_difference: 5,
    thresholds: {human_flourishing: 60, system_performance: 60, learning: 60},
    criterion_floors: {agency_dignity: 2, access_inclusion: 2, burden_wellbeing: 2, functional_correctness: 2,
      reliability_recovery: 0, feasibility: 0, alignment: 2, practice_feedback: 2, transfer_evidence: 0},
    variability: {team_sd: {human_flourishing: 0, system_performance: 0, learning: 0},
      scenario_sd: {human_flourishing: 3, system_performance: 3, learning: 3}, shared_correlation: 0.5,
      person_sd_scale: 1, profile_shift_scale: 1},
    calibration: 'uncalibrated_illustrative'};
}

/** @param {object} value @returns {object} Reject invalid imported assumptions before they reach form controls or pinned reviews. */
export function validateAssumptions(value) {
  const expected = defaultAssumptions();
  const sameKeys = (actual, template) => actual && typeof actual === 'object' && !Array.isArray(actual)
    && Object.keys(actual).length === Object.keys(template).length && Object.keys(template).every(key => key in actual);
  const valid = (number, low, high, integer = false) => Number.isFinite(number) && number >= low && number <= high && (!integer || Number.isInteger(number));
  if (!sameKeys(value, expected) || value.schema_version !== 1 || value.calibration !== expected.calibration) throw new Error('Unsupported probability assumptions.');
  if (!valid(value.seed, 0, 4294967295, true) || !valid(value.draws, 100, 5000, true)
    || !valid(value.cohort_size, 1, 1000, true) || value.draws * value.cohort_size > 500000
    || !valid(value.meaningful_difference, 0, 100)) throw new Error('Probability sample sizes or meaningful-difference bounds are invalid.');
  if (!sameKeys(value.thresholds, expected.thresholds) || AXES.some(axis => !valid(value.thresholds[axis], 0, 100))) throw new Error('Three valid index thresholds are required.');
  if (!sameKeys(value.criterion_floors, expected.criterion_floors) || Object.values(value.criterion_floors).some(floor => !valid(floor, 0, 4))) throw new Error('Nine valid criterion floors are required.');
  if (!sameKeys(value.variability, expected.variability)) throw new Error('Variation settings differ from the model contract.');
  for (const group of ['scenario_sd', 'team_sd']) {
    if (!sameKeys(value.variability[group], expected.variability[group]) || AXES.some(axis => !valid(value.variability[group][axis], 0, 30))) throw new Error('Variation SDs must be between 0 and 30.');
  }
  for (const [key, max] of [['shared_correlation', 1], ['person_sd_scale', 3], ['profile_shift_scale', 2]]) {
    if (!valid(value.variability[key], 0, max)) throw new Error(`Invalid ${key} assumption.`);
  }
  return structuredClone(value);
}

/** @param {HTMLElement} root @param {object} settings @param {Function} changed @returns {void} Edit explicit probability assumptions with their interpretation beside the controls. */
export function renderAssumptions(root, settings, changed) {
  root.replaceChildren(el('h2', '', 'Probability assumptions'));
  root.append(el('p', 'muted small', 'Conditional rubric indices, on a 0–100 scale. These probabilities describe the supplied evidence and assumed population; they are not measured human outcomes. Freeze assumptions before revealing candidate identities.'));
  const thresholds = el('div', 'three-columns');
  for (const axis of AXES) thresholds.append(field(`${AXIS_LABELS[axis]} threshold`, settings.thresholds[axis], value => {
    settings.thresholds[axis] = value; changed();
  }, {type: 'number', min: 0, max: 100, step: 1}));
  root.append(thresholds, floorControls(settings, changed), samplingControls(settings, changed), variationControls(settings, changed));
}

/** @param {object} settings @param {Function} changed @returns {HTMLElement} Require essential criteria independently of favorable scores elsewhere on an axis. */
function floorControls(settings, changed) {
  const section = disclosure('Essential criterion floors');
  section.append(el('p', 'muted small', 'An axis passes only when its index threshold and every criterion floor are met. Strong performance elsewhere cannot compensate for a decisive failure. A floor of zero disables that criterion gate.'));
  const grid = el('div', 'three-columns');
  for (const [key, label] of Object.entries(CRITERION_LABELS)) grid.append(field(`${label} minimum`, settings.criterion_floors[key], value => {
    settings.criterion_floors[key] = value; changed();
  }, {type: 'number', min: 0, max: 4, step: 0.5}));
  section.append(grid);
  return section;
}

/** @param {object} settings @param {Function} changed @returns {HTMLElement} Keep Monte Carlo draw counts separate from independent evidence. */
function samplingControls(settings, changed) {
  const section = disclosure('Sampling and meaningful difference');
  const grid = el('div', 'two-columns');
  const options = [['seed', 'Random seed', 0, 4294967295], ['draws', 'Monte Carlo draws', 100, 5000],
    ['cohort_size', 'Simulated people per draw', 1, 1000], ['meaningful_difference', 'Meaningful difference (index points)', 0, 100]];
  for (const [key, label, min, max] of options) grid.append(field(label, settings[key], value => {
    settings[key] = value; changed();
  }, {type: 'number', min, max, step: 1}));
  section.append(grid, el('p', 'muted small', 'Use at most 500,000 simulated person draws per assessment. More simulated people or draws improve numerical precision. They do not add independent candidates, real participants, or evidence.'));
  return section;
}

/** @param {object} settings @param {Function} changed @returns {HTMLElement} Separate assumed residual variation from observed candidate differences. */
function variationControls(settings, changed) {
  const section = disclosure('Context and residual sensitivity assumptions');
  section.append(el('p', 'muted small', 'Scenario populations supply person variation and context offsets. Residual team SD defaults to zero; increasing it explores an assumed sensitivity and does not estimate team variance. Observe team differences across independently generated candidates.'));
  const person = el('div', 'two-columns');
  for (const [key, label, max] of [['person_sd_scale', 'Person spread multiplier', 3], ['profile_shift_scale', 'Population profile shift multiplier', 2]]) {
    person.append(field(label, settings.variability[key], value => { settings.variability[key] = value; changed(); },
      {type: 'number', min: 0, max, step: 0.1, help: 'Sensitivity multiplier for the scenario’s hypothetical population; not estimated from participants.'}));
  }
  section.append(person);
  for (const [key, title] of [['scenario_sd', 'Context SD'], ['team_sd', 'Assumed residual team SD']]) {
    const grid = el('div', 'three-columns');
    for (const axis of AXES) grid.append(field(`${AXIS_LABELS[axis]} · ${title}`, settings.variability[key][axis], value => {
      settings.variability[key][axis] = value; changed();
    }, {type: 'number', min: 0, max: 30, step: 0.5}));
    section.append(grid);
  }
  section.append(field('Shared correlation across outcome axes', settings.variability.shared_correlation, value => {
    settings.variability.shared_correlation = value; changed();
  }, {type: 'number', min: 0, max: 1, step: 0.05, help: 'This is an authored dependence assumption. It affects the probability that all three thresholds are met together.'}));
  return section;
}
