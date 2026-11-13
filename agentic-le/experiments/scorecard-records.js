/** Verify portable frozen scorecards before using their conditional outcomes in a comparison. */
import {digest} from '../replay/state.js';
import {AXES} from './scorecard-settings.js';
import {verifyBlindPacket} from './scorecard-model.js';

/** @param {object} record @returns {Promise<object>} Require hash-bound review, settings, and assessment with no incomplete numeric substitute. */
export async function verifyFrozen(record) {
  const keys = ['schema_version', 'id', 'packet_id', 'packet_hash', 'review_hash', 'settings_hash', 'packet', 'review', 'settings', 'assessment', 'locked_before_unblinding', 'record_hash'];
  if (record?.schema_version !== 1 || record.locked_before_unblinding !== true || !/^scorecard-[a-zA-Z0-9_-]+$/.test(record.id || '')) throw new Error('Choose a frozen scorecard record.');
  if (Object.keys(record).some(key => !keys.includes(key)) || keys.some(key => !(key in record))) throw new Error('Frozen scorecard fields do not match the contract.');
  const {record_hash, ...body} = record;
  if (await digest(body) !== record_hash || await digest(record.review) !== record.review_hash || await digest(record.settings) !== record.settings_hash) throw new Error('Frozen scorecard, review, or settings hash differs.');
  const packet = await verifyBlindPacket(record.packet);
  if (packet.id !== record.packet_id || packet.packet_hash !== record.packet_hash) throw new Error('Retained packet differs from the frozen evidence identity.');
  if (record.assessment.human_outcomes_observed !== false || record.assessment.independent_empirical_sample_size !== 0
    || record.assessment.calibration !== 'uncalibrated_illustrative') throw new Error('This model cannot certify observed human outcomes.');
  if (record.assessment.modeled_draws !== record.settings.draws || record.assessment.modeled_cohort_size !== record.settings.cohort_size) throw new Error('Assessment sample sizes differ from pinned settings.');
  for (const key of ['packet_id', 'packet_hash', 'review_hash', 'settings_hash']) {
    if (record.assessment[key] !== record[key]) throw new Error('Frozen assessment provenance differs.');
  }
  if (record.review.packet_id !== record.packet_id || record.review.packet_hash !== record.packet_hash) throw new Error('Review belongs to different packet evidence.');
  if (record.assessment.status === 'incomplete') {
    if (['axes', 'joint', 'samples'].some(key => record.assessment[key] !== null)) throw new Error('Incomplete evidence cannot contain outcome probabilities.');
  } else if (record.assessment.status === 'complete') validateDistributions(record);
  else throw new Error('Unknown assessment completeness.');
  return structuredClone(record);
}

/** @param {object} record @returns {void} Check modeled distributions against their retained draws and pinned thresholds. */
function validateDistributions(record) {
  const {assessment, settings} = record;
  for (const axis of AXES) {
    const row = assessment.axes?.[axis], values = assessment.samples?.axes?.[axis], gates = assessment.samples?.gates?.[axis];
    if (!row || !Array.isArray(values) || values.length !== settings.draws || !Array.isArray(gates) || gates.length !== settings.draws) throw new Error('Conditional draw counts differ from pinned settings.');
    if (!values.every(value => Number.isFinite(value) && value >= 0 && value <= 100) || !gates.every(value => typeof value === 'boolean')) throw new Error('Invalid retained scorecard draws.');
    const sorted = [...values].sort((a, b) => a - b);
    const summary = {mean: values.reduce((sum, value) => sum + value, 0) / values.length,
      q05: quantile(sorted, 0.05), q50: quantile(sorted, 0.5), q95: quantile(sorted, 0.95),
      p_meets_threshold: values.filter((value, index) => gates[index] && value >= settings.thresholds[axis]).length / values.length};
    if (Object.entries(summary).some(([key, value]) => !Number.isFinite(row[key]) || Math.abs(row[key] - value) > 0.000002)) throw new Error('Frozen summary differs from its retained conditional draws.');
    if (row.threshold !== settings.thresholds[axis]) throw new Error('Frozen threshold differs from its pinned settings.');
  }
  const joint = assessment.samples.joint;
  if (!Array.isArray(joint) || joint.length !== settings.draws || !joint.every(value => typeof value === 'boolean')
    || !Number.isFinite(assessment.joint.p_all_axes) || Math.abs(assessment.joint.p_all_axes - joint.filter(Boolean).length / joint.length) > 0.000002) throw new Error('Joint probability differs from retained draws.');
}

/** @param {number[]} sorted @param {number} probability @returns {number} Read the same linearly interpolated quantile as the assessment engine. */
function quantile(sorted, probability) {
  const index = probability * (sorted.length - 1), lower = Math.floor(index), upper = Math.min(lower + 1, sorted.length - 1);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/** @param {unknown} value @returns {Promise<object[]>} Import one record or an explicitly labeled frozen-scorecard bundle. */
export async function importFrozen(value) {
  if (value?.kind === 'frozen_scorecard_bundle') {
    if (value.schema_version !== 1 || !Array.isArray(value.records) || !value.records.length
      || Object.keys(value).some(key => !['schema_version', 'kind', 'records'].includes(key))) throw new Error('Invalid frozen scorecard bundle.');
    const records = await Promise.all(value.records.map(verifyFrozen));
    if (new Set(records.map(record => record.packet_id)).size !== records.length) throw new Error('Use one frozen review for each packet in a reveal set.');
    return records;
  }
  return [await verifyFrozen(value)];
}
