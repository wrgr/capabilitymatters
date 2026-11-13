/** Verify imported record fingerprints and derive replay state from explicit addressed events. */
import {validateConfig, PHASES} from './config-model.js';
const require = (condition, message) => { if (!condition) throw new Error(message); };
const messages = events => events.filter(event => event.kind === 'message');
const baselineSourceSet = 'b8e2f825ce34398aa6bf8d229eca7c7a202a0f8827e6d4e4761b5efebd9ef075';
const adaptedSources = new Set(['dynamic_prompts.py', 'dynamic_runtime.py', 'dynamic_records.py', 'dynamic_journal.py', 'dynamic_contract.py']);
const v1PeerSourceSet = '65feef814dbd90aaf4a1561a1bac2f93b3f5a6e72d222c0e28f6315858673d1f';

function compareKeys(left, right) {
  const a = [...left].map(char => char.codePointAt(0)), b = [...right].map(char => char.codePointAt(0));
  for (let index = 0; index < Math.min(a.length, b.length); index++) if (a[index] !== b[index]) return a[index] - b[index];
  return a.length - b.length;
}

/** @param {unknown} value @returns {string} Serialize the integer-only wire format using Python-compatible sorted keys. */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort(compareKeys).map(key => `${canonical(key)}:${canonical(value[key])}`).join(',')}}`;
  if (typeof value === 'number') require(Number.isSafeInteger(value), 'Dynamic records require safe integer numeric values.');
  if (typeof value === 'string') require(![...value].some(char => char.codePointAt(0) >= 0xd800 && char.codePointAt(0) <= 0xdfff), 'Unpaired Unicode surrogate in record.');
  require(value === null || ['string', 'number', 'boolean'].includes(typeof value), 'Record contains a non-JSON value.');
  return JSON.stringify(value);
}

/** @param {string} value @returns {Promise<string>} Fingerprint exact UTF-8 source bytes in the browser. */
export async function textHash(value) {
  const bytes = new TextEncoder().encode(value), digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/** @param {unknown} value @returns {Promise<string>} Fingerprint canonical run or configuration content. */
export const contentHash = value => textHash(canonical(value));

function checkMessage(event, actors, prior) {
  const value = event.payload?.response, actor = actors.get(event.actor);
  require(actor && actor.kind !== 'evaluator' && value && typeof value.content === 'string', `Invalid message at event ${event.seq}.`);
  require(event.payload.message_id === `m${String(event.seq).padStart(5, '0')}`, 'Message ID differs from its event.');
  for (const key of ['to', 'reply_to', 'domains']) require(Array.isArray(value[key]) && value[key].every(item => typeof item === 'string'), `Invalid message ${key}.`);
  require(value.to.length > 0 && value.to.every(id => actors.has(id) && id !== event.actor && actors.get(id).kind !== 'evaluator'), 'Message has an invalid addressee.');
  require(value.domains.every(id => actor.domains.includes(id)), 'Message claims expertise outside the actor’s assignments.');
  require(value.reply_to.every(id => prior.has(id)), 'Message references an unavailable earlier message.');
  if (value.kind === 'approval') require(actor.kind === 'specialist' && value.domains.length, 'Only an assigned specialist can approve its domains.');
  if (value.kind === 'resolve') require(prior.get(value.issue_id)?.actor === event.actor && prior.get(value.issue_id)?.payload.response.kind === 'objection' && value.reply_to.includes(value.issue_id), 'An objection can only be withdrawn by its author.');
}

async function checkArtifact(event, prior, previousVersion) {
  const value = event.payload, source = prior.get(value.message_id), artifact = source?.payload.response.artifact;
  require(value.version === previousVersion + 1 && source?.actor === event.actor && typeof artifact?.html === 'string', 'Artifact lacks a sequential implementing source.');
  require(await textHash(artifact.html) === value.sha256 && artifact.parent_version === value.parent_version, 'Artifact source or parent differs from the retained binding.');
}

function checkEvaluation(event) {
  const value = event.payload;
  require(['process', 'result'].includes(value.scope) && Array.isArray(value.scores), 'Invalid expert evaluation.');
  for (const row of value.scores) {
    require(typeof row.dimension_id === 'string' && (row.score === null || Number.isInteger(row.score) && row.score >= 0 && row.score <= 4), 'An expert criterion must be an integer 0–4 or unknown.');
    require(typeof row.rationale === 'string' && Array.isArray(row.evidence_refs), 'An expert criterion needs its rationale and evidence references.');
    for (const ref of row.evidence_refs) require(['event', 'html', 'rendered'].includes(ref.source) && typeof ref.id === 'string' && typeof ref.quote === 'string', 'Invalid evaluator evidence reference.');
  }
}

async function checkObservation(run, event) {
  const value = event.payload.evidence, frozen = run.events.find(item => item.seq < event.seq && item.kind === 'frozen' && item.payload.artifact_version === value?.artifact_version);
  const scenario = run.config.scenarios.find(item => item.id === value?.scenario_id);
  require(value?.schema_version === 'dynamic-flower-observation-1' && value.run_id === run.id, 'Observation belongs to another record or contract.');
  require(frozen && frozen.payload.artifact_sha256 === value.artifact_sha256, 'Observation is not bound to a prior frozen artifact.');
  require(scenario && await contentHash(scenario) === value.scenario_sha256 && await contentHash(value) === event.payload.evidence_sha256, 'Observation evidence or scenario fingerprint differs.');
  require(['browser_observation', 'fixture'].includes(value.evidence_kind) && (run.mode === 'fixture' || value.evidence_kind !== 'fixture'), 'Observation origin conflicts with the execution mode.');
  require(['observed', 'failed', 'unavailable'].includes(value.status), 'Invalid observation status.');
  for (const field of ['actions', 'checks', 'runtime_errors', 'network_requests', 'limitations']) require(Array.isArray(value[field]), `Observation is missing ${field}.`);
  for (const action of value.actions) require(typeof action.id === 'string' && ['observed', 'failed', 'unavailable'].includes(action.status), 'Invalid observed action.');
  for (const check of value.checks) require(typeof check.id === 'string' && ['pass', 'fail', 'unavailable'].includes(check.status), 'Invalid declared check observation.');
}

async function checkAmendment(run, event) {
  if (event.payload.schema_version === 'dynamic-flower-context-amendment-2') return checkDesignAmendment(run, event);
  const value = event.payload, prefix = run.events.filter(item => item.seq < event.seq);
  require(value.schema_version === 'dynamic-flower-context-amendment-1' && event.actor === 'user' && event.phase === 'deploy_test', 'Invalid context-amendment authority or version.');
  require(prefix.some(item => item.kind === 'frozen') && !prefix.some(item => item.kind === 'runtime_amendment'), 'Context amendment requires a frozen, previously unamended record.');
  require(!prefix.some(item => item.kind === 'request' && item.payload.purpose === 'evaluation'), 'The common method amendment must precede expert review.');
  const ended = new Set(prefix.filter(item => ['message', 'evaluation', 'turn_failed'].includes(item.kind)).map(item => item.payload.request_seq));
  require(prefix.filter(item => item.kind === 'request').every(item => ended.has(item.seq)), 'Cannot amend an unanswered request.');
  require(value.old_context_limit === run.config.budgets.max_context_chars && value.old_context_limit === 180000 && value.new_context_limit === 600000, 'Unexpected context-limit change.');
  require(value.config_sha256 === run.config_sha256 && value.original_event_count === prefix.length && value.original_head === prefix.at(-1).hash, 'The amendment does not extend the original pinned prefix.');
  require(canonical(value.old_runtime_sources) === canonical(run.runtime_sources) && await contentHash(value.old_runtime_sources) === baselineSourceSet, 'Original runtime identity differs from the declared baseline.');
  const oldNames = Object.keys(value.old_runtime_sources).sort(), newNames = Object.keys(value.new_runtime_sources).sort();
  require(canonical(newNames) === canonical([...oldNames, 'dynamic_amendment.py'].sort()), 'Unexpected runtime source added or removed.');
  require(oldNames.every(name => adaptedSources.has(name) || value.new_runtime_sources[name] === value.old_runtime_sources[name]), 'Amendment changes a protected runtime contract.');
  require(Object.values(value.new_runtime_sources).every(hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash)) && await contentHash(value.new_runtime_sources) === value.new_source_set_sha256, 'Amended runtime fingerprint mismatch.');
  require(value.scope === 'context_character_allowance_only' && value.archive === 'runtime-amendments/context-600000', 'Unexpected amendment scope or archive.');
  require(typeof value.reason === 'string' && value.reason.trim() && typeof value.amendment_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/.test(value.amendment_id), 'A context amendment needs its declared reason and identity.');
  require(typeof value.original_run_sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.original_run_sha256), 'Missing preserved original-run fingerprint.');
}

async function checkDesignAmendment(run, event) {
  const value = event.payload, prefix = run.events.filter(item => item.seq < event.seq), refusal = prefix.at(-1);
  require(event.actor === 'user' && event.phase === 'design_develop' && value.continuation_phase === 'design_develop', 'V2 requires a design-phase continuation.');
  require(prefix.some(item => item.kind === 'artifact') && !prefix.some(item => ['frozen', 'runtime_amendment'].includes(item.kind)), 'V2 requires an accepted, not-yet-frozen candidate under its original runtime.');
  require(!prefix.some(item => item.kind === 'request' && item.payload.purpose === 'evaluation'), 'V2 must precede expert review.');
  const ended = new Set(prefix.filter(item => ['message', 'evaluation', 'turn_failed'].includes(item.kind)).map(item => item.payload.request_seq));
  require(prefix.filter(item => item.kind === 'request').every(item => ended.has(item.seq)), 'Cannot amend an unanswered request.');
  require(value.old_context_limit === run.config.budgets.max_context_chars && value.old_context_limit === 180000 && value.new_context_limit === 600000, 'Unexpected V2 context-limit change.');
  require(value.config_sha256 === run.config_sha256 && value.original_event_count === prefix.length && value.original_head === refusal.hash, 'V2 does not extend its preserved original prefix.');
  require(canonical(value.old_runtime_sources) === canonical(run.runtime_sources) && await contentHash(value.old_runtime_sources) === baselineSourceSet, 'V2 original runtime identity mismatch.');
  const oldNames = Object.keys(value.old_runtime_sources).sort(), newNames = Object.keys(value.new_runtime_sources).sort();
  require(canonical(newNames) === canonical([...oldNames, 'dynamic_amendment.py'].sort()), 'Unexpected V2 runtime source set.');
  const peers = Object.fromEntries(Object.entries(value.new_runtime_sources).filter(([name]) => name !== 'dynamic_amendment.py'));
  require(await contentHash(peers) === v1PeerSourceSet && await contentHash(value.new_runtime_sources) === value.new_source_set_sha256, 'V2 may change only the amendment module relative to the v1 runtime.');
  require(Object.values(value.new_runtime_sources).every(hash => typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash)), 'Invalid V2 source fingerprint.');
  require(value.scope === 'context_character_allowance_only' && value.archive === 'runtime-amendments/context-600000-design-v2', 'Unexpected V2 scope/archive.');
  require(typeof value.reason === 'string' && value.reason.trim() && typeof value.amendment_id === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.-]{0,100}$/.test(value.amendment_id), 'Missing V2 amendment identity/reason.');
  require(typeof value.original_run_sha256 === 'string' && /^[a-f0-9]{64}$/.test(value.original_run_sha256), 'Missing preserved V2 original-run fingerprint.');
  const matched = /^context_limit: full prompt needs ([0-9]+) characters; no transcript was truncated$/.exec(refusal.payload?.reason ?? '');
  require(refusal.kind === 'stopped' && refusal.payload.complete === false && matched, 'V2 needs a retained latest context refusal.');
  const ref = value.refusal;
  require(ref.seq === refusal.seq && ref.hash === refusal.hash && ref.reason === refusal.payload.reason && ref.prompt_characters === Number(matched[1]) && ref.prompt_characters > 180000 && ref.prompt_characters <= 600000, 'V2 refusal identity or size differs.');
  require(typeof ref.prompt_sha256 === 'string' && /^[a-f0-9]{64}$/.test(ref.prompt_sha256) && run.config.agents.some(actor => actor.id === ref.actor) && typeof ref.scheduler_reason === 'string', 'Missing refused full-prompt identity.');
  const marker = run.events[event.seq], expected = {reason: 'awaiting_next_turn_after_context_amendment', complete: false, amendment_seq: event.seq, amendment_hash: event.hash, retained_refusal_seq: ref.seq, note: 'Paused awaiting the next addressed turn after the context amendment. No model or test result was created.'};
  require(marker?.seq === event.seq + 1 && marker.kind === 'stopped' && marker.actor === 'system' && marker.phase === 'design_develop' && canonical(marker.payload) === canonical(expected), 'Missing bound pause awaiting the next addressed turn.');
}

/** @param {object} run @returns {Promise<object>} Verify imported input pins, metadata, event links and artifact sources before display. */
export async function verifyRecord(run) {
  require(run?.schema_version === 'dynamic-flower-run-1' && ['manual', 'live', 'fixture'].includes(run.mode), 'Choose a dynamic-flower-run-1 record with an explicit execution mode.');
  validateConfig(run.config, run.catalog);
  require(await contentHash(run.config) === run.config_sha256 && await contentHash(run.catalog) === run.catalog_sha256, 'The record’s configuration or catalog fingerprint does not match.');
  require(Array.isArray(run.events) && run.events.length > 0 && run.events[0].kind === 'created', 'The record is missing its creation event.');
  const metadata = Object.fromEntries(Object.entries(run).filter(([key]) => key !== 'events'));
  require(canonical(run.events[0].payload) === canonical(metadata), 'Record metadata differs from its creation event.');
  const actors = new Map(run.config.agents.map(agent => [agent.id, agent])), prior = new Map();
  let previous = '0'.repeat(64), version = 0;
  for (const [index, event] of run.events.entries()) {
    const base = Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'hash'));
    require(event.seq === index + 1 && event.prev_hash === previous && await contentHash(base) === event.hash, `Event integrity failed at ${index + 1}.`);
    if (event.kind === 'message') { checkMessage(event, actors, prior); prior.set(event.payload.message_id, event); }
    if (event.kind === 'artifact') { await checkArtifact(event, prior, version); version = event.payload.version; }
    if (event.kind === 'observation') await checkObservation(run, event);
    if (event.kind === 'evaluation') checkEvaluation(event);
    if (event.kind === 'runtime_amendment') await checkAmendment(run, event);
    previous = event.hash;
  }
  return run;
}

function outstanding(events) {
  const publicMessages = messages(events), questions = [], objections = [];
  for (const event of publicMessages) {
    const value = event.payload.response, id = event.payload.message_id;
    const replies = publicMessages.filter(item => item.payload.response.reply_to.includes(id));
    if (value.kind === 'question') {
      const answered = new Set(replies.filter(item => ['answer', 'implementation', 'approval', 'objection'].includes(item.payload.response.kind)).map(item => item.actor));
      const pending = value.to.filter(actor => !answered.has(actor));
      if (pending.length) questions.push({id, actor: event.actor, pending, content: value.content});
    }
    if (value.kind === 'objection' && !replies.some(item => item.actor === event.actor && item.payload.response.kind === 'resolve' && item.payload.response.issue_id === id)) {
      objections.push({id, actor: event.actor, to: value.to, content: value.content, replies: replies.map(item => item.actor)});
    }
  }
  return {questions, objections};
}

/** @param {object} run @param {number} cursor @returns {object} Derive issues and decisions only from events visible at the replay cursor. */
export function replayState(run, cursor) {
  const events = run.events.filter(event => event.seq <= cursor), publicMessages = messages(events), {questions, objections} = outstanding(events);
  const artifacts = events.filter(event => event.kind === 'artifact'), frozen = events.filter(event => event.kind === 'frozen');
  const amendments = events.filter(event => event.kind === 'runtime_amendment');
  const current = artifacts.at(-1)?.payload ?? null, latestUpdate = Math.max(0, ...events.filter(event => event.kind === 'user_update').map(event => event.seq));
  const reviews = current ? Object.fromEntries(run.catalog.domains.map(domain => [domain.id, 'not_reviewed'])) : {};
  for (const event of publicMessages) if (event.seq > latestUpdate && event.payload.response.kind === 'approval' && event.payload.response.artifact_version === current?.version) {
    for (const id of event.payload.response.domains) reviews[id] = 'approved';
  }
  return {events, messages: publicMessages, questions, objections, artifacts, frozen, amendments,
    effective_context_chars: amendments.at(-1)?.payload.new_context_limit ?? run.config.budgets.max_context_chars,
    phase: frozen.length ? 'deploy_test' : 'design_develop', current_artifact: current, review_status: reviews,
    turns: Object.fromEntries(PHASES.map(([id]) => [id, events.filter(event => event.kind === 'request' && event.phase === id).length])),
    decisions: publicMessages.filter(event => event.payload.response.kind === 'decision'),
    observations: events.filter(event => event.kind === 'observation'), evaluations: events.filter(event => event.kind === 'evaluation')};
}

/** @param {object} run @returns {object} Copy input settings with the explicitly amended context allowance for a new run. */
export function continuedConfiguration(run) {
  const config = structuredClone(run.config);
  config.budgets.max_context_chars = replayState(run, run.events.length).effective_context_chars;
  return config;
}
