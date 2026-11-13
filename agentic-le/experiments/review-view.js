/** Explain declared and resolved experiment coverage without judging simulated competency effects. */
import {el, disclosure, jsonBlock} from './dom.js';
import {declaredCoverage} from './config-model.js';
import {executingActors, isIndividual} from './study-model.js';
import {contractView} from './contract-view.js';

/** @param {HTMLElement} root @param {object} config @param {object} catalog @returns {void} Summarize the currently declared experiment. */
export function renderSummary(root, config, catalog) {
  root.replaceChildren();
  const counts = [
    [executingActors(config).length, 'available identities'],
    [declaredCoverage(config, catalog).filter(row => !row.omitted && row.actors.length).length, 'available assignments'],
    [config.challenges.length, 'fixed challenges'],
    [config.integration.mode === 'explicit' ? 'Integrate' : 'Handoff', 'coordination'],
  ];
  for (const [number, label] of counts) {
    const item = el('div', 'summary-stat');
    item.append(el('strong', '', String(number)), el('span', 'muted', label));
    root.append(item);
  }
}

/** @param {HTMLElement} root @param {object} config @param {object} catalog @param {object|null} resolved @param {object|null} contract @returns {void} Render a coverage audit and inspectable runtime contracts. */
export function renderReview(root, config, catalog, resolved = null, contract = null) {
  root.replaceChildren();
  const heading = el('div', 'section-heading');
  heading.append(el('h2', '', 'Coverage and provenance'), el('span', `pill ${resolved ? '' : 'quiet'}`, resolved ? 'Resolved by runner' : 'Declared assignments'));
  root.append(heading, el('p', 'muted', resolved
    ? 'The runtime contract below contains only the selected instructions. Coverage describes assignments, not demonstrated proficiency.'
    : 'Review the declared assignments here. Resolve configuration on the local runner to inspect the exact prompt responsibilities and pinned hashes.'));
  const table = el('table', 'coverage-table');
  const head = el('thead');
  const header = el('tr');
  for (const text of ['Expertise domain / legacy module', 'Available assignees', 'Scheduled contributors', 'Explicit support']) header.append(el('th', '', text));
  head.append(header);
  const body = el('tbody');
  for (const row of declaredCoverage(config, catalog)) {
    const tr = el('tr');
    const scheduled = resolved?.coverage?.[row.id]?.scheduled_actors;
    const names = scheduled?.map(id => executingActors(config).find(actor => actor.id === id)?.name || id);
    tr.append(el('th', '', row.name), el('td', '', row.actors.join(', ') || 'No available assignment'),
      el('td', '', names ? names.join(', ') || 'None in selected stages' : 'Resolve to inspect'),
      el('td', row.omitted ? 'warning-text' : '', row.omitted ? 'Withdrawn everywhere' : row.actors.length ? 'Assigned' : 'Unassigned'));
    body.append(tr);
  }
  table.append(head, body);
  const scroll = el('div', 'table-scroll');
  scroll.append(table);
  root.append(scroll);
  if (resolved) root.append(resolvedDetails(resolved));
  else if (contract) root.append(contractView(contract));
  const manifest = disclosure('Inspect the configuration JSON');
  manifest.append(jsonBlock(config));
  root.append(manifest);
}

/** @param {object} resolved @returns {HTMLElement} Reveal the exact resolved configuration and call schedule. */
function resolvedDetails(resolved) {
  const container = el('div');
  container.append(el('p', 'fingerprint', `Configuration SHA-256: ${resolved.config_hash}`),
    el('p', 'muted small', `Planned calls: ${resolved.planned_calls}. Catalog SHA-256: ${resolved.catalog_hash}`));
  if (isIndividual(resolved.config)) container.append(el('p', 'mode-note', `One executing identity covers ${resolved.planned_calls} matched slots from the reference team, including both individual contributions and stage coordination.`));
  if (resolved.warnings?.length) {
    const list = el('ul', 'warning-list');
    for (const warning of resolved.warnings) list.append(el('li', '', typeof warning === 'string' ? warning : JSON.stringify(warning)));
    container.append(list);
  }
  const schedule = disclosure('Inspect contribution schedule');
  schedule.append(jsonBlock({schedule: resolved.schedule, execution_plan: resolved.execution_plan, execution_plan_hash: resolved.execution_plan_hash,
    comparison_signature: resolved.comparison_signature}));
  const roles = disclosure('Inspect effective runtime responsibilities');
  roles.append(jsonBlock(resolved.role_contract));
  container.append(contractView(resolved.agent_contract, resolved.agent_specs), schedule, roles);
  return container;
}
