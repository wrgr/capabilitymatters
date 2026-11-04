/** Render evidence-grounded ratings while keeping assignment and generation identities outside the review surface. */
import {el, button, field, select, disclosure} from './dom.js';
import {AXES} from './scorecard-settings.js';
import {createCandidatePreview} from './artifact-view.js';

/** @param {HTMLElement} root @param {object} packet @returns {void} Present only the task and opaque packet evidence. */
export function renderPacket(root, packet) {
  root.replaceChildren(el('h2', '', packet.task.title), el('p', 'fingerprint', packet.id));
  root.append(el('p', 'mode-note', packet.evaluation_scope === 'full_solution' ? 'Full-solution review: executable Build, generated stage records, and supplied observations. Proposed repairs receive no implementation credit.' : 'Historical artifact review: executable candidate and supplied observations. This scope stays separate from full-solution reviews.'));
  root.append(el('p', 'record-text', packet.task.brief));
  const constraints = el('ul', 'small');
  for (const text of packet.task.constraints) constraints.append(el('li', '', text));
  root.append(constraints, el('p', 'mode-note', 'Assignment metadata is withheld. Artifact wording can still reveal clues; record suspected disclosure in the review limitations.'));
  const anchors = disclosure('Scenario evidence anchors');
  for (const axis of AXES) {
    anchors.append(el('h3', '', packet.rubric.axes[axis].label));
    const list = el('ul', 'small'); packet.scenario.evidence_anchors[axis].forEach(text => list.append(el('li', '', text))); anchors.append(list);
  }
  root.append(anchors);
  for (const item of packet.evidence) {
    const evidence = disclosure(`${item.id} · ${item.kind}`, item === packet.evidence[0]);
    evidence.dataset.evidence = item.id;
    const source = el('pre', 'record-text blind-evidence-text', item.text);
    source.tabIndex = 0; source.setAttribute('role', 'region'); source.setAttribute('aria-label', `Evidence ${item.id} ${item.kind} text`);
    evidence.append(el('p', 'fingerprint', `Evidence SHA-256: ${item.sha256}`), source);
    if (item.kind === 'generated_plan') evidence.append(el('p', 'small muted', 'Generated design record: treat this as a proposal or rationale. Verify claims against the executable Build and supplied observations; it does not establish a repair or an outcome with people.'));
    if (item.kind === 'artifact') {
      evidence.append(el('p', 'small muted', 'Source inspection is not an executed test. You can explore this artifact in isolation; describe actions you actually try and keep untested behavior uncertain.'), createCandidatePreview(item.text));
    }
    root.append(evidence);
  }
}

/** @param {HTMLElement} root @param {object} review @param {Function} changed @returns {void} Identify the reviewer separately from the hidden generation provider. */
export function renderReviewer(root, review, changed) {
  root.replaceChildren(el('h2', '', 'Reviewer'));
  const grid = el('div', 'two-columns');
  grid.append(field('Reviewer identifier', review.reviewer.id, value => { review.reviewer.id = value; changed(); }),
    select('Reviewer kind', review.reviewer.kind, [['human', 'Human review'], ['model', 'Model review supplied by an assessor']], value => {
      review.reviewer.kind = value;
      if (value === 'human') review.reviewer.model = '';
      renderReviewer(root, review, changed); changed();
    }));
  root.append(grid);
  if (review.reviewer.kind === 'model') root.append(field('Reviewing model and version', review.reviewer.model, value => { review.reviewer.model = value; changed(); }));
  root.append(field('Limitations and possible disclosure (one per line)', review.limitations.join('\n'), value => {
    review.limitations = value.split('\n').map(line => line.trim()).filter(Boolean); changed();
  }, {multiline: true, rows: 3, help: 'Include missing observations, uncertainty about the task, and any identity clues in the evidence.'}));
}

/** @param {HTMLElement} root @param {object} packet @param {object} review @param {Function} changed @returns {void} Build nine anchored ratings that preserve unknown values. */
export function renderRatings(root, packet, review, changed) {
  root.replaceChildren();
  const anchors = disclosure('Shared 0–4 rubric anchors');
  const list = el('dl', 'signature-fields');
  for (const [score, description] of Object.entries(packet.rubric.anchors)) list.append(el('dt', '', score), el('dd', '', typeof description === 'string' ? description : JSON.stringify(description)));
  anchors.append(list); root.append(anchors);
  for (const axis of AXES) {
    const section = el('section', 'rating-axis');
    section.append(el('h2', '', packet.rubric.axes[axis].label));
    if (axis === 'human_flourishing') section.append(el('p', 'muted small', 'Human flourishing support within this task; broader flourishing remains outside the score.'));
    for (const key of packet.rubric.axes[axis].criteria) section.append(ratingEditor(packet, review, key, changed));
    root.append(section);
  }
}

/** @param {object} packet @param {object} review @param {string} key @param {Function} changed @returns {HTMLElement} Require the explanation and quoted evidence for one anchored judgment. */
function ratingEditor(packet, review, key, changed) {
  const criterion = packet.rubric.criteria[key];
  const rating = review.ratings[key];
  const section = disclosure(criterion.label, false);
  section.dataset.criterion = key;
  section.append(el('p', 'small', criterion.description));
  const grid = el('div', 'three-columns');
  const options = [['', 'Unknown / unassessed'], ...Array.from({length: 9}, (_, index) => [String(index / 2), String(index / 2)])];
  for (const [property, label] of [['score', 'Best-supported rating'], ['lower', 'Plausible lower bound'], ['upper', 'Plausible upper bound']]) {
    grid.append(select(`${criterion.label} · ${label}`, rating[property] === null ? '' : String(rating[property]), options, value => {
      rating[property] = value === '' ? null : Number(value); changed();
    }));
  }
  section.append(grid, field(`${criterion.label} · Rationale`, rating.rationale, value => { rating.rationale = value; changed(); }, {multiline: true, rows: 3}));
  const references = el('div', 'evidence-reference-list');
  const redraw = () => renderReferences(references, packet, key, rating, changed, redraw);
  redraw(); section.append(references);
  section.append(button('Add evidence citation', () => {
    rating.evidence_refs.push({evidence_id: packet.evidence[0].id, quote: '', locator: ''}); redraw(); changed();
  }));
  return section;
}

/** @param {HTMLElement} root @param {object} packet @param {string} key @param {object} rating @param {Function} changed @param {Function} redraw @returns {void} Attach exact, bounded quotations to the opaque evidence identifiers. */
function renderReferences(root, packet, key, rating, changed, redraw) {
  root.replaceChildren();
  for (const [index, reference] of rating.evidence_refs.entries()) {
    const card = el('fieldset', 'evidence-reference');
    const title = `${packet.rubric.criteria[key].label} citation ${index + 1}`;
    card.append(el('legend', '', title), select(`${title} · Evidence`, reference.evidence_id, packet.evidence.map(item => [item.id, `${item.id} · ${item.kind}`]), value => {
      reference.evidence_id = value; changed();
    }), field(`${title} · Exact quote`, reference.quote, value => { reference.quote = value; changed(); }, {multiline: true, rows: 3, maxLength: 500}),
    field(`${title} · Location in evidence`, reference.locator, value => { reference.locator = value; changed(); }, {help: 'For example, section heading and paragraph, or a line range.'}),
    button('Remove citation', () => { rating.evidence_refs.splice(index, 1); redraw(); changed(); }, 'text-action'));
    root.append(card);
  }
}
