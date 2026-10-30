/** Present exact recorded events with navigable evidence references and inspectable prompts. */
import {el, button, disclosure, jsonBlock} from './dom.js';
import {stageLabels} from '../replay/stage-labels.js';

/** @param {HTMLElement} root @param {object} run @param {object} event @param {Function} seek @returns {void} Render one original event and its source links. */
export function renderEvent(root, run, event, seek) {
  root.replaceChildren();
  const payload = event.payload;
  const name = run.roster?.[event.agent]?.name || event.agent;
  root.append(el('div', 'eyebrow', `Event ${event.seq} · ${stageLabels[event.stage] || event.stage} · ${event.kind.replaceAll('_', ' ')}`),
    el('h3', '', name), el('p', 'fingerprint', `Event SHA-256: ${event.hash}`));
  if (payload.hypothetical) root.append(el('p', 'mode-note', 'Hypothetical challenge. This is not an observed external event.'));
  if (payload.response) root.append(responseView(payload.response, seek));
  else if (payload.prompt) {
    root.append(el('p', 'muted', 'This is the exact prompt sent for the selected contribution.'), el('pre', 'prompt', payload.prompt));
  } else {
    const message = payload.description || payload.message || payload.claim || payload.note || payload.status;
    if (message) root.append(el('p', 'record-text', String(message)));
  }
  const request = run.events.find(item => item.seq === payload.request_seq && item.kind === 'request' && item.seq < event.seq);
  if (request) {
    const prompt = disclosure('Exact prompt and request');
    prompt.append(button(`Go to request #${request.seq}`, () => seek(request.seq), 'text-action'), el('pre', 'prompt', request.payload.prompt || 'No prompt recorded.'));
    root.append(prompt);
  }
  if (payload.provider) {
    const provider = disclosure('Provider record');
    provider.append(jsonBlock(payload.provider));
    root.append(provider);
  }
  const original = disclosure('Original event JSON');
  original.append(jsonBlock(event));
  root.append(original);
}

/** @param {object} response @param {Function} seek @returns {HTMLElement} Render public deliberation without inventing interpretation. */
function responseView(response, seek) {
  const wrapper = el('div');
  wrapper.append(el('p', 'record-text', response.message || ''));
  if (response.decision) wrapper.append(el('h4', '', 'Recorded decision or next step'), el('p', 'record-text', response.decision));
  if (response.evidence_refs?.length) {
    const links = el('div', 'evidence-links');
    links.append(el('span', 'muted small', 'Earlier evidence:'));
    for (const seq of response.evidence_refs) links.append(button(`#${seq}`, () => seek(seq), 'text-action'));
    wrapper.append(links);
  }
  const perspectives = disclosure('Contributions, tensions, and intended results');
  const labels = {advantages: 'Advantages', drawbacks: 'Drawbacks', tradeoffs: 'Tradeoffs', risks: 'Risks',
    human_capabilities: 'Human capability', system_capabilities: 'System capability', flourishing: 'Human flourishing', objections: 'Objections'};
  for (const [key, title] of Object.entries(labels)) {
    if (!response[key]?.length) continue;
    perspectives.append(el('h4', '', title));
    const list = el('ul');
    for (const item of response[key]) list.append(el('li', '', item));
    perspectives.append(list);
  }
  wrapper.append(perspectives);
  return wrapper;
}

/** @param {HTMLElement} root @param {object} state @param {object} run @param {Function} seek @param {string} filter @returns {void} Show only events reached by the current replay position. */
export function renderTimeline(root, state, run, seek, filter = 'all') {
  root.replaceChildren();
  for (const event of state.events.filter(item => filter === 'all' || item.agent === filter).slice(-120)) {
    const name = run.roster?.[event.agent]?.name || event.agent;
    const node = button('', () => seek(event.seq), 'timeline-event');
    node.classList.toggle('selected', event.seq === state.position);
    if (event.seq === state.position) node.setAttribute('aria-current', 'step');
    node.append(el('span', 'event-number', `#${event.seq}`), el('span', '', `${name} · ${event.kind.replaceAll('_', ' ')}`),
      el('small', 'muted', stageLabels[event.stage] || event.stage));
    root.append(node);
  }
  if (!root.children.length) root.append(el('p', 'muted', 'No events from this contributor at this position.'));
}
