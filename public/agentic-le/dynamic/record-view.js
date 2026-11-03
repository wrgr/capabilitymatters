/** Present addressed conversations, unresolved work and evidence-based expert judgments without combining scores. */
import {el, button, disclosure, jsonBlock} from '../experiments/dom.js';
import {createCandidatePreview} from '../experiments/artifact-view.js';
import {PHASES} from './config-model.js';
import {replayState} from './record-model.js';
const host = id => document.getElementById(id);
const label = (run, id) => run.config.agents.find(agent => agent.id === id)?.label ?? id;
const phaseLabel = id => PHASES.find(([key]) => key === id)?.[1] ?? id;

function messageCard(run, event, jump) {
  const value = event.payload.response, node = el('article', 'message-card'); node.id = `message-${event.payload.message_id}`;
  node.append(el('h3', '', `${label(run, event.actor)} · ${value.kind}`),
    el('p', 'address', `${event.payload.message_id} → ${value.to.map(id => label(run, id)).join(', ')}`),
    el('p', 'message-content', value.content));
  for (const ref of value.reply_to) {
    const target = run.events.find(item => item.kind === 'message' && item.payload.message_id === ref);
    node.append(button(`Reply to ${ref}`, () => jump(target.seq), 'reference'));
  }
  if (value.artifact_version !== null) node.append(el('p', 'muted', `Discussed artifact version: ${value.artifact_version}`));
  const details = disclosure('Exact message and event identity'); details.append(jsonBlock(event)); node.append(details);
  return node;
}

function phasePanel(run, state, phase, name, jump) {
  const node = el('section', 'phase-panel'), list = el('div', 'message-list');
  node.append(el('h2', '', name), el('p', 'muted', `${state.turns[phase]} recorded call attempts · limit ${run.config.budgets[phase]}`));
  list.tabIndex = 0; list.setAttribute('role', 'region'); list.setAttribute('aria-label', `${name} conversation`);
  const events = state.events.filter(event => event.phase === phase && ['message', 'user_update', 'turn_failed'].includes(event.kind));
  if (!events.length) list.append(el('p', 'muted', 'No conversation events are visible in this phase at this position.'));
  for (const event of events) {
    if (event.kind === 'message') list.append(messageCard(run, event, jump));
    else {
      const card = el('article', `message-card ${event.kind === 'user_update' ? 'user-change' : ''}`);
      card.append(el('h3', '', event.kind === 'user_update' ? 'User change' : 'Turn failed'), jsonBlock(event.payload)); list.append(card);
    }
  }
  node.append(list); return node;
}

function issueList(title, values, render) {
  const section = el('section'); section.append(el('h3', '', title));
  if (!values.length) section.append(el('p', 'muted', 'None recorded as open at this position.'));
  const list = el('ul'); for (const value of values) list.append(el('li', '', render(value)));
  section.append(list); return section;
}

function stateView(run, state) {
  const node = host('record-state'), columns = el('div', 'state-columns'); node.replaceChildren();
  columns.append(issueList('Unanswered questions', state.questions, item => `${item.id} · awaiting ${item.pending.map(id => label(run, id)).join(', ')}\n${item.content}`),
    issueList('Open objections', state.objections, item => `${item.id} · raised by ${label(run, item.actor)}\n${item.content}`)); node.append(columns);
  node.append(el('p', 'muted', 'An addressed answer closes a question for that actor. Only the original objector can withdraw an objection. Prose alone does not close either.'));
  const decisions = disclosure(`Explicit decisions (${state.decisions.length})`);
  for (const event of state.decisions) decisions.append(el('h3', '', `${event.payload.message_id} · ${event.payload.response.decision.action}`), el('p', '', event.payload.response.decision.subject), jsonBlock(event.payload.response.decision));
  if (!state.decisions.length) decisions.append(el('p', 'muted', 'No decision event is visible yet.')); node.append(decisions);
  if (state.current_artifact) {
    const reviews = disclosure(`Recorded domain approvals · artifact ${state.current_artifact.version}`);
    const list = el('ul'); for (const [id, value] of Object.entries(state.review_status)) list.append(el('li', '', `${run.catalog.domains.find(item => item.id === id)?.label ?? id}: ${value.replaceAll('_', ' ')}`));
    reviews.append(list, el('p', 'muted', 'Approvals concern the current version after the latest user update; they are not an overall success score.')); node.append(reviews);
  }
}

function artifactView(run, state) {
  const node = host('record-artifacts'); node.replaceChildren();
  if (!state.artifacts.length) { node.append(el('p', 'muted', 'No implemented artifact is visible at this position.')); return; }
  for (const event of state.artifacts.toReversed()) {
    const value = event.payload, source = state.messages.find(item => item.payload.message_id === value.message_id);
    const frozen = state.frozen.find(item => item.payload.artifact_version === value.version);
    const card = disclosure(`Version ${value.version} · ${frozen ? 'frozen for testing' : 'not frozen'}`, event === state.artifacts.at(-1));
    card.append(el('p', '', value.change_summary), el('p', 'muted', `Exact HTML SHA-256: ${value.sha256}`), createCandidatePreview(source.payload.response.artifact.html));
    if (frozen) { const boundary = disclosure('Freeze record and retained risks'); boundary.append(jsonBlock(frozen.payload)); card.append(boundary); }
    node.append(card);
  }
}

function criterionCard(run, evaluation, row, fixture) {
  const definition = run.catalog.rubric[evaluation.scope].find(item => item.id === row.dimension_id), node = el('article', 'criterion'), heading = el('div', 'criterion-heading');
  const score = row.score === null ? 'Unknown' : `${row.score} / 4`;
  heading.append(el('strong', '', definition?.label ?? row.dimension_id), el('span', 'criterion-score', fixture ? `Scripted: ${score}` : score));
  node.append(heading, el('p', 'muted', definition?.description ?? ''), el('p', '', row.rationale));
  const evidence = disclosure(`Evidence references (${row.evidence_refs.length})`);
  for (const ref of row.evidence_refs) evidence.append(el('p', 'evidence-ref', `${ref.source} · ${ref.id}`), el('blockquote', '', ref.quote));
  if (!row.evidence_refs.length) evidence.append(el('p', 'muted', 'No supporting quotation is recorded.'));
  node.append(evidence); return node;
}

function observationView(run, state) {
  const node = host('record-observations'); node.replaceChildren();
  if (!state.observations.length) { node.append(el('p', 'muted', 'No deployment observations are visible at this position. Test definitions alone are not observed outcomes.')); return; }
  for (const event of state.observations) {
    const value = event.payload.evidence, scenario = run.config.scenarios.find(item => item.id === value.scenario_id);
    const title = `${scenario?.difficulty ?? value.scenario_id} · artifact ${value.artifact_version} · ${value.status}`;
    const card = disclosure(value.evidence_kind === 'fixture' ? `Scripted observation: ${title}` : title, value.status !== 'observed');
    card.append(el('p', '', scenario?.title ?? value.scenario_id));
    if (value.evidence_kind === 'fixture') card.append(el('p', 'error-note', 'Authored test data for the interface. No browser research evidence.'));
    if (value.status === 'unavailable') card.append(el('p', 'error-note', 'Browser observations were unavailable. Intended actions and expected checks remain unobserved.'));
    card.append(el('p', 'muted', `Exact HTML: ${value.artifact_sha256} · Scenario: ${value.scenario_sha256}`));
    for (const action of value.actions) {
      const item = disclosure(`Action ${action.id} · ${action.status}`); item.append(jsonBlock(action)); card.append(item);
    }
    const checks = disclosure(`Declared check observations (${value.checks.length})`); checks.append(jsonBlock(value.checks)); card.append(checks);
    const execution = disclosure('Runtime, network and evidence provenance');
    execution.append(jsonBlock({runtime_errors: value.runtime_errors, network_requests: value.network_requests, source_hashes: value.source_hashes, evidence_sha256: event.payload.evidence_sha256})); card.append(execution);
    for (const limitation of value.limitations) card.append(el('p', 'muted', `Limitation: ${limitation}`));
    const exact = disclosure('Exact observation record'); exact.append(jsonBlock(value)); card.append(exact); node.append(card);
  }
}

function evaluationView(run, state) {
  const node = host('record-evaluation'); node.replaceChildren();
  if (!state.evaluations.length) { node.append(el('p', 'muted', 'No expert evaluation is visible at this position. No score has been inferred.')); return; }
  if (run.mode === 'fixture') node.append(el('p', 'error-note', 'Scripted interface demonstration. Any displayed values are authored test inputs, not completed agentic research results.'));
  for (const event of state.evaluations) {
    const value = event.payload, scenario = run.config.scenarios.find(item => item.id === value.scenario_id), card = el('section', 'evaluation-card');
    const title = value.scope === 'process' ? 'Process review' : `Result review · ${scenario?.difficulty ?? value.scenario_id}`;
    card.append(el('h3', '', `${title} · artifact ${value.artifact_version}`), el('p', 'muted', `Evaluator: ${label(run, event.actor)}${scenario ? ` · ${scenario.title}` : ''}`));
    for (const row of value.scores) card.append(criterionCard(run, value, row, run.mode === 'fixture'));
    for (const limit of value.limitations ?? []) card.append(el('p', 'muted', `Limitation: ${limit}`));
    const exact = disclosure('Exact evaluation and packet fingerprints'); exact.append(jsonBlock(value)); card.append(exact); node.append(card);
  }
}

/** @param {object} run @returns {void} Explain the imported execution mode and pinned inputs without claiming file authenticity. */
export function renderRunSummary(run) {
  const node = host('run-summary'); node.replaceChildren(); node.className = `record-banner ${run.mode === 'fixture' ? 'fixture' : ''}`;
  const title = {fixture: 'Scripted interface demonstration — not an agentic result', manual: 'Manually advanced run record', live: 'Live-provider run record'}[run.mode];
  node.append(el('h2', '', title), el('p', '', `${run.config.case.title} · ${run.id}`),
    el('p', 'muted', `Pinned configuration: ${run.config.id} · ${run.config_sha256}`),
    el('p', 'muted', 'Imported file: input fingerprints, event links and retained HTML bindings checked locally. Use the local runner for its full semantic verification.'));
  const context = host('record-evidence'); context.replaceChildren();
  for (const [title, value] of [['Pinned configuration and full scenarios', run.config], ['Evaluator expertise and rubric', {agent: run.config.agents.find(item => item.id === run.config.evaluator_id), rubric: run.catalog.rubric}], ['Complete original run record', run]]) {
    const details = disclosure(title); details.append(jsonBlock(value)); context.append(details);
  }
}

/** @param {object} run @param {number} cursor @param {Function} jump @returns {void} Render both phases and only the evaluations available at the selected event. */
export function renderReplay(run, cursor, jump) {
  const state = replayState(run, cursor), current = state.events.at(-1);
  host('conversation-phases').replaceChildren(...PHASES.map(([phase, name]) => phasePanel(run, state, phase, name, jump)));
  host('event-position').textContent = `Event ${cursor} of ${run.events.length}${current ? ` · ${current.kind} · ${phaseLabel(current.phase)}` : ''}`;
  host('event-range').value = String(cursor); host('previous-event').disabled = cursor <= 1; host('next-event').disabled = cursor >= run.events.length;
  stateView(run, state); artifactView(run, state); observationView(run, state); evaluationView(run, state);
}
