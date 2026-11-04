/** Coordinate explicit scenario selection and immutable iteration forks around the editable study configuration. */
import {el, button, field, select, disclosure, downloadJSON, readJSON} from './dom.js';
import {fetchJSON} from './remote.js';
import {applyScenario, iterationMatches, verifyIteration} from './iteration-model.js';
import {defaultAssumptions, renderAssumptions, AXIS_LABELS} from './scorecard-settings.js';

export class IterationWorkspace {
  /** @param {object} options Configure callbacks without taking ownership of the experiment model. */
  constructor(options) {
    Object.assign(this, options);
    this.catalog = null; this.reference = null; this.snapshot = null;
    this.settings = defaultAssumptions(); this.selected = 'feedback-conversation';
    this.plan = 'comparison'; this.note = 'Initial study configuration and probability assumptions.';
    this.saving = false; this.saved = []; this.persisted = false;
  }

  /** @returns {Promise<void>} Load the same three fixed scenario strata used by the backend. */
  async init() {
    this.catalog = await fetchJSON(this.local ? '/api/experiments/scenarios' : './scenario-catalog.json');
    this.render();
    if (this.local) await this.refresh();
  }

  /** @returns {object} Capture the current prospective study inputs while preserving the original snapshot. */
  state() {
    const current = this.getState();
    return {config: structuredClone(current.config), comparison: this.plan === 'comparison' ? structuredClone(current.comparison) : null,
      scenario_reference: structuredClone(this.reference), scorecard_assumptions: structuredClone(this.settings)};
  }

  /** @returns {void} Update dirty state without rebuilding focused configuration controls. */
  changed() {
    if (!this.status) return;
    const matching = iterationMatches(this.snapshot, this.state());
    this.status.classList.toggle('dirty', Boolean(this.snapshot) && !matching);
    this.status.textContent = !this.snapshot ? 'Working configuration. Save an iteration to bind new runs to a preserved study record.'
      : matching ? `${this.snapshot.iteration_id} · inputs match the preserved snapshot${this.persisted ? '' : ' · imported; not confirmed in this runner'}`
        : `${this.snapshot.iteration_id} · working copy changed. Fork a new iteration to bind these edits to fresh evidence.`;
  }

  /** @param {object} config @param {object|null} comparison @returns {object} Attach only a locally persisted snapshot matching the actual execution. */
  executionRef(config, comparison = null) {
    const state = {...this.state(), config, comparison};
    return this.persisted && iterationMatches(this.snapshot, state) ? {iteration_id: this.snapshot.iteration_id} : {};
  }

  /** @returns {void} Render separate case, uncertainty, and iteration editors. */
  render() {
    this.renderScenario(); this.renderIteration();
    renderAssumptions(this.assumptionsRoot, this.settings, () => this.changed());
  }

  /** @returns {void} Explain each task before the user explicitly replaces the case inputs. */
  renderScenario() {
    const root = this.scenarioRoot;
    root.replaceChildren(el('h2', '', 'Scenario'));
    const controls = el('div', 'study-controls');
    controls.append(select('Scenario preset', this.selected, this.catalog.scenarios.map(item => [item.id, item.name]), value => {
      this.selected = value; this.renderScenario();
    }), button('Apply scenario', () => this.apply(), 'primary'));
    const scenario = this.catalog.scenarios.find(item => item.id === this.selected);
    root.append(controls, el('p', 'muted small', scenario.description));
    const details = disclosure('Task targets, evidence anchors, and hypothetical population');
    details.append(el('p', 'small', scenario.learner_target), el('p', 'small', scenario.system_task));
    for (const [axis, anchors] of Object.entries(scenario.evidence_anchors)) {
      details.append(el('h3', '', AXIS_LABELS[axis]));
      const list = el('ul', 'small'); anchors.forEach(text => list.append(el('li', '', text))); details.append(list);
    }
    details.append(populationTable(scenario.population_profiles));
    root.append(details, el('p', 'small muted', this.reference
      ? `Applied source: ${this.reference.scenario_id} · version ${this.reference.scenario_version}. Case edits remain visible in the iteration snapshot.`
      : 'The current case is custom until you apply a preset. Applying a scenario preserves the team, model, call schedule, and comparison design.'));
  }

  /** @returns {Promise<void>} Apply a scenario with an exact stale-configuration guard. */
  async apply() {
    const config = this.getState().config, serialized = JSON.stringify(config);
    try {
      const result = this.local ? await fetchJSON('/api/experiments/scenarios/apply', {config, scenario_id: this.selected})
        : await applyScenario(config, this.catalog, this.selected, this.getBaseline ? this.getBaseline() : this.baseline);
      if (JSON.stringify(this.getState().config) !== serialized) throw new Error('Configuration changed while the scenario was loading. Apply it again.');
      this.reference = result.scenario_reference;
      this.settings.thresholds = structuredClone(this.catalog.scenarios.find(item => item.id === this.selected).axis_targets);
      this.applyState({config: result.config}); this.render();
      this.notify(`Applied ${this.selected}. Inspect its threshold and population assumptions before saving an iteration.`);
    } catch (error) { this.notify(`Scenario could not be applied: ${error.message}`, true); }
  }

  /** @returns {void} Preserve a named parent while making each save a new immutable iteration. */
  renderIteration() {
    const root = this.iterationRoot;
    root.replaceChildren(el('h2', '', 'Preserve an iteration'));
    this.status = el('p', 'iteration-status'); root.append(this.status);
    const fields = el('div', 'iteration-grid');
    fields.append(select('Iteration execution plan', this.plan, [['comparison', 'Configured comparison'], ['single', 'One run']], value => { this.plan = value; this.changed(); }),
      field('Change note', this.note, value => { this.note = value; }, {multiline: true, rows: 2, maxLength: 3000, help: 'Explain what changed and the outcome you expect to test.'}));
    const actions = el('div', 'scorecard-actions');
    const save = button(this.snapshot ? 'Fork iteration' : 'Save iteration', () => this.save(), 'primary');
    save.disabled = !this.local || this.saving;
    const exportButton = button('Export iteration', () => downloadJSON(this.snapshot, `${this.snapshot.iteration_id}.json`));
    exportButton.disabled = !this.snapshot;
    const input = el('input'); input.type = 'file'; input.accept = 'application/json,.json'; input.hidden = true;
    input.addEventListener('change', event => this.importSnapshot(event));
    actions.append(save, exportButton, button('Import iteration', () => input.click()), input);
    root.append(fields, actions, el('p', 'muted small', 'Forking preserves the parent, its hashes, and earlier evidence. Changed configurations or assumptions need a new snapshot before new executions can carry its iteration ID.'));
    if (!this.local) root.append(el('p', 'mode-note', 'The local runner saves immutable iterations. You can configure and export the working configuration here.'));
    this.renderSaved(root); this.changed();
  }

  /** @param {HTMLElement} root @returns {void} Offer locally preserved snapshots without altering their evidence. */
  renderSaved(root) {
    if (!this.saved.length) return;
    const details = disclosure('Load a saved iteration');
    for (const item of this.saved.slice(0, 12)) details.append(button(`${item.iteration_id} · ${item.change_note}`, async () => {
      try { await this.load(await fetchJSON(`/api/experiments/iterations/${encodeURIComponent(item.iteration_id)}`), true); }
      catch (error) { this.notify(`Iteration could not be loaded: ${error.message}`, true); }
    }, 'saved-run'));
    root.append(details);
  }

  /** @returns {Promise<void>} Save a complete immutable child, retaining the original parent record. */
  async save() {
    this.saving = true; this.renderIteration();
    try {
      const body = {...this.state(), change_note: this.note};
      if (this.snapshot) Object.assign(body, {parent_iteration_id: this.snapshot.iteration_id, parent_hash: this.snapshot.content_hash});
      const snapshot = await fetchJSON('/api/experiments/iterations', body);
      this.snapshot = await verifyIteration(snapshot); this.persisted = true; this.note = '';
      await this.refresh();
      this.notify(`Saved ${snapshot.iteration_id}${snapshot.parent_iteration_id ? ` as a fork of ${snapshot.parent_iteration_id}` : ''}. Its evidence and configuration are preserved.`);
    } catch (error) { this.notify(`Iteration was not saved: ${error.message}`, true); }
    finally { this.saving = false; this.renderIteration(); }
  }

  /** @returns {Promise<void>} Refresh the local immutable snapshot index. */
  async refresh() {
    try { this.saved = (await fetchJSON('/api/experiments/iterations')).iterations; this.renderIteration(); }
    catch (error) { this.notify(`Saved iterations unavailable: ${error.message}`, true); }
  }

  /** @param {Event} event @returns {Promise<void>} Import a verified snapshot as a new editable working copy. */
  async importSnapshot(event) {
    try { await this.load(await readJSON(event.target.files[0]), false); }
    catch (error) { this.notify(`Iteration import failed: ${error.message}`, true); }
    event.target.value = '';
  }

  /** @param {object} value @param {boolean} persisted @returns {Promise<void>} Restore pinned inputs without overwriting the saved record. */
  async load(value, persisted) {
    const snapshot = await verifyIteration(value);
    this.snapshot = snapshot; this.persisted = persisted; this.reference = structuredClone(snapshot.scenario_reference);
    this.settings = structuredClone(snapshot.scorecard_assumptions); this.plan = snapshot.comparison ? 'comparison' : 'single';
    if (this.reference) this.selected = this.reference.scenario_id;
    this.note = ''; this.applyState({config: snapshot.config, comparison: snapshot.comparison}); this.render();
    this.notify(`Loaded ${snapshot.iteration_id}. Any revision will be a new fork.`);
  }
}

/** @param {object[]} profiles @returns {HTMLElement} Show authored person and context variation without implying observed participant counts. */
function populationTable(profiles) {
  const section = el('div');
  section.append(el('h3', '', 'Hypothetical population mixture'), el('p', 'muted small', 'Weights and index shifts are editable study assumptions in the scenario catalog, not demographic prevalence or observed effects.'));
  for (const profile of profiles) section.append(el('p', 'small', `${profile.label} · ${(profile.weight * 100).toFixed(0)}% assumed weight. ${profile.rationale}`));
  return section;
}
