/** Make study manipulations explicit before changing editable experiment settings. */
import {el, select, button, check, disclosure} from './dom.js';
import {isIndividual, comparisonCount, comparisonConditionCount, activeCatalog, isFlowerConfig} from './study-model.js';

const descriptions = {
  default: 'Restore the eight flower domains, coordinator, shared responsibilities, and domain assignments. Keep this case, environment, challenges, outcome model, and execution settings.',
  ablation: 'Withdraw one domain’s explicit instructions everywhere. Keep other omissions and the current team, case, and contribution opportunities.',
  individual: 'One agent executes the reference team’s contribution and coordination slots. Its selected competencies intersect each slot’s duties; the number of opportunities stays matched.',
};

/** @param {HTMLElement} root @param {object} config @param {object} catalog @param {object} choice @param {Function} apply @param {boolean} pending @returns {void} Render an intentional study preset action. */
export function renderStudy(root, config, catalog, choice, apply, pending = false) {
  catalog = activeCatalog(config, catalog);
  root.replaceChildren();
  const heading = el('div', 'section-heading');
  heading.append(el('h2', '', 'Study design'), el('span', 'pill', isIndividual(config) ? 'Individual agent' : 'Team'));
  const controls = el('div', 'study-controls');
  const redraw = () => renderStudy(root, config, catalog, choice, apply, pending);
  controls.append(select('Study preset', choice.mode, [['default', isFlowerConfig(config, catalog) ? 'Full flower team' : 'Original historical team'], ['ablation', 'Domain omitted everywhere'], ['individual', 'Individual agent']], value => { choice.mode = value; redraw(); }));
  if (choice.mode === 'ablation') controls.append(select('Domain to omit', choice.competency,
    catalog.competencies.map(item => [item.id, item.name]), value => { choice.competency = value; }));
  if (choice.mode === 'individual') controls.append(select('Individual persona', choice.persona_id,
    (catalog.personas || []).map(item => [item.id, item.name]), value => { choice.persona_id = value; }));
  const action = button(pending ? 'Applying…' : 'Apply study preset', apply, 'primary');
  action.disabled = pending || !catalog.personas?.length;
  controls.append(action);
  root.append(heading, controls, el('p', 'muted small', choice.mode === 'default' && !isFlowerConfig(config, catalog) ? 'Restore the original historical team and modules within this imported framework. The preserved run remains unchanged.' : descriptions[choice.mode]));
  if (config.schema_version === 1) root.append(el('p', 'mode-note', 'This is a legacy configuration. Applying a study preset explicitly adds version 2 participation, persona, and outcome-model settings.'));
  if (config.omit_competencies.length) root.append(el('p', 'small', `Current omissions: ${config.omit_competencies.map(id => catalog.competencies.find(item => item.id === id)?.name || id).join(', ')}.`));
}

/** @param {HTMLElement} root @param {object} config @param {object} catalog @param {object} comparison @param {Function} changed @returns {void} Select fresh domain and participation comparisons without changing the source configuration. */
export function renderComparisonSetup(root, config, catalog, comparison, changed) {
  catalog = activeCatalog(config, catalog);
  root.replaceChildren(el('h3', '', 'Compare conditions'));
  const redraw = () => { renderComparisonSetup(root, config, catalog, comparison, changed); changed(); };
  root.append(select('Comparison design', comparison.kind,
    [['flower', 'Flower: five conditions'], ['configured', 'Repeat current configuration'],
      ['ablation', 'Domain included vs omitted'], ['competency_emphasis', 'Included, omitted, coordinator reinforced'],
      ['team_individual', 'Team vs individual agent']], value => {
      comparison.kind = value;
      comparison.schema_version = value === 'flower' ? 2 : 1;
      comparison.competency = ['flower', 'ablation', 'competency_emphasis'].includes(value)
        ? comparison.competency || catalog.flower.domains[3].id : null;
      if (value === 'flower') comparison.actor_id = config.team.find(actor => actor.competencies.includes(comparison.competency))?.id || '';
      else delete comparison.actor_id;
      redraw();
    }));
  if (['flower', 'ablation', 'competency_emphasis'].includes(comparison.kind)) root.append(select('Compared domain', comparison.competency,
    catalog.competencies.map(item => [item.id, item.name]), value => {
      comparison.competency = value;
      if (comparison.kind === 'flower') comparison.actor_id = config.team.find(actor => actor.competencies.includes(value))?.id || '';
      redraw();
    }));
  if (comparison.kind === 'flower') {
    const members = config.team.filter(actor => actor.available && actor.id !== config.integration.coordinator && actor.competencies.includes(comparison.competency));
    root.append(select('Member for withdrawal and removal', comparison.actor_id,
      members.map(actor => [actor.id, actor.name]), value => { comparison.actor_id = value; changed(); }));
    root.append(el('p', 'mode-note', 'Compare the full team, omission of this domain everywhere, withdrawal from this member, removal of this member, and one agent covering matched slots. Member removal reduces work capacity; the other contrasts preserve contribution opportunities.'));
    if (!members.length) root.append(el('p', 'warning-text', 'Assign the compared domain to an available member before running this comparison.'));
  }
  const policies = disclosure('Coordination conditions');
  for (const [id, label] of [['explicit', 'Explicit integration'], ['handoff', 'Procedural handoff']]) {
    policies.append(check(label, comparison.integration_modes.includes(id), enabled => {
      if (!enabled && comparison.integration_modes.length === 1) { redraw(); return; }
      comparison.integration_modes = enabled ? [...comparison.integration_modes, id] : comparison.integration_modes.filter(item => item !== id);
      redraw();
    }));
  }
  root.append(policies, el('p', 'muted small', comparison.kind === 'flower'
    ? 'Overlap remains in the member-withdrawal condition, so another member may supply the contribution. An omission is not programmed to cause a failure. Preserve case facts and review the resolved schedule and instruction exposure.'
    : comparison.kind === 'team_individual'
      ? 'The configured individual persona uses the source team’s schedule. Identity changes; call opportunities stay matched.'
      : comparison.kind === 'competency_emphasis'
        ? 'Reinforcement changes instruction placement at coordinator turns. Calls stay matched, but token exposure does not.'
        : 'Each condition creates a fresh journal. Other configured conditions stay fixed.'));
  const count = el('p', 'small', `${comparisonConditionCount(comparison)} participation/support conditions × ${comparison.integration_modes.length} coordination conditions × ${config.execution.repetitions} repetitions = ${comparisonCount(comparison, config.execution.repetitions)} runs.`);
  count.id = 'comparison-count'; root.append(count);
}
