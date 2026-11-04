/** Control temporal playback of verified run records without executing new agents. */
import {jsonBlock} from './dom.js';
import {verifyExperimentRun, replayAt, runStatus, isFixture, replayActors} from './replay-model.js';
import {renderEvent, renderTimeline} from './event-view.js';
import {renderArtifacts} from './artifact-view.js';
import {stageLabels} from '../replay/stage-labels.js';
import {renderOutcomes} from './outcome-view.js';

/** Control one verified journal and its replay position. */
export class RunView {
  /** @param {Function} notify Initialize existing replay controls. */
  constructor(notify) {
    this.run = null;
    this.position = 1;
    this.follow = true;
    this.timer = null;
    this.notify = notify;
    this.filter = 'all';
    this.loadVersion = 0;
    this.bindControls();
  }

  /** @returns {void} Connect transport actions to saved state only. */
  bindControls() {
    const action = (id, callback) => document.getElementById(id).addEventListener('click', callback);
    action('replay-first', () => this.seek(1));
    action('replay-previous', () => this.seek(this.position - 1));
    action('replay-next', () => this.seek(this.position + 1));
    action('replay-last', () => { this.follow = true; this.seek(this.run?.events.length || 1, true); });
    action('replay-play', () => this.togglePlay());
    document.getElementById('replay-range').addEventListener('input', event => this.seek(Number(event.target.value)));
    document.getElementById('replay-speed').addEventListener('change', () => { if (this.timer) { this.stop(); this.togglePlay(); } });
    document.getElementById('replay-filter').addEventListener('change', event => { this.filter = event.target.value; this.render(); });
    action('event-link', () => this.copyLink());
  }

  /** @param {object} run @param {object} [options] @returns {Promise<void>} Accept a checked journal and preserve manual playback during polling. */
  async setRun(run, options = {}) {
    const version = ++this.loadVersion;
    await verifyExperimentRun(run);
    if (version !== this.loadVersion) return;
    const changed = this.run?.id !== run.id || options.reset;
    this.run = run;
    if (changed) {
      this.stop();
      this.follow = options.follow ?? false;
      this.position = options.position || (this.follow ? run.events.length : 1);
      this.filter = 'all';
      const filter = document.getElementById('replay-filter');
      filter.replaceChildren(new Option('All contributors', 'all'));
      for (const [key, name] of replayActors(run)) filter.add(new Option(name, key));
    } else if (this.follow) this.position = run.events.length;
    document.getElementById('replay-empty').hidden = true;
    document.getElementById('replay-content').hidden = false;
    this.render();
  }

  /** @param {number} sequence @param {boolean} [follow] @returns {void} Move within the saved prefix and expose a stable event URL. */
  seek(sequence, follow = false) {
    if (!this.run) return;
    this.position = Math.max(1, Math.min(sequence, this.run.events.length));
    this.follow = follow;
    this.render();
    const url = new URL(location.href);
    url.searchParams.set('run', this.run.id);
    url.searchParams.set('event', String(this.position));
    history.replaceState(null, '', url);
  }

  /** @returns {void} Replay recorded events on a local timer. */
  togglePlay() {
    if (this.timer) { this.stop(); return; }
    if (!this.run) return;
    if (this.position >= this.run.events.length) this.position = 1;
    this.follow = false;
    document.getElementById('replay-play').textContent = 'Pause';
    this.timer = setInterval(() => {
      if (this.position >= this.run.events.length) this.stop();
      else this.seek(this.position + 1);
    }, Number(document.getElementById('replay-speed').value));
    this.render();
  }

  /** @returns {void} Stop presentation playback without changing a running experiment. */
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    document.getElementById('replay-play').textContent = 'Play';
  }

  /** @returns {Promise<void>} Copy a location referencing the selected original event. */
  async copyLink() {
    if (!this.run) return;
    this.seek(this.position, this.follow);
    try {
      await navigator.clipboard.writeText(location.href);
      this.notify('Event link copied. A local run link works where this journal is available.');
    } catch (error) {
      this.notify(`Copy the address bar to share this event. Clipboard unavailable: ${error.message}`);
    }
  }

  /** @returns {void} Render only the journal state reached by the transport. */
  render() {
    if (!this.run) return;
    const state = replayAt(this.run, this.position);
    this.position = state.position;
    document.getElementById('run-title').textContent = this.run.experiment?.config?.name || this.run.seed?.title || this.run.id;
    document.getElementById('run-status').textContent = `${runStatus(this.run)} · ${this.run.mode} · hash chain verified`;
    document.getElementById('run-evidence-note').textContent = isFixture(this.run)
      ? 'Dry-run fixture: validates the software workflow, not competency effects, human behavior, or learning outcomes.'
      : 'Recorded agent execution: inspect the evidence before interpreting competency effects. Human and learning outcomes remain unobserved.';
    document.getElementById('run-identity').textContent = `${this.run.id} · ${this.run.created_at || ''}`;
    document.getElementById('replay-position').textContent = `${this.position} / ${this.run.events.length}`;
    document.getElementById('replay-stage').textContent = stageLabels[state.selected.stage] || state.selected.stage;
    const range = document.getElementById('replay-range');
    range.max = String(this.run.events.length); range.value = String(this.position);
    range.setAttribute('aria-valuetext', `Event ${this.position} of ${this.run.events.length}`);
    for (const id of ['replay-first', 'replay-previous']) document.getElementById(id).disabled = this.position === 1;
    for (const id of ['replay-next', 'replay-last']) document.getElementById(id).disabled = this.position === this.run.events.length;
    renderTimeline(document.getElementById('event-list'), state, this.run, seq => this.seek(seq), this.filter);
    renderEvent(document.getElementById('event-detail'), this.run, state.selected, seq => this.seek(seq));
    renderArtifacts(document.getElementById('artifact-list'), state, seq => this.seek(seq));
    renderOutcomes(document.getElementById('outcome-assessment'), state, seq => this.seek(seq));
    document.getElementById('pinned-config').replaceChildren(jsonBlock(this.run.experiment || {role_profiles: this.run.role_profiles, seed: this.run.seed}));
    document.getElementById('run-export').disabled = false;
    document.getElementById('use-run-config').disabled = !this.run.experiment?.config;
  }
}
