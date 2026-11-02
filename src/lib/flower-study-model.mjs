/** Validate frozen publication inputs and expose existing indices without recalculating ratings. */
export const STUDY_TITLE = 'Exploring the learning engineering flower with agentic simulation';
export const AXES = [
  ['human_flourishing', 'Human flourishing support'],
  ['system_performance', 'System performance'],
  ['learning', 'Learning'],
];
export const CONDITIONS = [
  ['full-team-explicit', 'Full team', 'All eight domains; reference contribution schedule.'],
  ['domain-omitted-explicit', 'Domain omitted everywhere', 'Assessment instructions omitted across the team; all contribution slots retained.'],
  ['domain-withdrawn-explicit', 'Domain withdrawn from one member', 'Assessment instructions withdrawn from the primary member; a colleague retains the domain.'],
  ['member-removed-explicit', 'Member removed', 'Primary assessment member removed, reducing the schedule from forty to thirty-six calls.'],
  ['individual-explicit', 'One agent with matched slots', 'One identity works through the reference contribution slots and their assigned duties.'],
];
export const CHECKS = [
  ['F1', 'Initial practice and feedback'], ['F2', 'Revision and feedback'],
  ['F3', 'Changed situation'], ['F4', 'Skip'], ['F5', 'Clear or reset'],
];
const conditionKeys = new Set(CONDITIONS.map(([key]) => key));
const hashPattern = /^[a-f0-9]{64}$/;
/** Format a known index while keeping missing values explicit.
 * @param {number|null|undefined} value
 * @returns {string}
 */
export const number = value => Number.isFinite(value) ? value.toFixed(1) : 'Unknown';
/** Resolve the fixed display label for a condition.
 * @param {string} key
 * @returns {string}
 */
export const label = key => CONDITIONS.find(([id]) => id === key)?.[1] ?? key;
/** Describe the recorded evaluation source without implying a repaired original.
 * @param {string|undefined} key
 * @returns {string}
 */
export const recordLabel = key => ({
  original_primary_snapshot: 'Original primary journal snapshot',
  primary_snapshot_exact_bytes: 'Exact byte copy of the completed primary journal',
  complete_jsonl_extension: 'Separately documented view of the complete recorded event-log extension',
}[key] ?? 'Record origin unavailable');

function uniqueBy(rows, key, name) {
  const result = new Map();
  for (const row of rows) {
    if (!row?.[key] || result.has(row[key])) throw new Error(`Duplicate or missing ${name} ${key}.`);
    result.set(row[key], row);
  }
  return result;
}

function validateIndices(candidate) {
  for (const [axis] of AXES) {
    const values = candidate.axes?.[axis];
    if (!values || values.reviewer_indices?.length !== 2) throw new Error('Missing paired axis indices.');
    for (const value of [values.mean_index, ...values.reviewer_indices]) {
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
        throw new Error('A rubric index must be known within 0–100 or explicitly null.');
      }
    }
    const anyUnknown = values.reviewer_indices.includes(null);
    if ((values.mean_index === null) !== anyUnknown) throw new Error('Axis missingness differs from its reviewer pair.');
  }
}

function validateBinding(candidate, review) {
  if (!candidate.build) {
    if (review) throw new Error('A reviewed candidate is missing its retained Build.');
    return;
  }
  const build = candidate.build;
  if (!['original_primary_snapshot','primary_snapshot_exact_bytes','complete_jsonl_extension'].includes(build.journal_view?.record_origin)) {
    throw new Error('A retained Build requires explicit original or derived record provenance.');
  }
  if (!/^builds\/[a-z0-9-]+\.txt$/.test(build.file) || !hashPattern.test(build.sha256)) {
    throw new Error('A prototype must reference an exact plain-text source in the study directory.');
  }
  if (review && (review.source_sha256 !== build.sha256 || review.artifact_hash !== build.content_hash ||
      review.run_head_hash !== build.run_head_hash || review.run_id !== candidate.run_id ||
      review.condition !== candidate.condition || review.replicate !== candidate.replicate)) {
    throw new Error('The review and published prototype do not identify the same retained evidence.');
  }
  if (review) validateIndices(review);
}

/** Fail closed on mixed strata, missing planned rows, duplicate data, or conflicting provenance.
 * @param {Record<string, any>} results
 * @param {Record<string, any>} index
 * @returns {{conditions: object[], reviews: Map<string, object>, excluded: Map<string, object>, repetitions: number[], buildCount: number}}
 */
export function studyView(results, index) {
  if (results.schema_version !== 1 || results.status !== 'reviewed_and_revealed') {
    throw new Error('Final publication requires the frozen revealed review summary.');
  }
  if (results.simulated_probabilities !== false || results.human_outcomes_observed !== false) {
    throw new Error('The page contract covers descriptive rubric indices without human outcomes.');
  }
  if (index.schema_version !== 1 || index.kind !== 'flower_study_publication_index' ||
      index.results_summary_hash !== results.summary_hash || index.planned_candidates !== results.planned_candidates ||
      index.candidates.length !== index.planned_candidates) throw new Error('Publication index does not bind to the complete plan.');
  const reviews = uniqueBy(results.candidates, 'item_id', 'reviewed candidate');
  const planned = uniqueBy(index.candidates, 'item_id', 'planned candidate');
  const excluded = uniqueBy(results.excluded_candidates, 'item_id', 'excluded candidate');
  if ([...reviews.keys(), ...excluded.keys()].some(key => !planned.has(key))) throw new Error('Unexpected candidate in review summary.');
  const strata = new Set(results.candidates.map(row => JSON.stringify(row.stratum)));
  if (strata.size > 1) throw new Error('Multiple evidence strata require separate tables; publication is blocked.');
  const groups = uniqueBy(results.condition_groups, 'condition', 'condition group');
  for (const candidate of index.candidates) {
    if (!conditionKeys.has(candidate.condition)) throw new Error('Unexpected condition in fixed five-condition plan.');
    if (!reviews.has(candidate.item_id) && !excluded.has(candidate.item_id)) throw new Error('A planned candidate has no review or explicit exclusion.');
    if (reviews.has(candidate.item_id) && excluded.has(candidate.item_id)) throw new Error('A candidate cannot be both reviewed and excluded.');
    const eligibility = reviews.has(candidate.item_id) ? 'included' : 'excluded';
    if (candidate.review_eligibility !== eligibility) throw new Error('Candidate eligibility differs from the frozen review selection.');
    if (eligibility === 'excluded') {
      if (candidate.build) throw new Error('An excluded candidate cannot expose an evaluated Build preview.');
      const reason = excluded.get(candidate.item_id);
      if (candidate.exclusion && (candidate.exclusion.reason !== reason.reason ||
          candidate.evaluation_status !== reason.evaluation_status || candidate.status !== reason.run_status)) {
        throw new Error('An exclusion changes the recorded reason or generation status.');
      }
    }
    validateBinding(candidate, reviews.get(candidate.item_id));
  }
  const conditions = CONDITIONS.map(([key, name, description]) => ({
    key, name, description, group: groups.get(key),
    candidates: index.candidates.filter(row => row.condition === key).sort((a, b) => a.replicate - b.replicate),
  }));
  for (const row of conditions) {
    if ((row.group?.candidate_count ?? 0) !== row.candidates.filter(item => reviews.has(item.item_id)).length) {
      throw new Error('Group denominator differs from the reviewed candidate set.');
    }
  }
  return {conditions, reviews, excluded, repetitions: [...new Set(index.candidates.map(row => row.replicate))].sort(),
    buildCount: index.candidates.filter(row => row.build).length};
}
