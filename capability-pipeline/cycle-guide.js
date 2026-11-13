/* Give the diagram and eight step cards the same keyboard-accessible explanations. */
(function () {
  'use strict';
  const stages = Object.values(globalThis.CapabilityTeaching.cycle);
  const legend = document.getElementById('step-legend');
  const dialog = document.getElementById('cycle-step-dialog');
  const ns = 'http://www.w3.org/2000/svg';

  /** @param {number} index @returns {void} Open a step explanation without changing the case exercise. */
  function explain(index) {
    const step = stages[index];
    document.getElementById('cycle-step-title').textContent = `${index + 1}. ${step.label}`;
    for (const field of ['description', 'why', 'decision', 'question']) {
      document.getElementById(`cycle-step-${field}`).textContent = step[field];
    }
    dialog.showModal();
  }
  stages.forEach((step, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'cycle-card';
    card.setAttribute('aria-haspopup', 'dialog');
    card.setAttribute('aria-controls', dialog.id);
    const number = document.createElement('span');
    number.className = 'cycle-card-number';
    number.textContent = String(index + 1).padStart(2, '0');
    const copy = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = step.label;
    const description = document.createElement('span');
    description.textContent = step.description;
    copy.append(title, description);
    card.append(number, copy);
    card.addEventListener('click', () => explain(index));
    if (legend) legend.append(card);
    const node = index < 7 ? document.querySelectorAll('.step-node')[index] : document.getElementById('refine');
    node.setAttribute('role', 'button');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-haspopup', 'dialog');
    node.setAttribute('aria-controls', dialog.id);
    node.setAttribute('aria-label', `${index + 1}. ${step.label}: open explanation`);
    const tooltip = document.createElementNS(ns, 'title');
    tooltip.textContent = `${step.label}: ${step.description} Select for more.`;
    node.prepend(tooltip);
    node.addEventListener('click', () => explain(index));
    node.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      explain(index);
    });
  });
})();
