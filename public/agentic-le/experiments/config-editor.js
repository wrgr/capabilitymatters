/** Expose fictional team assignments as ordinary controls while preserving stable actor identities. */
import {el, field, select, check, button, disclosure} from './dom.js';
import {membership, newActor} from './config-model.js';

/** @param {HTMLElement} root @param {object} config @param {object} catalog @param {Function} changed @returns {void} Render the editable roster. */
export function renderTeam(root, config, catalog, changed) {
  root.replaceChildren();
  const heading = el('div', 'section-heading');
  const title = el('div');
  title.append(el('h2', '', 'People and contributions'), el('p', 'muted', 'Assign several competencies to one person, or distribute them across the team.'));
  const add = button('Add team member', () => {
    if (config.team.length >= 20) return;
    const actor = newActor(config);
    config.team.push(actor);
    changed(true);
    root.querySelector(`[data-actor="${actor.id}"]`).open = true;
  });
  add.disabled = config.team.length >= 20;
  heading.append(title, add);
  const cards = el('div', 'team-grid');
  for (const actor of config.team) cards.append(actorCard(actor, config, catalog, changed));
  root.append(heading, cards);
}

/** @param {object} actor @param {object} config @param {object} catalog @param {Function} changed @returns {HTMLElement} Build one member's identity and assignments. */
function actorCard(actor, config, catalog, changed) {
  const card = disclosure('');
  card.classList.add('actor-card');
  card.dataset.actor = actor.id;
  const summary = card.querySelector('summary');
  const identity = el('span', 'actor-identity');
  const name = el('strong', '', actor.name);
  const role = el('small', 'muted', actor.role);
  identity.append(name, role);
  summary.append(identity, el('span', `pill ${actor.available ? '' : 'quiet'}`, actor.available ? 'On team' : 'Unavailable'));
  const badges = el('span', 'badges');
  for (const key of actor.competencies) {
    const module = catalog.competencies.find(item => item.id === key);
    badges.append(el('span', config.omit_competencies.includes(key) ? 'tag omitted' : 'tag', module?.name || key));
  }
  identity.append(badges);
  const body = el('div', 'actor-body');
  const fields = el('div', 'two-columns');
  fields.append(field('Name', actor.name, value => { actor.name = value; name.textContent = value; changed(); }, {maxLength: 120}),
    field('Responsibility', actor.role, value => { actor.role = value; role.textContent = value; changed(); }, {maxLength: 120}));
  body.append(fields, check('Available to contribute', actor.available, value => { actor.available = value; changed(true); }));
  body.append(assignmentChecks('Assigned competencies', catalog.competencies, actor.competencies, values => { actor.competencies = values; changed(true); }));
  body.append(assignmentChecks('Contribution stages', catalog.stages, actor.stages, values => { actor.stages = values; changed(); }));
  body.append(behaviorControls(actor, changed));
  const remove = button('Remove from team', () => { config.team = config.team.filter(item => item.id !== actor.id); changed(true); }, 'text-danger');
  remove.disabled = config.team.length <= 1;
  body.append(el('p', 'muted small', `Stable identity: ${actor.id}. Profiles describe assigned behavior, not demonstrated human proficiency.`), remove);
  card.append(body);
  return card;
}

/** @param {string} title @param {object[]} options @param {string[]} selected @param {Function} change @returns {HTMLElement} Render a labeled multiple choice group. */
export function assignmentChecks(title, options, selected, change) {
  const group = el('fieldset', 'checkbox-group');
  group.append(el('legend', '', title));
  let current = [...selected];
  for (const option of options) {
    const control = check(option.name || option.label || option.id, current.includes(option.id), included => {
      current = membership(current, option.id, included);
      change(current);
    });
    if (option.description) control.title = option.description;
    group.append(control);
  }
  return group;
}

/** @param {object} actor @param {Function} changed @returns {HTMLElement} Configure observable behaviors separately from competencies. */
function behaviorControls(actor, changed) {
  const panel = disclosure('Behavior and decision authority');
  const grid = el('div', 'two-columns');
  const bind = key => value => { actor.behavior[key] = value; changed(); };
  grid.append(select('Challenging a proposal', actor.behavior.challenge,
    [['balanced', 'Balanced'], ['persistent', 'Persistent questioning'], ['deferential', 'Deferential']], bind('challenge')),
  select('Revising a position', actor.behavior.revision, [['open', 'Open to revision'], ['reluctant', 'Reluctant to revise']], bind('revision')),
  select('Communication', actor.behavior.communication, [['concise', 'Concise'], ['elaborate', 'Elaborate']], bind('communication')),
  select('Decision authority', actor.authority, [['advisory', 'Advisory'], ['decision', 'Decision responsibility']], value => { actor.authority = value; changed(); }));
  panel.append(grid, el('p', 'muted small', 'These are experimental instructions for observable interaction. They are not psychological assessments.'));
  return panel;
}
