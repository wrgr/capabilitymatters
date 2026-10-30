/** Configure the case and controlled conditions independently of team membership. */
import {el, field, select, button, disclosure} from './dom.js';
import {assignmentChecks} from './config-editor.js';

/** @param {HTMLElement} root @param {object} config @param {Function} changed @returns {void} Render the fictional project brief. */
export function renderCase(root, config, changed) {
  root.replaceChildren();
  const panel = disclosure('Case and intended results', true);
  const grid = el('div', 'two-columns');
  grid.append(field('Experiment name', config.name, value => { config.name = value; changed(); }, {maxLength: 200}),
    field('Case title', config.seed.title, value => { config.seed.title = value; changed(); }, {maxLength: 200}));
  panel.append(grid, field('Problem and intended results', config.seed.idea, value => { config.seed.idea = value; changed(); }, {multiline: true, rows: 3, maxLength: 6000}));
  const more = disclosure('Domain, affected people, and boundaries');
  more.append(field('Domain', config.seed.domain, value => { config.seed.domain = value; changed(); }, {maxLength: 6000}),
    field('Affected people', config.seed.people, value => { config.seed.people = value; changed(); }, {multiline: true, rows: 2, maxLength: 6000}),
    field('Constraints', config.seed.constraints, value => { config.seed.constraints = value; changed(); }, {multiline: true, rows: 3, maxLength: 6000}));
  panel.append(more);
  root.append(panel);
}

/** @param {HTMLElement} root @param {object} config @param {object} catalog @param {Function} changed @returns {void} Render coordination and explicit support withdrawal controls. */
export function renderIntegration(root, config, catalog, changed) {
  root.replaceChildren(el('h2', '', 'How contributions meet'));
  root.append(select('Coordination policy', config.integration.mode,
    [['explicit', 'Explicit integration'], ['handoff', 'Procedural handoff']], value => { config.integration.mode = value; changed(); }));
  const actors = config.team.filter(actor => actor.available).map(actor => [actor.id, actor.name]);
  if (!actors.some(([id]) => id === config.integration.coordinator)) actors.unshift(['', 'Choose an available person']);
  root.append(select('Coordinator', config.integration.coordinator, actors, value => { config.integration.coordinator = value; changed(); }),
    el('p', 'muted small', 'Both policies retain the coordinator slot. Handoff omits the duty to reconcile contributions; spontaneous integration remains possible.'));
  const omissions = disclosure('Withdraw explicit competency support');
  omissions.append(el('p', 'muted small', 'Withdraw the selected instructions from every actor, including the coordinator. The model may still supply that knowledge.'),
    assignmentChecks('Instructions omitted everywhere', catalog.competencies, config.omit_competencies, values => { config.omit_competencies = values; changed(true); }));
  root.append(omissions);
}

/** @param {HTMLElement} root @param {object} config @param {object} catalog @param {Function} changed @returns {void} Render environmental constraints and externally fixed changes. */
export function renderConditions(root, config, catalog, changed) {
  root.replaceChildren(el('h2', '', 'Conditions and challenges'));
  root.append(select('Time pressure', config.environment.time_pressure, [['standard', 'Standard'], ['high', 'High']], value => { config.environment.time_pressure = value; changed(); }),
    field('Available resources', config.environment.resources, value => { config.environment.resources = value; changed(); }, {multiline: true, rows: 2, maxLength: 3000}),
    field('Environmental constraints', config.environment.constraints.join('\n'), value => { config.environment.constraints = value.split('\n').filter(item => item.trim()); changed(); }, {multiline: true, rows: 3, maxLength: 12000, help: 'One constraint per line.'}));
  const list = el('div', 'challenge-list');
  for (const challenge of config.challenges) list.append(challengeCard(challenge, config, catalog, changed));
  root.append(el('h3', '', 'Fixed challenges'), el('p', 'muted small', 'Introduce the same changed facts before the selected stage in every comparable run.'), list,
    button('Add challenge', () => {
      let index = 1;
      while (config.challenges.some(item => item.id === `challenge-${index}`)) index += 1;
      config.challenges.push({id: `challenge-${index}`, stage: 'design', description: 'Describe the changed fact.'});
      changed(true);
    }));
}

/** @param {object} challenge @param {object} config @param {object} catalog @param {Function} changed @returns {HTMLElement} Edit one externally controlled event. */
function challengeCard(challenge, config, catalog, changed) {
  const card = el('div', 'challenge-card');
  card.append(select('Introduce before stage', challenge.stage, catalog.stages.map(stage => [stage.id, stage.label]), value => { challenge.stage = value; changed(); }),
    field('Changed fact', challenge.description, value => { challenge.description = value; changed(); }, {multiline: true, rows: 3, maxLength: 3000}),
    button('Remove challenge', () => { config.challenges = config.challenges.filter(item => item.id !== challenge.id); changed(true); }, 'text-danger'));
  return card;
}

/** @param {HTMLElement} root @param {object} config @param {object} catalog @param {Function} changed @returns {void} Render run mode and explicit resource bounds. */
export function renderExecution(root, config, catalog, changed) {
  root.replaceChildren(el('h2', '', 'Execution settings'));
  const grid = el('div', 'two-columns');
  grid.append(select('Mode', config.execution.provider, [['dry-run', 'Dry run: verify workflow'], ['codex', 'Live Codex agents']], value => { config.execution.provider = value; changed(true); }),
    select('Last stage', config.execution.through, catalog.stages.map(stage => [stage.id, stage.label]), value => { config.execution.through = value; changed(); }));
  root.append(grid);
  if (config.execution.provider === 'codex') {
    root.append(field('Named model', config.execution.model, value => { config.execution.model = value; changed(); }, {maxLength: 200, required: true, help: 'Use a model identifier supported by your authenticated local Codex installation.'}));
  }
  root.append(el('p', 'mode-note', config.execution.provider === 'dry-run'
    ? 'Dry runs exercise configuration, scheduling, journals, and replay with deterministic fixture responses. They do not provide evidence about competency effects.'
    : 'Live runs send the case and accumulated discussion to the authenticated local Codex service. Use fictional or approved material.'));
  const limits = disclosure('Repetitions and resource bounds');
  const budgets = el('div', 'three-columns');
  for (const [key, label, min, max] of [['repetitions', 'Runs per comparison condition', 1, 20], ['max_calls', 'Maximum calls per run', 1, 200], ['max_output_chars', 'Maximum response characters', 1000, 100000]]) {
    budgets.append(field(label, config.execution[key], value => { config.execution[key] = value; changed(); }, {type: 'number', min, max}));
  }
  limits.append(budgets, el('p', 'muted small', 'Response characters bound what is accepted and retained. This is not a token or monetary spending limit. Repetitions apply to comparisons.'));
  root.append(limits);
}
