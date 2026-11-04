/** Organize opaque packet preparation, frozen review imports, and post-freeze scenario comparisons. */
import {el, button, select, check, disclosure, downloadJSON, readJSON} from './dom.js';
import {fetchJSON} from './remote.js';
import {importFrozen} from './scorecard-records.js';
import {renderScorecards, renderScorecardContrast} from './scorecard-view.js';

export class ScorecardWorkspace {
  /** @param {object} options Receive studio capabilities without sharing them with the isolated reviewer. */
  constructor(options) {
    Object.assign(this, options);
    this.records = []; this.reveal = null; this.prepared = null;
    this.selection = {}; this.runs = []; this.runIDs = new Set();
    this.scenarioID = 'feedback-conversation'; this.contrast = null; this.working = false;
  }

  /** @returns {Promise<void>} Present the workflow and optionally discover saved local execution evidence. */
  async init() { this.render(); if (this.local) await this.refreshRuns(); }

  /** @returns {void} Rebuild organizer controls while preserving frozen scorecard objects. */
  render() {
    this.root.replaceChildren(this.introduction());
    const grid = el('div', 'scorecard-grid');
    grid.append(this.packetControls(), this.reviewControls()); this.root.append(grid);
    this.results = el('div'); this.root.append(this.results);
    renderScorecards(this.results, this.records, this.reveal, this.selection, () => this.render(), this.replay);
    this.root.append(this.comparisonControls());
  }

  /** @returns {HTMLElement} Explain the full sequence before any identity reveal. */
  introduction() {
    const section = el('section', 'panel');
    section.append(el('h2', '', 'Human flourishing, system performance, and learning'),
      el('p', 'muted', 'Prepare opaque evidence packets, review them without assignment labels, freeze the judgments and assumptions, then reveal identities and compare within each scenario.'));
    const steps = el('ol', 'small');
    for (const text of ['Generate fresh candidates under a preserved scenario and iteration.', 'Prepare packets and keep the private assignment key separate from the reviewer.', 'Use the blind workspace to cite evidence, record uncertainty, and freeze each review.', 'Import every frozen review in the set before revealing identities or opening source replay.']) steps.append(el('li', '', text));
    const link = el('a', 'review-link', 'Open the blind review workspace');
    link.href = './blind-review.html'; link.target = '_blank'; link.rel = 'noopener';
    section.append(steps, link, el('p', 'mode-note', 'The existing declared-design outcome cards remain in Replay. This additional scorecard uses independently supplied evidence ratings. It does not retrospectively turn earlier pilot results into blind evidence.'));
    return section;
  }

  /** @returns {HTMLElement} Prepare a reviewer-safe set without placing its mapping in the public bundle. */
  packetControls() {
    const section = el('section', 'panel'); section.append(el('h2', '', '1. Prepare opaque packets'));
    section.append(el('p', 'small muted', 'Organizer controls. Select saved candidate runs from one scenario. Packet order is randomized and source metadata is held in a separate key.'));
    const catalog = this.getIteration()?.catalog;
    if (catalog) section.append(select('Packet scenario', this.scenarioID, catalog.scenarios.map(item => [item.id, item.name]), value => { this.scenarioID = value; }));
    const runs = disclosure(`Select saved local runs (${this.runIDs.size} selected)`, false);
    if (!this.runs.length) runs.append(el('p', 'muted small', this.local ? 'No saved runs are available yet.' : 'Start the local runner to prepare packets from its saved executions.'));
    for (const run of this.runs.slice(0, 40)) {
      const id = run.id || run.run_id;
      runs.append(check(`${run.name || id} · ${run.status || 'saved'} · ${id}`, this.runIDs.has(id), selected => {
        if (selected) this.runIDs.add(id); else this.runIDs.delete(id);
        prepare.disabled = !this.local || this.working || !this.runIDs.size;
        runs.querySelector('summary').textContent = `Select saved local runs (${this.runIDs.size} selected)`;
      }));
    }
    const actions = el('div', 'scorecard-actions');
    const refresh = button('Refresh runs', () => this.refreshRuns()); refresh.disabled = !this.local;
    const prepare = button('Prepare assessment set', () => this.prepare(), 'primary'); prepare.disabled = !this.local || this.working || !this.runIDs.size;
    actions.append(refresh, prepare); section.append(runs, actions);
    if (this.prepared) {
      section.append(el('p', 'small', `${this.prepared.packets.length} opaque packets prepared. Transfer only the public packet bundle to the reviewer.`));
      const exports = el('div', 'scorecard-actions');
      exports.append(button('Export opaque packet bundle', () => downloadJSON({schema_version: 1, kind: 'blind_packet_bundle', packets: this.prepared.packets, settings: this.prepared.settings, settings_hash: this.prepared.settings_hash}, 'opaque-assessment-packets.json')),
        button('Export private assignment key', () => downloadJSON(this.prepared.private_mapping, 'private-assignment-key.json')));
      section.append(exports);
    }
    return section;
  }

  /** @returns {HTMLElement} Require frozen imports before offering the private-key reveal action. */
  reviewControls() {
    const section = el('section', 'panel'); section.append(el('h2', '', '2. Collect frozen reviews'));
    section.append(el('p', 'small muted', `${this.records.length} verified frozen scorecard${this.records.length === 1 ? '' : 's'} loaded. Incomplete reviews retain unknown outcomes.`));
    const input = fileInput(event => this.importRecords(event)), mapping = fileInput(event => this.unblind(event));
    const actions = el('div', 'scorecard-actions');
    const importButton = button('Import frozen scorecards', () => input.click()); importButton.disabled = Boolean(this.reveal);
    const exportButton = button('Export frozen scorecard set', () => downloadJSON({schema_version: 1, kind: 'frozen_scorecard_bundle', records: this.records}, 'frozen-scorecards.json'));
    exportButton.disabled = !this.records.length;
    const reveal = button('Import key and reveal assignments', () => mapping.click(), 'primary');
    reveal.disabled = !this.local || this.working || !this.records.length || Boolean(this.reveal);
    const local = button('Load local frozen reviews', () => this.loadLocal()); local.disabled = !this.local || Boolean(this.reveal);
    actions.append(importButton, local, exportButton, reveal, input, mapping);
    section.append(actions, el('p', 'small muted', 'Reveal requires the exact packet set and frozen records saved in this runner. Imported records can be inspected anywhere; a clean runner cannot certify that it froze them before disclosure.'));
    if (this.reveal) section.append(el('p', 'mode-note', 'Assignments revealed after the local freeze checks. These reviews cannot be revised for the same packets in this runner.'),
      button('Export revealed comparison record', () => downloadJSON(this.reveal, 'revealed-scorecard-strata.json')));
    if (this.records.length || this.prepared) section.append(button('Start a new assessment set', () => {
      this.records = []; this.reveal = null; this.prepared = null; this.contrast = null; this.selection = {}; this.runIDs.clear(); this.render();
      this.notify('Started a new organizer view. Saved packets, reviews, iterations, and original run journals remain preserved in the local runner.');
    }, 'text-action'));
    return section;
  }

  /** @returns {Promise<void>} Refresh the organizer run list without loading journals into the reviewer. */
  async refreshRuns() {
    try { this.runs = (await fetchJSON('/api/experiments/runs')).runs || []; this.render(); }
    catch (error) { this.notify(`Packet preparation runs unavailable: ${error.message}`, true); }
  }

  /** @returns {Promise<void>} Ask the local store to retain shuffled packets and a separate private assignment manifest. */
  async prepare() {
    this.working = true; this.render();
    try {
      const body = {run_ids: [...this.runIDs], scenario_id: this.scenarioID};
      const iteration = this.getIteration();
      if (iteration) body.settings = structuredClone(iteration.settings);
      // The store resolves each selected run's own preserved iteration; a set may span parent and fork.
      this.prepared = await fetchJSON('/api/experiments/scorecards/packets', body);
      this.notify('Prepared a shuffled opaque assessment set. Export the packet bundle for the reviewer and retain the assignment key separately.');
    } catch (error) { this.notify(`Packets were not prepared: ${error.message}`, true); }
    finally { this.working = false; this.render(); }
  }

  /** @returns {Promise<void>} Load stored frozen records without requesting any private assignment map. */
  async loadLocal() {
    try {
      if (this.reveal) throw new Error('Start a new assessment set before loading another review.');
      const result = await fetchJSON('/api/experiments/scorecards');
      if (!result.records?.length) { this.notify('No frozen reviews are saved in this runner yet.'); return; }
      const allowed = this.prepared ? new Set(this.prepared.packets.map(packet => packet.id)) : null;
      const values = allowed ? result.records.filter(record => allowed.has(record.packet_id)) : result.records;
      const records = await importFrozen({schema_version: 1, kind: 'frozen_scorecard_bundle', records: values});
      this.records = records; this.contrast = null; this.render();
      this.notify(`Loaded ${records.length} frozen review${records.length === 1 ? '' : 's'} without assignment metadata.`);
    } catch (error) { this.notify(`Frozen reviews unavailable: ${error.message}`, true); }
  }

  /** @param {Event} event @returns {Promise<void>} Validate complete portable evidence and reject replacing an existing frozen review. */
  async importRecords(event) {
    try {
      if (this.reveal) throw new Error('Start a new assessment set before importing another review.');
      const records = await importFrozen(await readJSON(event.target.files[0]));
      for (const record of records) {
        const previous = this.records.find(item => item.packet_id === record.packet_id);
        if (previous && previous.record_hash !== record.record_hash) throw new Error('A different frozen review for this packet is already loaded. Preserve the existing record or start a separate set.');
      }
      for (const record of records) if (!this.records.some(item => item.packet_id === record.packet_id)) this.records.push(record);
      this.contrast = null; this.render();
      this.notify(`Imported ${records.length} hash-verified frozen scorecard${records.length === 1 ? '' : 's'}. Assignment metadata remains withheld in the result view.`);
    } catch (error) { this.notify(`Scorecard import failed: ${error.message}`, true); }
    event.target.value = '';
  }

  /** @param {Event} event @returns {Promise<void>} Reveal identities only after server verification of the entire saved frozen set. */
  async unblind(event) {
    this.working = true; this.render();
    try {
      const mapping = await readJSON(event.target.files[0]);
      const record_refs = this.records.map(record => ({packet_id: record.packet_id, record_hash: record.record_hash}));
      this.reveal = await fetchJSON('/api/experiments/scorecards/unblind', {record_refs, mapping});
      this.notify('Frozen reviews verified and assignments revealed. Compare within a scenario or follow the preserved source-run links.');
    } catch (error) { this.notify(`Assignments remain withheld: ${error.message}`, true); }
    finally { this.working = false; this.render(); event.target.value = ''; }
  }

  /** @returns {HTMLElement} Expose matched candidate contrasts only after the reveal step has closed scoring. */
  comparisonControls() {
    const section = el('section', 'panel'); section.append(el('h2', '', '3. Compare after freeze and reveal'));
    if (!this.reveal || this.records.length < 2) {
      section.append(el('p', 'muted small', 'Freeze and reveal at least two candidate packets to compare their modeled outcomes. Scenario, rubric, settings, and model version must match.')); return section;
    }
    const labels = this.records.map(record => {
      const row = this.reveal.rows.find(item => item.packet_id === record.packet_id);
      return [record.id, `${row.scenario_id} · ${row.condition} · ${record.packet_id}`];
    });
    if (!labels.some(([id]) => id === this.baseline)) this.baseline = labels[0][0];
    if (!labels.some(([id]) => id === this.target)) this.target = labels[1][0];
    const fields = el('div', 'two-columns');
    fields.append(select('Baseline candidate', this.baseline, labels, value => { this.baseline = value; this.contrast = null; this.render(); }),
      select('Target candidate', this.target, labels, value => { this.target = value; this.contrast = null; this.render(); }));
    const compare = button('Compare frozen candidates', () => this.compare(), 'primary'); compare.disabled = this.working || this.baseline === this.target || !this.local;
    section.append(fields, compare);
    if (this.contrast) { const result = el('div'); renderScorecardContrast(result, this.contrast); section.append(result, button('Export conditional contrast', () => downloadJSON(this.contrast, 'conditional-scorecard-contrast.json'))); }
    return section;
  }

  /** @returns {Promise<void>} Compare preserved samples under exactly matched assumptions and task strata. */
  async compare() {
    this.working = true; this.render();
    try {
      this.contrast = await fetchJSON('/api/experiments/scorecards/compare', {baseline: this.records.find(item => item.id === this.baseline), target: this.records.find(item => item.id === this.target)});
      this.notify('Compared frozen candidate evidence under shared person and context draws; the result is a conditional model contrast.');
    } catch (error) { this.contrast = null; this.notify(`Comparison unavailable: ${error.message}`, true); }
    finally { this.working = false; this.render(); }
  }
}

/** @param {Function} action @returns {HTMLInputElement} Bind a bounded explicit JSON import. */
function fileInput(action) {
  const input = el('input'); input.type = 'file'; input.accept = 'application/json,.json'; input.hidden = true;
  input.addEventListener('change', action); return input;
}
