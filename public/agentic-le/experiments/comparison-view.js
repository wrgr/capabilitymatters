/** Present batch execution records without converting fixture artifacts into research findings. */
import {el, button, disclosure, jsonBlock} from './dom.js';

/** @param {HTMLElement} root @param {object} batch @param {Function} openRun @returns {void} Render preserved comparison runs with direct replay actions. */
export function renderComparison(root, batch, openRun) {
  root.replaceChildren();
  root.append(el('h2', '', 'Four-condition comparison'), el('p', 'muted', `Batch ${batch.batch_id || batch.id} · ${batch.status}`),
    el('p', 'mode-note', 'These are execution records. Interpret competency effects only after reviewing the actual contributions and artifacts; fixture runs do not supply such evidence.'));
  const table = el('table');
  const head = el('tr');
  for (const title of ['Condition', 'Repeat', 'Status', 'Record']) head.append(el('th', '', title));
  const header = el('thead'); header.append(head);
  const body = el('tbody');
  for (const item of batch.runs || []) {
    const row = el('tr');
    const id = item.run_id || item.id;
    row.append(el('td', '', item.condition || item.condition_id || 'Run'), el('td', '', String(item.replicate ?? item.repetition ?? '')),
      el('td', '', item.status || 'Recorded'));
    const record = el('td');
    if (id) record.append(button('Replay run', () => openRun(id), 'text-action'));
    else record.textContent = 'Awaiting journal';
    row.append(record); body.append(row);
  }
  table.append(header, body);
  const scroll = el('div', 'table-scroll'); scroll.append(table); root.append(scroll);
  if (!batch.runs?.length) root.append(el('p', 'muted', 'The first journal is being prepared.'));
  const details = disclosure('Exact comparison record and artifact references');
  details.append(jsonBlock(batch)); root.append(details);
}
