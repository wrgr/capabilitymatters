import { navigate, compareDrafts, familyTemplate, startCuriosity, finishCuriosity, required, languageTasks, rehearseLanguage, reviseLanguage } from './aile-access.js';

export function setupAccessTools() {
  document.querySelectorAll('[data-aile-access]').forEach(root => {
    if (root.dataset.ready) return;
    root.dataset.ready = 'true';
    const status = root.querySelector('[data-status]');
    const result = root.querySelector('[data-result]');
    const output = root.querySelector('[data-output]');
    const download = root.querySelector('[data-export]');
    let record = '';
    let cycle = null;
    let savedAttempt = '';
    let rehearsal = null;
    const history = [];
    const invalidate = () => {
      record = '';
      output.textContent = '';
      result.hidden = true;
      download.disabled = true;
      status.textContent = 'Inputs changed. Prepare new guidance to update the record.';
    };
    const changed = event => {
      const approval = root.querySelector('[name="reviewed"]');
      if (approval && event.target !== approval) approval.checked = false;
      if (root.dataset.aileAccess === 'curiosity') {
        if (['goal', 'path', 'custom'].includes(event.target.name)) {
          cycle = null;
          savedAttempt = '';
          root.querySelector('[data-cycle-work]').hidden = true;
          root.querySelector('[data-challenge]').textContent = '';
        }
        if (event.target.name === 'attempt') {
          savedAttempt = '';
          root.querySelector('[data-reflect]').hidden = true;
          root.elements.namedItem('reflection').value = '';
          root.elements.namedItem('reason').value = '';
        }
      }
      if (root.dataset.aileAccess === 'language' && ['task', 'attempt', 'context', 'home'].includes(event.target.name)) {
        rehearsal = null;
        root.querySelector('[data-language-revision]').hidden = true;
        root.querySelector('[data-language-hints]').textContent = '';
        for (const name of ['revision', 'reply', 'reflection', 'transfer']) root.elements.namedItem(name).value = '';
        root.querySelector('[data-situation]').textContent = languageTasks[root.elements.namedItem('task').value].situation;
      }
      invalidate();
    };
    root.addEventListener('input', changed);
    root.addEventListener('change', changed);
    root.querySelector('[data-template]')?.addEventListener('click', () => {
      for (const [name, value] of Object.entries(familyTemplate)) root.elements.namedItem(name).value = value;
      const approval = root.querySelector('[name="reviewed"]');
      if (approval) approval.checked = false;
      invalidate();
      status.textContent = 'Authored English/Spanish practice template loaded. Human review is still needed.';
    });
    root.querySelector('[data-start-cycle]')?.addEventListener('click', () => {
      invalidate();
      try {
        cycle = startCuriosity(Object.fromEntries(new FormData(root)));
        savedAttempt = '';
        for (const name of ['attempt', 'reflection', 'reason']) root.elements.namedItem(name).value = '';
        root.querySelector('[data-challenge]').textContent = cycle.challenge;
        root.querySelector('[data-cycle-work]').hidden = false;
        root.querySelector('[data-reflect]').hidden = true;
        status.textContent = 'Your chosen challenge is ready. Try it before opening the reflection prompts.';
        root.elements.namedItem('attempt').focus();
      } catch (error) { status.textContent = error.message; }
    });
    root.querySelector('[data-save-attempt]')?.addEventListener('click', () => {
      invalidate();
      try {
        if (!cycle) throw new Error('Start your chosen challenge first.');
        savedAttempt = required(root.elements.namedItem('attempt').value, 'an attempt');
        root.querySelector('[data-reflect]').hidden = false;
        root.querySelector('[data-hint]').textContent = cycle.hint;
        status.textContent = 'Attempt recorded. Reflect on evidence and choose your own next step.';
        root.elements.namedItem('reflection').focus();
      } catch (error) { status.textContent = error.message; }
    });
    root.querySelector('[data-language-attempt]')?.addEventListener('click', () => {
      invalidate();
      try {
        rehearsal = rehearseLanguage(Object.fromEntries(new FormData(root)));
        root.querySelector('[data-language-hints]').textContent = rehearsal.text;
        root.querySelector('[data-language-revision]').hidden = false;
        root.elements.namedItem('revision').value = rehearsal.attempt;
        status.textContent = 'First attempt recorded. Authored hints and a partner turn are now available. Review and revise in your own words.';
        root.elements.namedItem('revision').focus();
      } catch (error) { status.textContent = error.message; }
    });
    root.addEventListener('reset', () => {
      invalidate();
      cycle = null;
      savedAttempt = '';
      rehearsal = null;
      history.length = 0;
      root.querySelectorAll('[data-cycle-work], [data-reflect], [data-language-revision]').forEach(section => { section.hidden = true; });
      const challenge = root.querySelector('[data-challenge]');
      if (challenge) challenge.textContent = '';
      const hints = root.querySelector('[data-language-hints]');
      if (hints) hints.textContent = '';
      const situation = root.querySelector('[data-situation]');
      if (situation) situation.textContent = languageTasks.clarify.situation;
      status.textContent = 'Practice reset. No entries retained.';
    });
    root.addEventListener('submit', event => {
      event.preventDefault();
      invalidate();
      try {
        const values = Object.fromEntries(new FormData(root));
        if (root.dataset.aileAccess === 'curiosity') {
          if (!savedAttempt || savedAttempt !== values.attempt.trim()) throw new Error('Record your current attempt before saving a reflection.');
          const completed = finishCuriosity(cycle, values);
          history.push(completed.text);
          record = `CURIOSITY PRACTICE JOURNAL — local self-report, not an assessment\n\n${history.map((entry, index) => `Cycle ${index + 1}\n${entry}`).join('\n\n———\n\n')}`;
          cycle = null;
          savedAttempt = '';
          root.querySelector('[data-cycle-work]').hidden = true;
          root.querySelector('[data-challenge]').textContent = 'Cycle saved. Your path selection is unchanged. Start another challenge when you choose.';
        } else if (root.dataset.aileAccess === 'language') {
          record = reviseLanguage(rehearsal, values).text;
        } else record = (root.dataset.aileAccess === 'communication' ? compareDrafts(values) : navigate(values)).text;
        output.textContent = record;
        result.hidden = false;
        download.disabled = false;
        status.textContent = 'Current record ready. You can download it, revise inputs, or reset. Nothing has been sent.';
      } catch (error) { status.textContent = error.message; }
    });
    download.addEventListener('click', () => {
      if (!record) return;
      const url = URL.createObjectURL(new Blob([record], { type: 'text/plain;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${root.dataset.aileAccess}-practice.txt`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    root.querySelector('[data-local-controls]').disabled = false;
  });
}
