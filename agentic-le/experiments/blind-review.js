/** Keep blind evidence review isolated from configuration, treatment mapping, and original run replay. */
import {el, select, downloadJSON, readJSON} from './dom.js';
import {fetchJSON} from './remote.js';
import {importBlindSet, emptyReview, reviewProblems} from './scorecard-model.js';
import {defaultAssumptions, renderAssumptions, validateAssumptions} from './scorecard-settings.js';
import {verifyFrozen} from './scorecard-records.js';
import {renderPacket, renderReviewer, renderRatings} from './blind-form.js';
import {digest} from '../replay/state.js';

const $ = id => document.getElementById(id);
let packets = [], current = '', connected = false, working = false;
const drafts = new Map();

/** @param {string} message @param {boolean} [error] @returns {void} Report review actions without printing private metadata. */
function notify(message, error = false) {
  $('blind-notice').textContent = message;
  $('blind-notice').classList.toggle('error', error);
}

/** @returns {object|undefined} Read only the active opaque packet. */
function activePacket() { return packets.find(packet => packet.id === current); }

/** @returns {void} Refresh completion information without mutating a reviewer judgment. */
function updateState() {
  const state = drafts.get(current);
  if (!state) return;
  const problems = reviewProblems(activePacket(), state.review);
  const missing = Object.values(state.review.ratings).filter(rating => rating.score === null || rating.lower === null || rating.upper === null).length;
  $('review-status').textContent = state.frozen ? 'Frozen record: review and assumptions are locked.'
    : `${9 - missing} of 9 criteria rated. ${missing ? 'Unknown criteria remain unavailable, not zero.' : 'Every criterion has a rating.'}`;
  $('review-issues').replaceChildren(...problems.map(problem => el('li', '', problem)));
  $('review-issues').parentElement.hidden = state.frozen || !problems.length;
  $('freeze-review').disabled = !connected || working || Boolean(state.frozen);
  $('freeze-review').textContent = missing ? 'Freeze incomplete review' : 'Freeze scorecard';
  $('export-frozen').disabled = !state.frozen;
  $('export-draft').disabled = Boolean(state.frozen);
  $('import-review').disabled = working || Boolean(state.frozen);
  $('import-packets').disabled = working;
  $('candidate-picker').querySelector('select').disabled = working;
  $('blind-lockable').disabled = Boolean(state.frozen) || working;
}

/** @returns {void} Rebuild the active review with no generation or treatment information. */
function renderCurrent() {
  const packet = activePacket(), state = drafts.get(current);
  $('blind-empty').hidden = true; $('blind-workspace').hidden = false;
  $('candidate-picker').replaceChildren(select('Opaque candidate', current, packets.map(item => [item.id, item.id]), value => {
    current = value; renderCurrent();
  }));
  renderPacket($('blind-evidence'), packet);
  renderReviewer($('blind-reviewer'), state.review, updateState);
  renderRatings($('blind-ratings'), packet, state.review, updateState);
  renderAssumptions($('blind-assumptions'), state.settings, updateState);
  if (state.pinned) {
    $('blind-assumptions').prepend(el('p', 'mode-note', 'Prospective assumptions are pinned to this packet set. Change assumptions in a new iteration before preparing new packets.'));
    $('blind-assumptions').querySelectorAll('input,select,textarea').forEach(control => { control.disabled = true; });
  }
  updateState();
}

/** @param {Event} event @returns {Promise<void>} Admit only independently verified public assessment packets. */
async function importPackets(event) {
  try {
    const importedSet = await importBlindSet(await readJSON(event.target.files[0]));
    const imported = importedSet.packets;
    for (const packet of imported) {
      const existing = packets.find(item => item.id === packet.id);
      if (existing && existing.packet_hash !== packet.packet_hash) throw new Error('An existing candidate identifier has different content.');
      const draft = drafts.get(packet.id);
      if (draft && importedSet.settings && await digest(draft.settings) !== await digest(importedSet.settings)) throw new Error('Existing draft settings differ from the pinned packet bundle. Reopen this page to start with its prospective assumptions.');
    }
    for (const packet of imported) {
      if (!drafts.has(packet.id)) {
        const settings = importedSet.settings ? structuredClone(importedSet.settings) : defaultAssumptions();
        if (!importedSet.settings) settings.thresholds = structuredClone(packet.scenario.axis_targets);
        drafts.set(packet.id, {review: await emptyReview(packet), settings, pinned: Boolean(importedSet.settings), frozen: null});
      }
      if (importedSet.settings) drafts.get(packet.id).pinned = true;
      if (!packets.some(item => item.id === packet.id)) packets.push(packet);
    }
    current = imported[0].id; renderCurrent();
    notify(`Verified ${imported.length} opaque packet${imported.length === 1 ? '' : 's'}. No assignment key or run journal was loaded.`);
  } catch (error) { notify(`Packet import failed: ${error.message}`, true); }
  event.target.value = '';
}

/** @param {Event} event @returns {Promise<void>} Restore a local draft only when it matches this exact packet and rubric. */
async function importDraft(event) {
  try {
    const value = await readJSON(event.target.files[0]);
    const packet = activePacket();
    if (drafts.get(current).frozen) throw new Error('The review is already frozen.');
    if (value.kind !== 'blind_review_draft' || value.schema_version !== 1
      || Object.keys(value).some(key => !['schema_version', 'kind', 'review', 'settings'].includes(key))) throw new Error('Choose an exported blind review draft.');
    if (value.review.packet_id !== packet.id || value.review.packet_hash !== packet.packet_hash
      || value.review.rubric_hash !== await digest(packet.rubric)) throw new Error('Draft does not match the active packet and rubric.');
    const expected = await emptyReview(packet);
    if (Object.keys(expected.ratings).some(key => !value.review.ratings?.[key])) throw new Error('Draft is missing rubric criteria.');
    const previous = drafts.get(current), settings = validateAssumptions(value.settings);
    if (previous.pinned && await digest(settings) !== await digest(previous.settings)) throw new Error('Draft assumptions differ from this prospectively pinned packet set.');
    drafts.set(current, {review: value.review, settings, pinned: previous.pinned, frozen: null}); renderCurrent();
    notify('Restored the hash-bound draft. Unknown evidence remains unscored.');
  } catch (error) { notify(`Draft import failed: ${error.message}`, true); }
  event.target.value = '';
}

/** @returns {Promise<void>} Persist a hash-bound review before any assignment mapping is revealed. */
async function freezeReview() {
  const packet = activePacket(), state = drafts.get(current);
  working = true; updateState();
  try {
    const review = structuredClone(state.review);
    review.reviewed_at = new Date().toISOString();
    const frozen = await verifyFrozen(await fetchJSON('/api/experiments/scorecards/freeze', {packet, review, settings: state.settings}));
    state.frozen = frozen; state.review = frozen.review;
    notify('Review and probability assumptions frozen. Export this record for comparison; candidate identities remain withheld here.');
  } catch (error) { notify(`Freeze failed; the draft is still editable: ${error.message}`, true); }
  finally { working = false; updateState(); }
}

/** @returns {void} Connect explicit file actions without loading any journal or assignment mapping. */
function bindActions() {
  $('import-packets').addEventListener('click', () => $('packet-file').click());
  $('packet-file').addEventListener('change', importPackets);
  $('import-review').addEventListener('click', () => $('review-file').click());
  $('review-file').addEventListener('change', importDraft);
  $('freeze-review').addEventListener('click', freezeReview);
  $('export-draft').addEventListener('click', () => {
    const state = drafts.get(current);
    downloadJSON({schema_version: 1, kind: 'blind_review_draft', review: state.review, settings: state.settings}, `${current}-review-draft.json`);
  });
  $('export-frozen').addEventListener('click', () => downloadJSON(drafts.get(current).frozen, `${current}-frozen-scorecard.json`));
}

/** @returns {Promise<void>} Check only local service availability before accepting review evidence. */
async function main() {
  bindActions();
  try {
    await fetchJSON('/api/experiments/scorecards/catalog'); connected = true;
    $('blind-connection').textContent = 'Local freeze service connected';
    notify('Import opaque packets to begin. This workspace does not load team configurations or original journals.');
  } catch (error) {
    $('blind-connection').textContent = 'Offline review drafts';
    notify('You can review and export drafts here. Freezing requires the local runner; open this page there and import the packet and draft.');
  }
}

main();
