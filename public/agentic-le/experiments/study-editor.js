/** Make study manipulations explicit before changing editable experiment settings. */
import {el, select, button, check, disclosure} from './dom.js';
import {isIndividual, comparisonCount} from './study-model.js';

const descriptions = {
  default: 'Restore the default team, coordination, and competency support. Keep this case, environment, challenges, outcome model, and execution settings.',
  ablation: 'Withdraw one competency’s explicit instructions everywhere. Keep other omissions and the current team, case, and contribution opportunities.',
  individual: 'One agent executes the reference team’s contribution and coordination slots. Its selected competencies intersect each slot’s duties; the number of opportunities stays matched.',
};

/** @param {HTMLElement} root @param {object} config @param {object} catalog @param {object} choice @param {Function} apply @param {boolean} pending @returns {void} Render an intentional study preset action. */
export function renderStudy(root, config, catalog, choice, apply, pending = false) {
  root.replaceChildren();
  const heading = el('div', 'section-heading');
  heading.append(el('h2', '', 'Study design'), el('span', 'pill', isIndividual(config) ? 'Individual agent' : 'Team'));
  const controls = el('div', 'study-controls');
  const redraw = () => renderStudy(root, config, catalog, choice, apply, pending);
  controls.append(select('Study preset', choice.mode, [['default', 'Default team'], ['ablation', 'Competency ablation'], ['individual', 'Individual agent']], value => { choice.mode = value; redraw(); }));
  if (choice.mode === 'ablation') controls.append(select('Competency to omit', choice.competency,
    catalog.competencies.map(item => [item.id, item.name]), value => { choice.competency = value; }));
  if (choice.mode === 'individual') controls.append(select('Individual persona', choice.persona_id,
    (catalog.personas || []).map(item => [item.id, item.name]), value => { choice.persona_id = value; }));
  const action = button(pending ? 'Applying…' : 'Apply study preset', apply, 'primary');
  action.disabled = pending || !catalog.personas?.length;
  controls.append(action);
  root.append(heading, controls, el('p', 'muted small', descriptions[choice.mode]));
  if (config.schema_version === 1) root.append(el('p', 'mode-note', 'This is a legacy configuration. Applying a study preset explicitly adds version 2 participation, persona, and outcome-model settings.'));
  if (config.omit_competencies.length) root.append(el('p', 'small', `Current omissions: ${config.omit_competencies.map(id => catalog.competencies.find(item => item.id === id)?.name || id).join(', ')}.`));
}

/** @param {HTMLElement} root @param {object} config @param {object} catalog @param {object} comparison @param {Function} changed @returns {void} Select fresh repetition and ablation comparisons without changing the source configuration. */
export function renderComparisonSetup(root, config, catalog, comparison, changed) {
  root.replaceChildren(el('h3', '', 'Compare conditions'));
  const redraw = () => { renderComparisonSetup(root, config, catalog, comparison, changed); changed(); };
  root.append(select('Comparison design', comparison.kind,
    [['configured', 'Repeat current configuration'], ['ablation', 'Competency included vs omitted'], ['team_individual', 'Team vs individual agent']], value => {
      comparison.kind = value;
      comparison.competency = value === 'ablation' ? comparison.competency || 'measurement' : null;
      redraw();
    }));
  if (comparison.kind === 'ablation') root.append(select('Compared competency', comparison.competency,
    catalog.competencies.map(item => [item.id, item.name]), value => { comparison.competency = value; changed(); }));
  const policies = disclosure('Coordination conditions');
  for (const [id, label] of [['explicit', 'Explicit integration'], ['handoff', 'Procedural handoff']]) {
    policies.append(check(label, comparison.integration_modes.includes(id), enabled => {
      if (!enabled && comparison.integration_modes.length === 1) { redraw(); return; }
      comparison.integration_modes = enabled ? [...comparison.integration_modes, id] : comparison.integration_modes.filter(item => item !== id);
      redraw();
    }));
  }
  root.append(policies, el('p', 'muted small', comparison.kind === 'team_individual'
    ? 'Use the configured individual persona and preserve the source team’s slot schedule. Identity changes; call opportunities stay matched.'
    : 'Each condition creates a fresh journal. Other configured conditions stay fixed.'));
  const count = el('p', 'small', `${comparison.kind === 'configured' ? 1 : 2} participation/support conditions × ${comparison.integration_modes.length} coordination conditions × ${config.execution.repetitions} repetitions = ${comparisonCount(comparison, config.execution.repetitions)} runs.`);
  count.id = 'comparison-count'; root.append(count);
}
