/** Present recorded synthetic assessments without exposing future results or claiming observed human outcomes. */
import {el, button, disclosure, jsonBlock} from './dom.js';

const dimensions = {learner: 'Learner', human: 'Human', system: 'System'};
const labels = {
  cohort_size: 'Synthetic cohort', success_count: 'Simulated successes', sampled_success_fraction: 'Sampled success / full cohort',
  expected_success_fraction: 'Expected success / full cohort', conditional_success_probability: 'Assumed success among completers',
  effective_practice_minutes: 'Effective practice minutes', requested_practice_minutes: 'Requested practice minutes',
  effort_minutes_per_learner: 'Human effort minutes per learner', support_minutes_per_learner: 'Support minutes per learner',
  completion_count: 'Simulated completions', sampled_completion_fraction: 'Sampled completion / full cohort',
  expected_completion_fraction: 'Expected completion / full cohort', coverage_fraction: 'Modeled access coverage',
  support_capacity_fraction: 'Modeled support capacity', support_minutes_requested_total: 'Total requested support minutes',
};

/** @param {object[]} events @returns {object|null} Select only the most recent assessment in an already bounded replay prefix. */
export function latestAssessment(events) {
  return events.findLast(event => event.kind === 'outcome_assessment') || null;
}

/** @param {HTMLElement} root @param {object} state @param {Function} seek @returns {void} Render evidence-linked simulated outcomes reached by the playback controls. */
export function renderOutcomes(root, state, seek) {
  root.replaceChildren();
  const event = latestAssessment(state.events);
  const heading = el('div', 'section-heading');
  heading.append(el('h2', '', 'Synthetic outcome assessment'));
  root.append(heading);
  if (!event) {
    root.append(el('p', 'muted small', 'No outcome assessment is recorded at this replay position. Assessment cards appear only when their event is reached; older journals may have none.'));
    return;
  }
  const data = event.payload;
  const status = el('span', 'pill outcome-status', `Simulated ${data.status || 'indeterminate'}`);
  status.dataset.status = data.status || 'indeterminate'; heading.append(status);
  root.append(el('p', 'mode-note', data.input_origin === 'authored_fixture'
    ? 'Authored fixture input: demonstrates the synthetic policy model, not an observed competency effect. The equations do not use persona or ablation labels.'
    : 'Illustrative, uncalibrated policy model applied to the declared Build design. Actual implementation and human outcomes remain unverified.'));
  if (data.reason) root.append(el('p', 'small', data.reason));
  const cards = el('div', 'outcome-cards');
  for (const [key, title] of Object.entries(dimensions)) cards.append(dimensionCard(title, data.dimensions?.[key], seek));
  root.append(cards, button(`Inspect assessment event #${event.seq}`, () => seek(event.seq), 'text-action'));
  const source = disclosure('Design source, world conditions, and assumptions');
  source.append(el('p', 'muted small', 'The recorded declaration is the model input. This does not establish that the artifact implements it.'),
    jsonBlock({design_source: data.design_source, conditions: data.conditions, applied_challenge_effects: data.applied_challenge_effects,
      assumptions: data.assumptions, criteria: data.criteria, seed: data.seed, cohort_size: data.cohort_size}));
  const provenance = disclosure('Evaluator provenance and limitations');
  provenance.append(jsonBlock({evaluator: data.evaluator, model_hash: data.model_hash, parameter_hash: data.parameter_hash, sampler: data.sampler, formulas: data.formulas}));
  for (const text of data.limitations || []) provenance.append(el('p', 'muted small', text));
  root.append(source, provenance);
}

/** @param {string} title @param {object|undefined} dimension @param {Function} seek @returns {HTMLElement} Keep criterion, result, and evidence together for one outcome dimension. */
function dimensionCard(title, dimension, seek) {
  const card = el('section', 'outcome-card');
  card.dataset.status = dimension?.status || 'indeterminate';
  card.append(el('h3', '', title), el('p', 'outcome-label', dimension?.status || 'indeterminate'));
  if (!dimension) { card.append(el('p', 'muted small', 'No assessment recorded.')); return card; }
  if (dimension.reason) card.append(el('p', 'small', dimension.reason));
  const metrics = el('dl', 'outcome-metrics');
  for (const [key, value] of Object.entries(dimension.metrics || {})) {
    if (value && typeof value === 'object') continue;
    metrics.append(el('dt', '', labels[key] || key.replaceAll('_', ' ')), el('dd', '', formatMetric(key, value)));
  }
  card.append(metrics);
  const criterion = disclosure('Criterion and checks');
  criterion.append(jsonBlock({criteria: dimension.criteria, checks: dimension.metrics?.checks})); card.append(criterion);
  const evidence = el('div', 'evidence-links');
  for (const ref of dimension.evidence_refs || []) evidence.append(button(`Evidence #${ref.event_seq}`, () => seek(ref.event_seq), 'text-action'));
  card.append(evidence);
  return card;
}

/** @param {string} key @param {unknown} value @returns {string} Display fractions as percentages while preserving other recorded values. */
function formatMetric(key, value) {
  if (typeof value !== 'number') return String(value ?? 'Not recorded');
  return /fraction|probability/.test(key) ? `${(value * 100).toFixed(1)}%` : String(Math.round(value * 100) / 100);
}
