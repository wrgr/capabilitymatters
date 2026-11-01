/** Coordinate the experiment GUI with local execution and portable verified replay. */
import {el, button, downloadJSON, readJSON} from './dom.js';
import {importConfig} from './config-model.js';
import {renderTeam} from './config-editor.js';
import {renderCase, renderIntegration, renderConditions, renderExecution} from './conditions-editor.js';
import {renderSummary, renderReview} from './review-view.js';
import {RunView} from './run-view.js';
import {fetchJSON, loadWorkspace, batchFinished} from './remote.js';
import {renderComparison} from './comparison-view.js';
import {renderStudy, renderComparisonSetup} from './study-editor.js';
import {applyStudyPreset, comparisonCount, comparisonConditionCount} from './study-model.js';
import {renderOutcomes} from './outcome-editor.js';

const $ = id => document.getElementById(id);
let catalog, config, original, outcomeCatalog, agentContract, resolved = null, connection = {}, busy = false, presetBusy = false;
const studyChoice = {mode: 'default', competency: 'measurement', persona_id: 'generalist'};
const comparison = {schema_version: 1, kind: 'ablation', competency: 'measurement', integration_modes: ['explicit', 'handoff']};
let runTimer = null, batchTimer = null, latestBatch = null;
let activeExecution = null, runEpoch = 0, activeMonitorTimer = null;
const replay = new RunView(notify);

/** @param {string} message @param {boolean} [error] @returns {void} Keep action outcomes visible and accessible. */
function notify(message, error = false) {
  $('notice').textContent = message;
  $('notice').classList.toggle('error', error);
}

/** @param {string} name @returns {void} Switch application views with explicit tab semantics. */
function showTab(name) {
  for (const key of ['configure', 'review', 'replay']) {
    const selected = key === name;
    $(`${key}-tab`).setAttribute('aria-selected', String(selected));
    $(`${key}-tab`).tabIndex = selected ? 0 : -1;
    $(`${key}-panel`).hidden = !selected;
  }
  if (name !== 'replay') replay.stop();
}

/** @returns {Map<string, boolean>} Preserve disclosure states across deliberate structural edits. */
function openPanels() {
  return new Map([...$('configure-panel').querySelectorAll('details')].map(node => [panelKey(node), node.open]));
}

/** @param {HTMLElement} node @returns {string} Identify disclosures by actor and their visible purpose. */
function panelKey(node) {
  return node.dataset.actor || `${node.closest('[data-actor]')?.dataset.actor || ''}/${node.querySelector('summary')?.textContent}`;
}

/** @param {boolean} [structural] @returns {void} Invalidate stale resolutions whenever the configuration changes. */
function changed(structural = false) {
  resolved = null;
  if (structural) renderConfiguration();
  renderSummary($('summary-stats'), config, catalog);
  renderReview($('coverage-review'), config, catalog, resolved, agentContract);
  updateComparisonCount();
  updateActions();
}

/** @returns {void} Build case, team, and condition controls from the same configuration. */
function renderConfiguration() {
  const panels = openPanels();
  renderStudy($('study-editor'), config, catalog, studyChoice, applyStudy, presetBusy);
  renderCase($('case-editor'), config, changed);
  renderTeam($('team-editor'), config, catalog, changed);
  renderIntegration($('integration-editor'), config, catalog, changed);
  renderConditions($('conditions-editor'), config, catalog, changed, outcomeCatalog);
  renderOutcomes($('outcome-editor'), config, outcomeCatalog, changed);
  renderExecution($('execution-editor'), config, catalog, changed);
  renderComparisonSetup($('comparison-setup'), config, catalog, comparison, updateComparisonCount);
  for (const node of $('configure-panel').querySelectorAll('details')) {
    if (panels.has(panelKey(node))) node.open = panels.get(panelKey(node));
  }
}

/** @returns {void} Keep comparison workload visible when repeats or design factors change. */
function updateComparisonCount() {
  $('comparison-count').textContent = `${comparisonConditionCount(comparison)} participation/support conditions × ${comparison.integration_modes.length} coordination conditions × ${config.execution.repetitions} repetitions = ${comparisonCount(comparison, config.execution.repetitions)} runs.`;
}

/** @returns {Promise<void>} Apply the same explicit study transformation locally or through the authoritative runner. */
async function applyStudy() {
  const submitted = JSON.stringify(config);
  const choice = {...studyChoice};
  presetBusy = true;
  renderStudy($('study-editor'), config, catalog, studyChoice, applyStudy, true);
  try {
    const result = connection.local_runner
      ? await fetchJSON('/api/experiments/presets', {config: JSON.parse(submitted), ...choice})
      : {config: applyStudyPreset(config, original, catalog, choice)};
    if (JSON.stringify(config) !== submitted) throw new Error('Configuration changed while the preset was being applied. Apply it again to the updated configuration.');
    config = importConfig(result.config); renderConfiguration(); changed();
    if (result.resolved) { resolved = result.resolved; renderReview($('coverage-review'), config, catalog, resolved, agentContract); }
    notify(`Applied ${choice.mode === 'default' ? 'default team' : choice.mode === 'ablation' ? 'competency ablation' : 'individual agent'} preset. The case and recorded run journals are preserved.`);
  } catch (error) { notify(error.message, true); }
  finally { presetBusy = false; renderStudy($('study-editor'), config, catalog, studyChoice, applyStudy); }
}

/** @returns {void} Explain execution availability without hiding the offline builder. */
function updateActions() {
  const local = Boolean(connection.local_runner);
  const capabilities = connection.capabilities || connection;
  const liveUnavailable = config.execution.provider === 'codex'
    && (capabilities.codex_installed === false || capabilities.live_enabled === false);
  for (const id of ['start-run', 'start-comparison']) $(id).disabled = !local || busy || liveUnavailable;
  $('resolve-config').disabled = !local || busy;
  $('cancel-execution').hidden = !activeExecution;
  $('cancel-execution').disabled = Boolean(activeExecution?.cancellationRequested);
  $('connection-state').textContent = local ? 'Local runner connected' : 'Configuration and replay';
  $('runner-help').textContent = !local
    ? 'Configure and export experiments here, or import a saved run for replay. Start the local runner to execute new agents.'
    : liveUnavailable ? 'Live execution requires an installed, authenticated Codex CLI and a runner started with CAPABILITY_MATTERS_LIVE=1. Dry runs are available now.'
      : busy ? 'An execution is active. Its journal remains available in Replay as new events arrive.'
        : 'The local runner is available. Every execution creates a new journal and preserves its resolved configuration.';
}

/** @returns {Promise<object>} Resolve exact responsibilities before starting any execution. */
async function resolveCurrent() {
  const submitted = JSON.stringify(config);
  const result = await fetchJSON('/api/experiments/resolve', {config: JSON.parse(submitted)});
  if (JSON.stringify(config) !== submitted) throw new Error('Configuration changed while it was being resolved. Review and resolve the updated configuration.');
  resolved = result;
  renderReview($('coverage-review'), config, catalog, resolved, agentContract);
  notify(`Configuration resolved. ${result.planned_calls} calls planned per run; hashes and effective responsibilities are available below.`);
  return result;
}

/** @param {boolean} compare @returns {Promise<void>} Start one execution or an explicitly selected set of fresh comparisons. */
async function start(compare) {
  const comparisonPlan = structuredClone(comparison);
  busy = true; updateActions();
  try {
    const plan = await resolveCurrent();
    if (compare) {
      const batch = await fetchJSON('/api/experiments/batches', {config: plan.config, comparison: comparisonPlan});
      activeExecution = {id: batch.batch_id || batch.id, kind: 'batch'}; updateActions();
      $('comparison-panel').hidden = false;
      notify('Comparison started. Each condition receives the fixed case and challenge schedule.');
      watchBatch(batch.batch_id || batch.id);
    } else {
      const result = await fetchJSON('/api/experiments/runs', {config: plan.config});
      activeExecution = {id: result.run_id, kind: 'run'}; updateActions();
      showTab('replay');
      notify('Run started. New journal events will appear in Replay.');
      watchRun(result.run_id, true);
    }
  } catch (error) {
    busy = false; updateActions(); notify(error.message, true);
  }
}

/** @param {string} id @param {boolean} [follow] @param {number} [position] @returns {Promise<void>} Load a journal and continue observing only while it is running. */
async function watchRun(id, follow = false, position = 1, token = null) {
  if (token === null && activeExecution?.kind === 'run' && activeExecution.id !== id) monitorActive();
  const epoch = token ?? ++runEpoch;
  clearTimeout(runTimer);
  try {
    const run = await fetchJSON(`/api/runs/${encodeURIComponent(id)}`);
    if (epoch !== runEpoch) return;
    await replay.setRun(run, {follow, position, reset: token === null});
    if (['completed', 'failure', 'cancelled'].includes(run.events.at(-1).kind)) {
      if (activeExecution?.kind === 'run' && activeExecution.id === id) { busy = false; activeExecution = null; }
      updateActions(); refreshRuns();
    } else runTimer = setTimeout(() => watchRun(id, follow, position, epoch), 1500);
  } catch (error) {
    updateActions(); notify(`Could not load the run. An active execution may still be running: ${error.message}`, true);
  }
}

/** @param {string} id @returns {Promise<void>} Update comparison status without fabricating an effect estimate. */
async function watchBatch(id) {
  clearTimeout(batchTimer);
  try {
    latestBatch = await fetchJSON(`/api/experiments/batches/${encodeURIComponent(id)}`);
    renderComparison($('comparison-results'), latestBatch, runId => { showTab('replay'); watchRun(runId); });
    $('batch-export').disabled = false;
    if (batchFinished(latestBatch)) {
      batchTimer = null; busy = false; activeExecution = null; updateActions(); refreshRuns();
      notify(`Comparison ${latestBatch.status}. Open each journal to inspect its actual record.`);
    } else batchTimer = setTimeout(() => watchBatch(id), 1500);
  } catch (error) {
    batchTimer = null; updateActions(); notify(`Could not load comparison status. Execution may still be running: ${error.message}`, true);
  }
}

/** @returns {Promise<void>} Offer saved local journals as replay entries. */
async function refreshRuns() {
  if (!connection.local_runner) return;
  try {
    const result = await fetchJSON('/api/experiments/runs');
    $('saved-runs').replaceChildren();
    for (const run of (result.runs || []).slice(0, 30)) {
      const item = button('', () => { showTab('replay'); watchRun(run.id || run.run_id); }, 'saved-run');
      item.append(el('strong', '', run.name || run.id || run.run_id), el('small', 'muted', `${run.status || run.mode || 'Saved'} · ${run.event_count ?? ''} events`));
      $('saved-runs').append(item);
    }
    if (!$('saved-runs').children.length) $('saved-runs').append(el('p', 'muted', 'No local experiment runs yet.'));
  } catch (error) {
    $('saved-runs').replaceChildren(el('p', 'muted', `Saved runs unavailable: ${error.message}`));
  }
}

/** @param {Event} event @param {boolean} runFile @returns {Promise<void>} Import a portable configuration or original run record. */
async function importFile(event, runFile) {
  try {
    const value = await readJSON(event.target.files[0]);
    if (runFile) {
      clearTimeout(runTimer);
      runEpoch += 1;
      await replay.setRun(value, {reset: true});
      if (activeExecution?.kind === 'run') monitorActive();
      showTab('replay'); notify('Imported journal verified. Playback uses only this saved record.');
    } else {
      config = importConfig(value); renderConfiguration(); changed(); showTab('configure');
      notify('Configuration imported. Review and resolve it before execution.');
    }
  } catch (error) { notify(error.message, true); }
  event.target.value = '';
}

/** @returns {void} Bind navigation, import/export, and execution actions. */
function bindActions() {
  const action = (id, callback) => $(id).addEventListener('click', callback);
  const names = ['configure', 'review', 'replay'];
  for (const [index, name] of names.entries()) {
    action(`${name}-tab`, () => showTab(name));
    $(`${name}-tab`).addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      showTab(names[next]); $(`${names[next]}-tab`).focus();
    });
  }
  action('review-configuration', () => { showTab('review'); if (connection.local_runner) resolveCurrent().catch(error => notify(error.message, true)); });
  action('resolve-config', () => resolveCurrent().catch(error => notify(error.message, true)));
  action('export-config', () => downloadJSON(config, `${config.id}-configuration.json`));
  action('import-config', () => $('config-file').click());
  action('import-run', () => $('run-file').click());
  action('run-export', () => { if (replay.run) downloadJSON(replay.run, `${replay.run.id}.json`); });
  action('batch-export', () => { if (latestBatch) downloadJSON(latestBatch, `${latestBatch.batch_id || latestBatch.id}.json`); });
  action('reset-config', () => { config = structuredClone(original); renderConfiguration(); changed(); notify('Restored the baseline configuration. Saved run records are unchanged.'); });
  action('use-run-config', () => {
    config = importConfig(replay.run.experiment.config); renderConfiguration(); changed(); showTab('configure');
    notify('Loaded this run’s configuration for a new experiment. The original journal remains unchanged.');
  });
  action('start-run', () => start(false)); action('start-comparison', () => start(true));
  action('cancel-execution', requestStop);
  action('refresh-runs', refreshRuns);
  $('config-file').addEventListener('change', event => importFile(event, false));
  $('run-file').addEventListener('change', event => importFile(event, true));
}

/** @returns {Promise<void>} Request a bounded stop while retaining the in-progress journal. */
async function requestStop() {
  if (!activeExecution) return;
  try {
    const result = await fetchJSON('/api/experiments/cancel', {id: activeExecution.id});
    activeExecution.cancellationRequested = true; updateActions();
    notify(`Stop requested. Execution will stop ${result.boundary || 'at the next supported boundary'}; recorded events will be retained.`);
  } catch (error) { notify(`Stop request failed: ${error.message}`, true); }
}

/** @returns {Promise<void>} Observe an active execution while a different imported record is displayed. */
async function monitorActive() {
  clearTimeout(activeMonitorTimer);
  if (!activeExecution) return;
  try {
    const status = await fetchJSON('/api/status');
    if (!status.active_run) {
      activeExecution = null; busy = false; updateActions(); refreshRuns();
    } else activeMonitorTimer = setTimeout(monitorActive, 2000);
  } catch (error) {
    notify(`Execution status unavailable; the current run may continue: ${error.message}`, true);
  }
}

/** @returns {void} Reconnect to an execution already active when the page opened. */
function resumeActive() {
  if (!connection.active_run) return;
  const id = connection.active_run;
  activeExecution = {id, kind: id.includes('-batch-') ? 'batch' : 'run'};
  busy = true; updateActions();
  if (activeExecution.kind === 'batch') {
    $('comparison-panel').hidden = false; watchBatch(id);
  } else { showTab('replay'); watchRun(id, true); }
}

/** @returns {Promise<void>} Load the shared experiment schema and optional local execution capability. */
async function main() {
  bindActions();
  try {
    const workspace = await loadWorkspace();
    catalog = workspace.catalog; outcomeCatalog = workspace.outcome_catalog; agentContract = workspace.agent_contract; original = importConfig(workspace.default_config);
    config = structuredClone(original); connection = workspace.connection;
    renderConfiguration(); changed();
    $('loading').hidden = true; $('workspace').hidden = false;
    notify(connection.local_runner ? 'Ready to configure, run, and inspect an experiment.' : 'Configuration and imported replay are ready. New execution uses the local runner.');
    await refreshRuns();
    resumeActive();
    const params = new URLSearchParams(location.search);
    if (params.get('run')) {
      showTab('replay'); await watchRun(params.get('run'), false, Number(params.get('event')) || 1);
    }
  } catch (error) {
    $('loading').textContent = 'The experiment catalog could not be loaded. Rebuild the site and try again.';
    notify(error.message, true);
  }
}

main();
