/** Load explicit published conversations through the same verified reader as local record imports. */
import {el, button, select} from '../experiments/dom.js';
const INDEX = '/agentic-le/dynamic/study/index.json';
const MAX_BYTES = 30 * 1024 * 1024;

/** @param {object|Array} index @param {string} origin @returns {Array} Validate bounded same-site record links without inferring execution or evaluation status. */
export function savedEntries(index, origin) {
  const entries = Array.isArray(index) ? index : index?.entries;
  if (!Array.isArray(entries) || entries.length > 100) throw new Error('Saved conversation index must contain at most 100 entries.');
  const seen = new Set();
  return entries.map(entry => {
    if (!entry || typeof entry.id !== 'string' || !entry.id || seen.has(entry.id)) throw new Error('Saved conversation IDs must be present and unique.');
    if (typeof entry.label !== 'string' || typeof entry.status !== 'string' || typeof entry.url !== 'string') throw new Error('Saved conversation labels, statuses and URLs must be text.');
    const url = new URL(entry.url, origin);
    if (url.origin !== origin || !url.pathname.startsWith('/agentic-le/dynamic/study/') || !url.pathname.endsWith('.json') || url.username || url.password) throw new Error('Saved conversations must be JSON records hosted in this site’s dynamic study folder.');
    seen.add(entry.id); return {...entry, url: url.href};
  });
}

async function openSaved(entry, openRecord, note, trigger) {
  trigger.disabled = true; note.textContent = 'Loading the saved record and checking its retained identity…';
  try {
    const response = await fetch(entry.url, {credentials: 'omit'});
    if (!response.ok) throw new Error(`Record request returned HTTP ${response.status}.`);
    if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Saved record exceeds 30 MB.');
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) throw new Error('Saved record exceeds 30 MB.');
    if (!await openRecord(new File([bytes], `${entry.id}.json`, {type: 'application/json'}), entry.id)) throw new Error('Record validation failed; see the workspace status for details.');
    note.textContent = `Selected published record: ${entry.label}. See the record’s execution mode and retained evidence below.`;
  } catch (error) { note.textContent = `Saved record could not be loaded: ${error.message}`; }
  finally { trigger.disabled = false; }
}

/** @param {Function} openRecord @returns {Promise<void>} Show a published-run picker only when an optional index exists. */
export async function loadSavedRuns(openRecord) {
  const node = document.getElementById('published-runs');
  try {
    const response = await fetch(INDEX, {credentials: 'omit', cache: 'no-store'});
    if (response.status === 404) return;
    if (!response.ok) throw new Error(`Index request returned HTTP ${response.status}.`);
    const entries = savedEntries(await response.json(), location.origin);
    if (!entries.length) return;
    const requested = new URLSearchParams(location.search).get('run');
    let entry = entries.find(item => item.id === requested) ?? entries[0];
    const note = el('p', 'muted', `Published status: ${entry.status}`), row = el('div', 'inline-controls');
    note.setAttribute('role', 'status');
    const trigger = button('Open saved conversation', () => openSaved(entry, openRecord, note, trigger));
    row.append(select('Published run', entry.id, entries.map(item => [item.id, item.label]), id => { entry = entries.find(item => item.id === id); note.textContent = `Published status: ${entry.status}`; }), trigger);
    node.replaceChildren(el('h2', '', 'Saved conversations'), el('p', '', 'Open a retained run to inspect its conversation, frozen versions, test observations and expert reviews. Execution mode and missing evidence are shown in the record.'), row, note); node.hidden = false;
    if (entry.id === requested) await openSaved(entry, openRecord, note, trigger);
  } catch (error) {
    node.replaceChildren(el('h2', '', 'Saved conversations'), el('p', 'error-note', `Published records are unavailable: ${error.message} Local file import remains available.`)); node.hidden = false;
  }
}
