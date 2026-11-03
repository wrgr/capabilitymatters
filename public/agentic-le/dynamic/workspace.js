/** Keep runnable drafts and imported records separate while providing explicit local export and replay actions. */
import {downloadJSON, readJSON} from '../experiments/dom.js';
import {makeConfig, nextVersionId, runnerCommands, validateConfig} from './config-model.js';
import {renderEditor} from './config-editor.js';
import {contentHash, continuedConfiguration, verifyRecord} from './record-model.js';
import {renderRunSummary, renderReplay} from './record-view.js';
import {loadSavedRuns} from './saved-runs.js';
const host = id => document.getElementById(id);
const storageKey = 'capabilitymatters.dynamic-flower.draft.v1';
const state = {catalog: null, config: null, saved: '', run: null, runBytes: null, cursor: 1, hashRequest: 0, sourceDirty: false};

function announce(message) { host('workspace-status').textContent = message; }
function showError(error) {
  host('config-error').hidden = false; host('config-error').textContent = error.message ?? String(error);
  announce(`Could not apply the action: ${error.message ?? error}`);
}

function activate(panelId) {
  for (const tab of document.querySelectorAll('[data-panel]')) {
    const active = tab.dataset.panel === panelId; tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    host(tab.dataset.panel).hidden = !active;
  }
}

function configureTabs() {
  const tabs = [...document.querySelectorAll('[data-panel]')];
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => activate(tab.dataset.panel));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activate(tabs[next].dataset.panel); tabs[next].focus();
    });
  }
}

async function refreshDraft() {
  const request = ++state.hashRequest; let valid = true;
  try { validateConfig(state.config, state.catalog); host('config-error').hidden = true; }
  catch (error) { valid = false; host('config-error').textContent = error.message; host('config-error').hidden = false; }
  for (const id of ['export-config', 'save-draft', 'next-version']) host(id).disabled = !valid || state.sourceDirty;
  if (!state.sourceDirty) host('config-source').value = JSON.stringify(state.config, null, 2);
  try { host('runner-commands').textContent = runnerCommands(state.config); }
  catch (error) { host('runner-commands').textContent = error.message; }
  const saved = JSON.stringify(state.config) === state.saved;
  host('draft-status').textContent = `${saved ? 'Saved local draft' : 'Unsaved local draft'} · ${state.config.id}${state.sourceDirty ? ' · JSON edits await Apply' : ''}`;
  if (!valid) return;
  try {
    const hash = await contentHash(state.config);
    if (request === state.hashRequest) host('draft-status').textContent += ` · Content SHA-256 ${hash}`;
  } catch (error) { showError(error); }
}

function replaceDraft(next, message) {
  try {
    validateConfig(next, state.catalog); state.config = structuredClone(next); state.sourceDirty = false;
    renderEditor(state.catalog, state.config, {changed: refreshDraft, replace: replaceDraft, error: showError});
    refreshDraft(); announce(message); return true;
  } catch (error) { showError(error); return false; }
}

function saveDraft() {
  try {
    validateConfig(state.config, state.catalog); const source = JSON.stringify(state.config);
    localStorage.setItem(storageKey, source); state.saved = source; refreshDraft(); announce('Configuration saved locally in this browser. No run was started.');
  } catch (error) { showError(error); }
}

function exportConfig() {
  try {
    validateConfig(state.config, state.catalog); downloadJSON(state.config, `${state.config.id}.json`);
    announce(`Exported ${state.config.id}.json with the edited case, agent briefs, scenarios and queued changes. Run it explicitly with the local runner.`);
  } catch (error) { showError(error); }
}

function downloadOriginal() {
  if (!state.run || !state.runBytes) return;
  const url = URL.createObjectURL(new Blob([state.runBytes], {type: 'application/json'})), link = document.createElement('a');
  link.href = url; link.download = `${state.run.id}.json`.replace(/[^A-Za-z0-9_.-]/g, '-'); link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); announce('Exported the original imported record bytes.');
}

function jump(cursor) {
  if (!state.run) return; state.cursor = Math.max(1, Math.min(state.run.events.length, cursor));
  renderReplay(state.run, state.cursor, jump);
}

async function importRun(file, expectedId = null) {
  if (!file) return;
  try {
    if (file.size > 30 * 1024 * 1024) throw new Error('Choose a run record smaller than 30 MB.');
    announce('Checking the imported record’s inputs, event chain and artifact source…');
    const bytes = await file.arrayBuffer(), source = new TextDecoder('utf-8', {fatal: true}).decode(bytes), run = JSON.parse(source);
    if (expectedId !== null && run.id !== expectedId) throw new Error('Saved record ID differs from its published index entry.');
    await verifyRecord(run); state.run = run; state.runBytes = bytes; state.cursor = run.events.length;
    renderRunSummary(run); host('record-content').hidden = false;
    host('event-range').min = '1'; host('event-range').max = String(run.events.length);
    host('export-run').disabled = false; host('copy-run-config').disabled = false; jump(state.cursor); activate('record-panel');
    announce(run.mode === 'fixture' ? 'Loaded a scripted interface demonstration. It is not an agentic result.' : 'Imported record fingerprints checked. Draft configuration remains separate.');
    return true;
  } catch (error) { announce(`Run import rejected: ${error.message}`); return false; }
}

function wireImportsAndSource() {
  host('config-import').addEventListener('change', async event => {
    try { replaceDraft(await readJSON(event.target.files[0]), 'Imported configuration is now the editable draft.'); }
    catch (error) { showError(error); }
    event.target.value = '';
  });
  host('run-import').addEventListener('change', async event => { await importRun(event.target.files[0]); event.target.value = ''; });
  host('config-source').addEventListener('input', () => { state.sourceDirty = true; refreshDraft(); });
  host('apply-config-json').addEventListener('click', () => {
    try { replaceDraft(JSON.parse(host('config-source').value), 'JSON edits applied to the runnable draft.'); }
    catch (error) { showError(error); }
  });
  host('reload-config-json').addEventListener('click', () => { state.sourceDirty = false; refreshDraft(); announce('Unapplied JSON edits discarded; the form configuration is restored.'); });
  host('copy-run-config').addEventListener('click', () => {
    if (!state.run) return; const config = continuedConfiguration(state.run); config.id = nextVersionId(config.id);
    if (replaceDraft(config, 'Copied the configuration with its effective context allowance into a new draft version. The imported record stays unchanged.')) activate('configuration-panel');
  });
}

function wireActions() {
  host('save-draft').addEventListener('click', saveDraft); host('export-config').addEventListener('click', exportConfig);
  host('export-run').addEventListener('click', downloadOriginal);
  host('next-version').addEventListener('click', () => {
    try { const config = structuredClone(state.config); config.id = nextVersionId(config.id); replaceDraft(config, `Created version ${config.id}.`); }
    catch (error) { showError(error); }
  });
  host('previous-event').addEventListener('click', () => jump(state.cursor - 1)); host('next-event').addEventListener('click', () => jump(state.cursor + 1));
  host('latest-event').addEventListener('click', () => { if (state.run) jump(state.run.events.length); });
  host('event-range').addEventListener('input', event => jump(Number(event.target.value)));
  host('copy-commands').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(runnerCommands(state.config)); announce('Local runner commands copied. No command was executed.'); }
    catch (error) { announce(`Copy was unavailable (${error.message}). Select the commands above to copy them manually.`); }
  });
}

function initialize() {
  try {
    state.catalog = JSON.parse(host('dynamic-catalog').textContent);
    let config = makeConfig(state.catalog, state.catalog.cases[0].id, state.catalog.conditions[0].id), notice = 'Edit a configuration, export it for the local runner, or import a completed or in-progress record.';
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) { validateConfig(JSON.parse(saved), state.catalog); config = JSON.parse(saved); state.saved = JSON.stringify(config); notice = 'Restored your saved local draft. No model calls are made by this page.'; }
    } catch (error) { notice = `A stored draft could not be restored (${error.message}). A catalog preset is loaded; imports and exports remain available.`; }
    configureTabs(); wireActions(); wireImportsAndSource(); replaceDraft(config, notice);
    loadSavedRuns(importRun);
  } catch (error) { showError(error); announce(`Workspace could not initialize: ${error.message}`); }
}

initialize();
