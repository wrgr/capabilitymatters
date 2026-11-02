/** Verify imported journal integrity and expose only the state visible at a replay position. */
import {canonical, digest, snapshot, stages} from '../replay/state.js';

/** @param {object} run @returns {Promise<boolean>} Verify the journal chain and pinned experiment without running agents. */
export async function verifyExperimentRun(run) {
  if (run?.schema_version !== 1 || !Array.isArray(run.events) || !run.events.length || run.events.length > 5000) {
    throw new Error('Unsupported or empty run journal.');
  }
  const first = run.events[0];
  if (first.kind !== 'seed' || run.id !== first.payload?.run_id) throw new Error('Missing run manifest.');
  for (const key of ['seed', 'mode', 'roster', 'parent', 'role_profiles', 'experiment']) {
    if (canonical(run[key] ?? null) !== canonical(first.payload[key] ?? null)) throw new Error(`Pinned ${key} differs from the journal.`);
  }
  if (run.experiment?.config_hash && await digest(run.experiment.config) !== run.experiment.config_hash) {
    throw new Error('Pinned configuration hash differs from its contents.');
  }
  let previous = '0'.repeat(64);
  const revisions = {};
  for (const [index, event] of run.events.entries()) {
    const {hash, ...body} = event;
    if (event.seq !== index + 1 || event.prev_hash !== previous || hash !== await digest(body) || !stages.includes(event.stage)) {
      throw new Error(`Journal integrity failed at event ${index + 1}.`);
    }
    previous = hash;
    const refs = event.payload?.response?.evidence_refs;
    if (refs && (!Array.isArray(refs) || refs.some(seq => !Number.isInteger(seq) || seq < 1 || seq >= event.seq))) {
      throw new Error(`Invalid evidence reference at event ${event.seq}.`);
    }
    if (event.kind === 'artifact') await verifyArtifact(event, run, revisions);
    if (event.kind === 'outcome_assessment') verifyOutcomeReferences(event, run);
  }
  return true;
}

/** @param {object} event @param {object} run @returns {void} Reject outcome citations that point outside the recorded earlier evidence. */
function verifyOutcomeReferences(event, run) {
  const refs = Object.values(event.payload.dimensions || {}).flatMap(item => item.evidence_refs || []);
  for (const ref of refs) {
    const source = run.events[ref.event_seq - 1];
    if (!Number.isInteger(ref.event_seq) || ref.event_seq < 1 || ref.event_seq >= event.seq || !source
      || ref.event_hash !== source.hash || (ref.artifact_hash && ref.artifact_hash !== source.payload.content_hash)) {
      throw new Error(`Invalid outcome evidence at event ${event.seq}.`);
    }
  }
}

/** @param {object} event @param {object} run @param {object} revisions @returns {Promise<void>} Check artifact revision lineage and content hashes. */
async function verifyArtifact(event, run, revisions) {
  const payload = event.payload;
  const previous = revisions[payload.id] || 0;
  const source = run.events[payload.trigger_seq - 1];
  if (payload.revision !== previous + 1 || payload.parent_revision !== (previous || null)
    || payload.content_hash !== await digest(payload.content) || !source || source.seq >= event.seq || source.kind !== 'decision') {
    throw new Error(`Artifact integrity failed at event ${event.seq}.`);
  }
  revisions[payload.id] = payload.revision;
}

/** @param {object} run @param {number} sequence @returns {object} Derive a bounded replay state without leaking future artifacts. */
export function replayAt(run, sequence) {
  const position = Math.max(1, Math.min(Number(sequence) || 1, run.events.length));
  const state = snapshot(run, position);
  return {...state, position, selected: state.events.at(-1)};
}

/** @param {object} run @returns {string} Describe observed run status without claiming learning effects. */
export function runStatus(run) {
  const last = run.events.at(-1);
  if (last.kind === 'failure') return 'Stopped with a retained failure';
  if (last.kind === 'cancelled') return 'Cancelled with the record retained';
  if (last.kind === 'completed') return 'Completed record';
  return 'Run in progress';
}

/** @param {object} run @returns {boolean} Identify fixture modes for conspicuous evidence labeling. */
export function isFixture(run) {
  return /dry|scripted|fixture/.test(run.mode || '');
}

/** @param {object} run @returns {Map<string,string>} Use actual executing identities rather than individual-mode reference profile keys. */
export function replayActors(run) {
  const specs = Object.values(run.experiment?.agent_specs || {});
  if (specs.length) return new Map(specs.map(spec => [spec.identity.actor_id, spec.identity.display_name]));
  return new Map(Object.entries(run.roster || {}).map(([id, actor]) => [id, actor.name]));
}

/** @param {object} run @param {object} event @returns {string} Label actual model identities separately from technical journal actors. */
export function actorName(run, event) {
  return event.payload?.actor_name || replayActors(run).get(event.agent)
    || ({'outcome-evaluator': 'Outcome evaluator', scenario: 'Fixed challenge', human: 'Human input or gate', orchestrator: 'Orchestration'})[event.agent]
    || run.roster?.[event.agent]?.name || event.agent;
}
