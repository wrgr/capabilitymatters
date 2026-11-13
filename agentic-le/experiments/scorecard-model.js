/** Validate opaque assessment packets and evidence-linked reviews before rendering them in the blind workspace. */
import {digest} from '../replay/state.js';
import {AXES, validateAssumptions} from './scorecard-settings.js';

const CRITERIA = ['agency_dignity', 'access_inclusion', 'burden_wellbeing', 'functional_correctness',
  'reliability_recovery', 'feasibility', 'alignment', 'practice_feedback', 'transfer_evidence'];
const PACKET_KEYS = ['schema_version', 'id', 'task', 'scenario', 'rubric', 'evidence', 'blinding', 'packet_hash'];

/** @param {object} value @param {string[]} keys @param {string} label @returns {void} Refuse unexpected metadata instead of silently displaying potentially unblinded records. */
function allowKeys(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${label}.`);
  if (Object.keys(value).some(key => !keys.includes(key))) throw new Error(`${label} contains unexpected fields. Import an opaque assessment packet, not a journal or private mapping.`);
}

/** @param {string} value @returns {Promise<string>} Hash evidence text as UTF-8 without JSON quoting. */
async function textHash(value) {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** @param {object} packet @returns {Promise<object>} Verify the strict public packet boundary and its cryptographic content binding. */
export async function verifyBlindPacket(packet) {
  allowKeys(packet, packet?.schema_version === 2 ? [...PACKET_KEYS, 'evaluation_scope'] : PACKET_KEYS, 'Packet');
  if (![1, 2].includes(packet.schema_version) || !/^candidate-[a-f0-9]{8,64}$/.test(packet.id || '')) throw new Error('An opaque candidate identifier is required.');
  if (packet.schema_version === 2 && packet.evaluation_scope !== 'full_solution') throw new Error('Version 2 requires the full-solution evaluation scope.');
  const kinds = packet.schema_version === 2 ? ['observation', 'generated_plan'] : ['observation'];
  allowKeys(packet.task, ['title', 'brief', 'constraints'], 'Task');
  allowKeys(packet.scenario, ['id', 'version', 'axis_targets', 'evidence_anchors', 'population_profiles'], 'Scenario');
  allowKeys(packet.rubric, ['id', 'version', 'axes', 'criteria', 'anchors', 'unknown', 'aggregation', 'scope'], 'Rubric');
  allowKeys(packet.blinding, ['assignment_metadata_withheld', 'content_disclosure_possible'], 'Blinding declaration');
  if (packet.blinding.assignment_metadata_withheld !== true || packet.blinding.content_disclosure_possible !== true) throw new Error('This packet must declare withheld assignment metadata and possible disclosure from artifact content.');
  if (typeof packet.task.title !== 'string' || typeof packet.task.brief !== 'string' || !Array.isArray(packet.task.constraints)) throw new Error('Task text and constraints are required.');
  if (!Array.isArray(packet.evidence) || !packet.evidence.length) throw new Error('The packet has no assessable evidence.');
  if (packet.evidence.length > (packet.schema_version === 2 ? 39 : 31)) throw new Error('Packet evidence exceeds its versioned limit.');
  const plans = packet.evidence.filter(item => item.kind === 'generated_plan').length;
  if (packet.schema_version === 2 && (plans < 1 || plans > 8)) throw new Error('Full-solution evidence requires one to eight generated stage records.');
  if (packet.evidence[0].kind !== 'artifact' || packet.evidence.slice(1).some(item => !kinds.includes(item.kind))) throw new Error('Evidence requires the executable Build first, followed by scope-appropriate observations or generated plans.');
  if (!AXES.every(axis => packet.rubric.axes?.[axis]) || !CRITERIA.every(key => packet.rubric.criteria?.[key])) throw new Error('The three-axis, nine-criterion rubric is required.');
  for (const item of packet.evidence) {
    allowKeys(item, ['id', 'kind', 'text', 'sha256'], 'Evidence');
    if (!['artifact', ...kinds].includes(item.kind) || typeof item.id !== 'string' || typeof item.text !== 'string') throw new Error('Invalid evidence item.');
    if (await textHash(item.text) !== item.sha256) throw new Error(`Evidence hash differs: ${item.id}.`);
  }
  if (new Set(packet.evidence.map(item => item.id)).size !== packet.evidence.length) throw new Error('Evidence identifiers must be unique.');
  const {packet_hash, ...body} = packet;
  if (await digest(body) !== packet_hash) throw new Error('Packet content hash differs.');
  return structuredClone(packet);
}

/** @param {unknown} value @returns {Promise<object[]>} Accept a packet or a public-only bundle while rejecting any private key. */
export async function importBlindPackets(value) {
  if (value?.kind === 'blind_packet_bundle') {
    allowKeys(value, ['schema_version', 'kind', 'packets', 'settings', 'settings_hash'], 'Packet bundle');
    if (value.schema_version !== 1 || !Array.isArray(value.packets) || !value.packets.length) throw new Error('The packet bundle is empty or unsupported.');
    const packets = await Promise.all(value.packets.map(verifyBlindPacket));
    if (new Set(packets.map(packet => packet.id)).size !== packets.length) throw new Error('Candidate identifiers must be unique.');
    return packets;
  }
  return [await verifyBlindPacket(value)];
}

/** @param {object} value @returns {Promise<object>} Retain prospectively pinned assumptions alongside opaque packets, without admitting a private mapping. */
export async function importBlindSet(value) {
  const packets = await importBlindPackets(value);
  if (value.kind !== 'blind_packet_bundle' || (!value.settings && !value.settings_hash)) return {packets, settings: null};
  const settings = validateAssumptions(value.settings);
  if (await digest(settings) !== value.settings_hash) throw new Error('Pinned probability assumptions hash differs.');
  return {packets, settings};
}

/** @param {object} packet @returns {Promise<object>} Create an empty, hash-bound review without converting missing evidence into a zero. */
export async function emptyReview(packet) {
  const ratings = Object.fromEntries(CRITERIA.map(key => [key, {score: null, lower: null, upper: null, rationale: '', evidence_refs: []}]));
  return {schema_version: 1, packet_id: packet.id, packet_hash: packet.packet_hash,
    rubric_hash: await digest(packet.rubric), status: 'unscored', reviewer: {id: '', kind: 'human', model: ''}, ratings, limitations: [], reviewed_at: ''};
}

/** @param {object} packet @param {object} review @returns {string[]} Explain missing or inconsistent ratings without making outcome claims. */
export function reviewProblems(packet, review) {
  const problems = [];
  if (review.packet_id !== packet.id || review.packet_hash !== packet.packet_hash) problems.push('Review belongs to a different packet.');
  if (!review.reviewer?.id?.trim()) problems.push('Enter a reviewer identifier.');
  if (!['human', 'model'].includes(review.reviewer?.kind)) problems.push('Choose the reviewer kind.');
  if (review.reviewer?.kind === 'model' && !review.reviewer.model?.trim()) problems.push('Identify the reviewing model.');
  for (const key of CRITERIA) problems.push(...criterionProblems(packet, key, review.ratings?.[key]));
  return problems;
}

/** @param {object} packet @param {string} key @param {object} rating @returns {string[]} Validate uncertainty bounds and exact evidence quotations for one criterion. */
function criterionProblems(packet, key, rating) {
  const label = packet.rubric.criteria[key].label;
  if (!rating || [rating.score, rating.lower, rating.upper].some(value => value === null || value === undefined)) return [`${label}: unknown; provide a rating and bounds when evidence permits.`];
  if (![rating.score, rating.lower, rating.upper].every(value => Number.isFinite(value) && value >= 0 && value <= 4)
    || rating.lower > rating.score || rating.score > rating.upper) return [`${label}: bounds must contain the rating on the 0–4 scale.`];
  const problems = [];
  if (!rating.rationale?.trim()) problems.push(`${label}: explain the rating.`);
  if (!rating.evidence_refs?.length) problems.push(`${label}: cite supplied evidence.`);
  for (const reference of rating.evidence_refs || []) {
    const source = packet.evidence.find(item => item.id === reference.evidence_id);
    if (!source || !reference.quote?.trim() || reference.quote.length > 500 || !source.text.includes(reference.quote) || !reference.locator?.trim()) problems.push(`${label}: cite an exact evidence quote (up to 500 characters) and its location.`);
  }
  return problems;
}

/** @param {object[]} records @returns {object[]} Keep scenario, evaluation scope, and rubric versions separate when grouping frozen records. */
export function scenarioGroups(records) {
  const groups = new Map();
  for (const record of records) {
    const scenario = record.assessment?.scenario?.id || record.scenario?.id || record.scenario_id || record.packet?.scenario?.id || 'unspecified';
    const scope = record.packet?.evaluation_scope || record.evaluation_scope || record.assessment?.evaluation_scope || 'artifact';
    const rubric = record.packet?.rubric || record.rubric;
    const id = `${scenario} · ${scope === 'full_solution' ? 'Full solution' : 'Historical artifact'}${rubric ? ` · ${rubric.id} ${rubric.version}` : ''}`;
    if (!groups.has(id)) groups.set(id, {id, records: []});
    groups.get(id).records.push(record);
  }
  return [...groups.values()];
}
