/** Explain named competency presets without treating them as verified professional identities. */
import {el, select, button} from './dom.js';
import {applyPersona} from './study-model.js';

/** @param {object} actor @param {object} catalog @param {Function} changed @returns {HTMLElement} Apply a named profile without replacing stable identity or stage opportunities. */
export function personaPicker(actor, catalog, changed) {
  const root = el('div', 'persona-picker');
  if (!catalog.personas?.length || !Object.hasOwn(actor, 'persona_ref')) return root;
  let selected = actor.persona_ref?.id || '';
  const description = el('p', 'muted small');
  const update = () => {
    const persona = catalog.personas.find(item => item.id === selected);
    description.textContent = persona ? `${persona.description} Copies assigned domains and interaction behavior; identity, authority, and contribution stages remain editable.` : 'Custom instructions. Choose a named preset to populate assignments and observable behavior.';
  };
  const row = el('div', 'persona-controls');
  row.append(select('Competency persona', selected, [['', 'Custom assignments'], ...catalog.personas.map(item => [item.id, `${item.name}${item.id.startsWith('flower-') ? '' : ' (historical module preset)'}`])], value => { selected = value; update(); }));
  row.append(button('Apply persona', () => {
    const persona = catalog.personas.find(item => item.id === selected);
    if (!persona) { actor.persona_ref = null; changed(true); return; }
    applyPersona(actor, persona); changed(true);
  }));
  update(); root.append(row, description);
  if (actor.persona_ref) root.append(el('p', 'fingerprint', `Preset ${actor.persona_ref.id} · version ${actor.persona_ref.version}`));
  return root;
}
