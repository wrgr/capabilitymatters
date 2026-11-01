/** Display three outcome distributions and joint requirements while retaining modeled and empirical evidence distinctions. */
import {el, button, disclosure, jsonBlock, select} from './dom.js';
import {AXES, AXIS_LABELS} from './scorecard-settings.js';
import {scenarioGroups} from './scorecard-model.js';

/** @param {number|null|undefined} value @returns {string} Format only finite probabilities as percentages. */
export function percent(value) { return Number.isFinite(value) ? `${(100 * value).toFixed(1)}%` : 'Unavailable'; }

/** @param {number|null|undefined} value @returns {string} Preserve unavailable estimates instead of coercing them to zero. */
function points(value) { return Number.isFinite(value) ? value.toFixed(1) : 'Unavailable'; }

/** @param {HTMLElement} root @param {object[]} records @param {object|null} reveal @param {object} selection @param {Function} rerender @param {Function} replay @returns {void} Keep distinct tasks visible as separate strata with opaque candidate labels until reveal. */
export function renderScorecards(root, records, reveal, selection, rerender, replay) {
  root.replaceChildren();
  if (!records.length) {
    root.append(el('div', 'scorecard-empty'));
    root.firstChild.append(el('h3', '', 'Awaiting frozen evidence'), el('p', 'muted', 'Import independently reviewed, frozen scorecards. No probabilities are shown until evidence has been rated and the assumptions are pinned.'));
    return;
  }
  const groups = scenarioGroups(records);
  root.append(select('Scenario results', selection.scenario || 'all', [['all', 'All scenarios, shown separately'], ...groups.map(group => [group.id, group.id])], value => { selection.scenario = value; rerender(); }));
  for (const group of groups.filter(item => !selection.scenario || selection.scenario === 'all' || item.id === selection.scenario)) {
    const section = el('section', 'panel scenario-scorecards'); section.dataset.scenario = group.id;
    section.append(el('h2', '', group.id), el('p', 'small muted', `${group.records.length} frozen review${group.records.length === 1 ? '' : 's'} in this scenario. Scenario outcomes are not pooled.`));
    const selected = group.records.find(record => record.packet_id === selection[group.id]) || group.records[0];
    section.append(select(`Candidate in ${group.id}`, selected.packet_id, group.records.map(record => [record.packet_id, record.packet_id]), value => { selection[group.id] = value; rerender(); }));
    const row = reveal?.rows?.find(item => item.packet_id === selected.packet_id);
    if (row) section.append(revealedIdentity(row, replay));
    section.append(candidateResult(selected)); root.append(section);
  }
  if (reveal) root.append(strataTable(reveal.strata));
}

/** @param {object} record @returns {HTMLElement} Show modeled uncertainty and sample sizes for one frozen candidate. */
function candidateResult(record) {
  const section = el('div'), result = record.assessment;
  const counts = el('div', 'scorecard-counts');
  counts.append(el('span', '', '1 opaque candidate packet'), el('span', '', `${result.modeled_draws.toLocaleString()} Monte Carlo draws`),
    el('span', '', `${result.modeled_cohort_size.toLocaleString()} simulated people per draw`), el('span', '', '0 observed human participants'));
  section.append(counts, el('p', 'mode-note', 'Uncalibrated conditional model. Human flourishing means task-level support; learning means design and evidence support. Increasing simulated draws does not create independent evidence.'));
  if (result.status === 'incomplete') {
    section.append(el('h3', '', 'Score unavailable: incomplete evidence'), el('p', 'small', `Unknown criteria: ${(result.missing_criteria || []).join(', ')}. No failure or success probability has been assigned.`));
  } else {
    const axes = el('div', 'scorecard-axes');
    AXES.forEach(axis => axes.append(axisCard(axis, result.axes[axis])));
    section.append(axes, jointCard(result.joint));
  }
  const provenance = disclosure('Frozen assumptions, review, and content hashes');
  provenance.append(el('p', 'fingerprint', `Record ${record.record_hash}\nPacket ${record.packet_hash}`), jsonBlock({settings: record.settings, review: record.review, model_hash: result.model_hash}));
  section.append(provenance, el('p', 'scorecard-footer', 'Bands show the modeled 5th–95th percentile interval. They are not confidence intervals for human outcomes. Content hashes verify consistency, not truth or assessor independence.'));
  return section;
}

/** @param {string} axis @param {object} value @returns {HTMLElement} Display one unpooled index distribution, criterion gate, and pass probability. */
function axisCard(axis, value) {
  const card = el('section', 'scorecard-axis'); card.dataset.axis = axis;
  card.append(el('h3', '', AXIS_LABELS[axis]));
  if (axis === 'human_flourishing') card.append(el('p', 'muted small', 'Task-level flourishing support'));
  const mean = el('p', 'axis-value', points(value.mean)); mean.append(el('span', '', ' / 100 modeled mean'));
  card.append(mean, interval(value), el('p', 'muted', `5th–95th percentile: ${points(value.q05)}–${points(value.q95)}`));
  card.append(el('p', '', `${percent(value.p_meets_threshold)} probability of meeting ≥ ${points(value.threshold)} and every criterion floor`), probabilityBar(value.p_meets_threshold));
  const metrics = el('dl', 'outcome-metrics');
  for (const [label, text] of [['Criterion-floor failure', percent(value.p_gate_failure)], ['Mean individual pass fraction', percent(value.person_pass_probability)], ['Monte Carlo standard error', `${(value.mc_standard_error * 100).toFixed(2)} percentage points`]]) metrics.append(el('dt', '', label), el('dd', '', text));
  card.append(metrics);
  return card;
}

/** @param {object} value @returns {HTMLElement} Draw a bounded index interval with an accessible textual equivalent nearby. */
function interval(value) {
  const track = el('div', 'interval-track'); track.setAttribute('aria-hidden', 'true');
  const band = el('span', 'interval-band'), median = el('span', 'interval-median');
  band.style.left = `${Math.max(0, Math.min(100, value.q05))}%`;
  band.style.width = `${Math.max(0, Math.min(100, value.q95) - value.q05)}%`;
  median.style.left = `${Math.max(0, Math.min(100, value.q50))}%`;
  track.append(band, median); return track;
}

/** @param {number} value @returns {HTMLElement} Draw a probability without replacing its explicit textual label. */
function probabilityBar(value) {
  const track = el('div', 'probability-track'); track.setAttribute('aria-hidden', 'true');
  const fill = el('span'); fill.style.width = `${Math.max(0, Math.min(1, value)) * 100}%`; track.append(fill); return track;
}

/** @param {object} value @returns {HTMLElement} Require all three axes and essential criteria in the same modeled draw. */
function jointCard(value) {
  const card = el('section', 'joint-card');
  card.append(el('h3', '', 'All three requirements together'), el('strong', '', percent(value.p_all_axes)),
    el('p', '', 'Probability that every cohort-mean threshold and its criterion floors are met in the same modeled draw. No weighted total can compensate for an unmet axis.'),
    el('p', 'small', `Mean simulated individual joint pass fraction: ${percent(value.person_probability)}. Numerical Monte Carlo standard error: ${(value.mc_standard_error * 100).toFixed(2)} percentage points.`));
  return card;
}

/** @param {object} row @param {Function} replay @returns {HTMLElement} Reveal trace links only after the server accepts the frozen review set and private mapping. */
function revealedIdentity(row, replay) {
  const section = el('div', 'unblind-identity');
  section.append(el('p', '', `Revealed after freeze · ${row.condition} · iteration ${row.iteration} · run ${row.run_id}`),
    el('p', 'fingerprint', `Original run head: ${row.run_head_hash}\nArtifact: ${row.artifact_hash}`),
    button('Replay source run', () => replay(row.run_id), 'text-action'));
  return section;
}

/** @param {object[]} strata @returns {HTMLElement} Report actual generated-candidate spread separately from modeled-person variation. */
function strataTable(strata) {
  const section = el('section', 'panel'); section.append(el('h2', '', 'Observed spread across generated candidates'));
  section.append(el('p', 'small muted', 'Each row retains its scenario, condition, and iteration. Candidate counts and spread use complete reviews; incomplete reviews remain in the review count. Repeated reviews of one artifact do not create new candidates. This describes generated artifacts, not human or team population variance.'));
  const wrapper = el('div', 'table-scroll'), table = el('table'), head = el('tr');
  wrapper.tabIndex = 0; wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', 'Candidate spread by scenario, condition, and iteration');
  ['Scenario / condition / iteration', 'Frozen / complete reviews', 'Distinct scored candidates', ...AXES.map(axis => `${AXIS_LABELS[axis]} mean / candidate SD`)].forEach(title => head.append(el('th', '', title)));
  const thead = el('thead'); thead.append(head); table.append(thead);
  const tbody = el('tbody');
  for (const row of strata) {
    const tr = el('tr'); tr.append(el('th', '', `${row.scenario_id} / ${row.condition} / ${row.iteration}`), el('td', '', `${row.frozen_review_count} / ${row.complete_review_count}`), el('td', '', String(row.distinct_generated_candidates)));
    for (const axis of AXES) tr.append(el('td', '', `${points(row.axes[axis].candidate_mean)} / ${points(row.axes[axis].between_candidate_sd)}`));
    tbody.append(tr);
  }
  table.append(tbody); wrapper.append(table); section.append(wrapper); return section;
}

/** @param {HTMLElement} root @param {object} result @returns {void} Display a within-scenario model contrast with no causal or significance interpretation. */
export function renderScorecardContrast(root, result) {
  root.replaceChildren(el('h3', '', 'Conditional candidate contrast'), el('p', 'small muted', result.pairing));
  if (result.status !== 'complete') { root.append(el('p', 'mode-note', 'Contrast unavailable because one or both frozen reviews are incomplete.')); return; }
  const cards = el('div', 'scorecard-axes');
  for (const axis of AXES) {
    const value = result.axes[axis], card = el('section', 'scorecard-axis');
    card.append(el('h3', '', AXIS_LABELS[axis]), el('p', 'axis-value', `${value.mean >= 0 ? '+' : ''}${points(value.mean)}`),
      el('p', 'small', `Target minus baseline · modeled interval ${points(value.q05)} to ${points(value.q95)} points`),
      el('p', 'small', `Gain > ${value.meaningful_difference} points: ${percent(value.p_meaningful_gain)}`),
      el('p', 'small', `Within ±${value.meaningful_difference}: ${percent(value.p_within_margin)} · loss: ${percent(value.p_meaningful_loss)}`),
      el('p', 'small', `Gain and target passes: ${percent(value.p_gain_and_pass)} · criterion-gate regression: ${percent(value.p_gate_regression)}`));
    cards.append(card);
  }
  root.append(cards, el('p', 'small', `Change in probability of meeting all requirements: ${(100 * result.joint_probability_difference).toFixed(1)} percentage points.`), el('p', 'mode-note', result.interpretation));
}
