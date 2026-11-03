/** Show saved experiment checkpoints without treating elapsed time or outcome quality as completion. */
import {el} from '../experiments/dom.js';
const SOURCE = '/agentic-le/dynamic/study/progress.json';
const LIMITS = {initial: {frozen: 4, observed: 12, reviewed: 16}, update: {frozen: 1, observed: 3, reviewed: 4}};
const LABELS = {frozen: 'Frozen designs', observed: 'Deployment test records', reviewed: 'Accepted expert reviews'};
const STATUS = {pending: 'Pending', in_progress: 'In progress', complete: 'Complete'};

/** @param {unknown} value @returns {object} Check bounded checkpoint counts and explicit saved-status labels. */
export function validateProgress(value) {
  if (!value || value.schema_version !== 'dynamic-flower-progress-1') throw new Error('Unrecognized progress snapshot.');
  if (typeof value.updated_at !== 'string' || !Number.isFinite(Date.parse(value.updated_at))) throw new Error('A valid snapshot timestamp is required.');
  for (const [phase, limits] of Object.entries(LIMITS)) {
    for (const [key, max] of Object.entries(limits)) {
      const count = value[phase]?.[key];
      if (!Number.isInteger(count) || count < 0 || count > max) throw new Error(`Invalid ${phase} ${key} count.`);
    }
    if (value[phase].observed > value[phase].frozen * 3 || value[phase].reviewed > value[phase].frozen * 4) throw new Error('Test and review counts exceed the available frozen designs.');
  }
  for (const stage of ['paper', 'site']) {
    if (!Object.hasOwn(STATUS, value[stage]?.status) || typeof value[stage]?.detail !== 'string' || value[stage].detail.length > 600) throw new Error(`Invalid ${stage} status.`);
  }
  if (value.estimate !== undefined && (typeof value.estimate !== 'string' || value.estimate.length > 600)) throw new Error('The working estimate must be brief text.');
  return value;
}

function phaseProgress(phase, title, counts) {
  const limits = LIMITS[phase];
  const total = Object.values(limits).reduce((sum, count) => sum + count, 0);
  const done = Object.keys(limits).reduce((sum, key) => sum + counts[key], 0);
  const section = el('section', 'checkpoint-phase');
  const row = el('div', 'progress-heading');
  const heading = el('h3', '', title); heading.id = `${phase}-progress-label`;
  row.append(heading, el('strong', 'checkpoint-total', `${done} / ${total} · ${Math.round(done / total * 100)}%`));
  const bar = el('progress'); bar.max = total; bar.value = done;
  bar.setAttribute('aria-labelledby', heading.id);
  bar.setAttribute('aria-valuetext', `${done} of ${total} checkpoints complete`);
  bar.textContent = `${done} of ${total} checkpoints complete`;
  const list = el('ul', 'checkpoint-counts');
  for (const [key, maximum] of Object.entries(limits)) {
    const label = phase === 'update' && key === 'frozen' ? 'Updated design' : LABELS[key];
    list.append(el('li', '', `${label}: ${counts[key]} / ${maximum}`));
  }
  section.append(row, bar, list); return section;
}

function renderProgress(value, container) {
  const stamp = el('p', 'muted', 'Saved snapshot · ');
  const time = el('time', '', new Date(value.updated_at).toLocaleString('en-GB', {dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC'}) + ' UTC');
  time.dateTime = value.updated_at; stamp.append(time);
  const stages = el('div', 'checkpoint-stages');
  stages.append(phaseProgress('initial', 'Initial comparison', value.initial), phaseProgress('update', 'User-update demonstration', value.update));
  const publishing = el('dl', 'publishing-progress');
  for (const [key, label] of [['paper', 'Paper refresh'], ['site', 'Results on the website']]) {
    const row = el('div'); row.append(el('dt', '', `${label} · ${STATUS[value[key].status]}`), el('dd', '', value[key].detail)); publishing.append(row);
  }
  const explanation = el('p', 'muted', 'These bars count recorded work, not elapsed time or successful outcomes. A retained failed or unavailable deployment test still completes an evidence checkpoint. Browser checks concern interface behavior; expert reviews assess process and result and can retain unknown evidence.');
  container.replaceChildren(stamp, stages, publishing, explanation);
  if (value.estimate) container.append(el('p', 'progress-estimate', value.estimate));
}

async function refreshProgress() {
  const trigger = document.getElementById('refresh-study-progress');
  const note = document.getElementById('study-progress-status');
  trigger.disabled = true; note.textContent = 'Checking the latest saved snapshot…';
  try {
    const response = await fetch(SOURCE, {credentials: 'omit', cache: 'no-store'});
    if (!response.ok) throw new Error(`The saved snapshot returned HTTP ${response.status}.`);
    const raw = await response.text();
    if (raw.length > 65536) throw new Error('The progress snapshot exceeds its size limit.');
    const value = validateProgress(JSON.parse(raw));
    renderProgress(value, document.getElementById('study-progress-content'));
    note.textContent = 'Latest published snapshot loaded. Refresh checks for a newer saved status; it does not start experiments.';
  } catch (error) {
    note.textContent = `Progress could not be refreshed: ${error.message} Any snapshot below remains the last one loaded.`;
  } finally { trigger.disabled = false; }
}

if (typeof document !== 'undefined' && document.getElementById('study-progress')) {
  document.getElementById('refresh-study-progress').addEventListener('click', refreshProgress);
  refreshProgress();
}
