/** Bind visible case, expertise, scenario and change controls to the exact exported configuration. */
import {el, button, field, select, check, disclosure} from '../experiments/dom.js';
import {makeConfig, PHASES, lines, validateConfig} from './config-model.js';
const host = id => document.getElementById(id);
const copy = value => structuredClone(value);

function presets(catalog, config, actions) {
  const node = host('preset-controls'); node.replaceChildren();
  let caseId = config.case_id, conditionId = config.condition_id;
  const row = el('div', 'inline-controls');
  row.append(select('Case preset', caseId, catalog.cases.map(item => [item.id, item.title]), value => { caseId = value; }),
    select('Team condition preset', conditionId, catalog.conditions.map(item => [item.id, item.label]), value => { conditionId = value; }),
    button('Apply selected preset', () => actions.replace(makeConfig(catalog, caseId, conditionId), 'Preset copied into a new editable configuration.')));
  node.append(row, el('p', 'muted', 'Applying a preset replaces this draft’s case, roster, scenarios and queued changes. Export a version first if you want to keep it.'));
  host('version-controls').replaceChildren(field('Configuration version ID', config.id, value => { config.id = value; actions.changed(); }, {maxLength: 101}));
}

function caseEditor(config, actions) {
  host('case-editor').replaceChildren(
    field('Case title', config.case.title, value => { config.case.title = value; actions.changed(); }),
    field('Problem and intended capability', config.case.brief, value => { config.case.brief = value; actions.changed(); }, {multiline: true, rows: 4}),
    field('Task constraints — one per line', config.case.constraints.join('\n'), value => { config.case.constraints = lines(value); actions.changed(); }, {multiline: true, rows: 3}));
}

function authorityControls(agent, catalog, actions) {
  const node = disclosure('Domains and procedural authority');
  if (agent.kind === 'specialist') {
    node.append(el('p', 'muted', 'These assignments bound substantive claims and approvals. A specialist may have no assigned domain; the gap remains explicit.'));
    for (const domain of catalog.domains) node.append(check(domain.label, agent.domains.includes(domain.id), enabled => {
      agent.domains = enabled ? [...agent.domains, domain.id] : agent.domains.filter(id => id !== domain.id); actions.changed();
    }));
  } else node.append(el('p', 'muted', 'This role has no specialist domain approval authority. Its own brief and limits remain active.'));
  const options = ['specialist', 'generalist'].includes(agent.kind) ? ['implement'] : [agent.kind === 'facilitator' ? 'facilitate' : 'evaluate'];
  for (const value of options) node.append(check(`Allow ${value}`, agent.capabilities?.includes(value) ?? false, enabled => {
    agent.capabilities = enabled ? [...new Set([...(agent.capabilities ?? []), value])] : (agent.capabilities ?? []).filter(item => item !== value); actions.changed();
  }));
  return node;
}

function profile(node, agent, catalog, config, actions) {
  node.replaceChildren();
  const meta = el('div', 'agent-meta'); meta.append(el('span', 'meta-chip', agent.kind));
  for (const id of agent.domains) meta.append(el('span', 'meta-chip', catalog.domains.find(item => item.id === id)?.label ?? id));
  node.append(meta, field('Agent display name', agent.label, value => { agent.label = value; actions.changed(); }),
    field('Knowledge brief', agent.brief, value => { agent.brief = value; actions.changed(); }, {multiline: true, rows: 6}),
    field('Knowledge limits — one per line', agent.limits.join('\n'), value => { agent.limits = lines(value); actions.changed(); }, {multiline: true, rows: 3}),
    authorityControls(agent, catalog, actions));
  if (['specialist', 'generalist'].includes(agent.kind)) node.append(button('Remove this agent', () => {
    const next = copy(config); next.agents = next.agents.filter(item => item.id !== agent.id);
    actions.replace(next, 'Agent removed from this draft.');
  }));
}

function knowledgeEditor(catalog, config, actions) {
  const node = host('knowledge-editor'), body = el('div'); node.replaceChildren();
  const options = config.agents.map(agent => [agent.id, `${agent.label} · ${agent.kind}`]);
  node.append(select('Agent to edit', config.agents[0].id, options, value => profile(body, config.agents.find(agent => agent.id === value), catalog, config, actions)), body);
  profile(body, config.agents[0], catalog, config, actions);
  const available = catalog.agents.filter(agent => ['specialist', 'generalist'].includes(agent.kind) && !config.agents.some(item => item.id === agent.id));
  if (!available.length) return;
  const extra = disclosure('Add an authoring agent'); let selected = available[0].id;
  extra.append(select('Available agent', selected, available.map(agent => [agent.id, agent.label]), value => { selected = value; }), button('Add selected agent', () => {
    const next = copy(config); next.agents.push(copy(available.find(agent => agent.id === selected))); actions.replace(next, 'Agent added to this draft.');
  })); node.append(extra);
}

function taskFields(scenario, change) {
  const node = el('div'), apply = scenario.actions.find(action => action.type === 'scenario');
  if (!apply) { node.append(el('p', 'muted', 'This definition has no scenario-application action. Edit its exact actions below.')); return node; }
  const edit = (key, value) => { apply.value = {...apply.value, [key]: value}; scenario.task = copy(apply.value); change(); };
  node.append(field('Test facts — one per line', (apply.value.facts ?? []).join('\n'), value => edit('facts', lines(value)), {multiline: true, rows: 3}),
    field('Test constraints — one per line', (apply.value.constraints ?? []).join('\n'), value => edit('constraints', lines(value)), {multiline: true, rows: 2}),
    field('Practice task under these conditions', apply.value.task ?? '', value => edit('task', value), {multiline: true, rows: 2}));
  return node;
}

function scenarioForm(node, scenario, config, catalog, actions) {
  node.replaceChildren(); let advancedInput;
  const change = () => { actions.changed(); if (advancedInput && document.activeElement !== advancedInput) advancedInput.value = JSON.stringify(scenario, null, 2); };
  node.append(el('h3', '', scenario.title), el('p', 'muted', `Scenario ID: ${scenario.id}`),
    select('Scenario difficulty', scenario.difficulty, ['easy', 'medium', 'hard'], value => { scenario.difficulty = value; change(); }),
    field('Scenario brief for testing and evaluation', scenario.brief, value => { scenario.brief = value; change(); }, {multiline: true, rows: 3}), taskFields(scenario, change));
  const viewport = el('div', 'form-row');
  const size = (key, value) => { scenario.conditions ??= {}; scenario.conditions.viewport ??= {width: 1280, height: 800}; scenario.conditions.viewport[key] = value; change(); };
  viewport.append(field('Viewport width', scenario.conditions?.viewport?.width ?? 1280, value => size('width', value), {type: 'number', min: 240, max: 3840}),
    field('Viewport height', scenario.conditions?.viewport?.height ?? 800, value => size('height', value), {type: 'number', min: 240, max: 3840}));
  node.append(viewport, check('Offline test condition', scenario.conditions?.offline ?? false, value => { scenario.conditions ??= {}; scenario.conditions.offline = value; change(); }));
  const advanced = disclosure('Exact scenario actions and checks');
  advanced.append(el('p', 'muted', 'This is the complete copied scenario. Applied JSON edits govern the runner’s test actions and expected observations.'));
  const input = field('Scenario JSON', JSON.stringify(scenario, null, 2), () => {}, {multiline: true, rows: 12});
  advancedInput = input.querySelector('textarea'); advancedInput.className = 'scenario-json'; advancedInput.spellcheck = false;
  advanced.append(input, button('Apply scenario JSON', () => {
    try {
      const parsed = JSON.parse(advancedInput.value), next = copy(config), position = next.scenarios.findIndex(item => item.id === scenario.id);
      next.scenarios[position] = parsed; next.scenario_ids = next.scenarios.map(item => item.id); validateConfig(next, catalog);
      actions.replace(next, 'Edited scenario copied into the runnable configuration.');
    } catch (error) { actions.error(error); }
  })); node.append(advanced);
}

function scenarioEditor(catalog, config, actions) {
  const node = host('scenario-editor'); node.replaceChildren();
  const options = [...catalog.scenarios.filter(item => item.case_id === config.case_id)];
  for (const scenario of config.scenarios) if (!options.some(item => item.id === scenario.id)) options.push(scenario);
  const choices = disclosure('Scenarios included in this run');
  for (const scenario of options) {
    const control = check(`${scenario.difficulty}: ${scenario.title}`, config.scenario_ids.includes(scenario.id), enabled => {
      const next = copy(config);
      next.scenarios = enabled ? [...next.scenarios, copy(scenario)] : next.scenarios.filter(item => item.id !== scenario.id);
      next.scenario_ids = next.scenarios.map(item => item.id);
      if (!actions.replace(next, 'Scenario selection updated. Removed scenario edits are no longer in this configuration.')) control.querySelector('input').checked = config.scenario_ids.includes(scenario.id);
    }); choices.append(control);
  }
  const body = el('div');
  node.append(choices, select('Scenario to edit', config.scenarios[0].id, config.scenarios.map(item => [item.id, `${item.difficulty} · ${item.title}`]), value => scenarioForm(body, config.scenarios.find(item => item.id === value), config, catalog, actions)), body);
  scenarioForm(body, config.scenarios[0], config, catalog, actions);
}

function changeEditor(config, actions) {
  const node = host('change-editor'); node.replaceChildren(); let phase = 'design_develop', after = 3, message = '';
  node.append(select('Change phase', phase, PHASES, value => { phase = value; }),
    field('After how many turns in that phase?', after, value => { after = value; }, {type: 'number', min: 0, max: 199}),
    field('New user constraint or request', message, value => { message = value; }, {multiline: true, rows: 3}),
    button('Queue this change', () => {
      const next = copy(config); let number = 1; while (next.updates.some(item => item.id === `change-${number}`)) number++;
      next.updates.push({id: `change-${number}`, phase, after_turn: after, message}); actions.replace(next, 'User change queued in the exported configuration.');
    }));
  for (const update of config.updates) {
    const card = el('div', 'queued-change');
    card.append(el('strong', '', `${PHASES.find(([id]) => id === update.phase)?.[1]} · after turn ${update.after_turn}`), el('p', '', update.message),
      button(`Remove ${update.id}`, () => { const next = copy(config); next.updates = next.updates.filter(item => item.id !== update.id); actions.replace(next, 'Queued change removed.'); })); node.append(card);
  }
}

function budgets(config, actions) {
  const node = host('budget-editor'); node.replaceChildren();
  for (const [id, label] of PHASES) node.append(field(`${label} call limit`, config.budgets[id], value => { config.budgets[id] = value; actions.changed(); }, {type: 'number', min: 1, max: 200}));
  node.append(field('Maximum context characters', config.budgets.max_context_chars, value => { config.budgets.max_context_chars = value; actions.changed(); }, {type: 'number', min: 2000, max: 2000000, step: 1000}));
}

/** @param {object} catalog @param {object} config @param {{changed:Function,replace:Function,error:Function}} actions @returns {void} Render editable controls while leaving each keystroke attached to the same draft. */
export function renderEditor(catalog, config, actions) {
  presets(catalog, config, actions); caseEditor(config, actions); knowledgeEditor(catalog, config, actions);
  scenarioEditor(catalog, config, actions); changeEditor(config, actions); budgets(config, actions);
}
