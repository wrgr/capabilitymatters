/** Apply optional reading preferences without making baseline accessibility depend on storage or JavaScript. */
(() => {
  const key = 'capabilitymatters-accessibility-v1';
  const names = ['text', 'contrast', 'motion'];
  const root = document.documentElement;
  let settings = {};
  try { settings = JSON.parse(localStorage.getItem(key) || '{}') || {}; }
  catch (error) { console.warn('Accessibility preferences could not be read.', error); }
  /** Apply only known, boolean preferences; OS motion preferences still take precedence. */
  function apply() {
    names.forEach(name => root.toggleAttribute(`data-a11y-${name}`, settings[name] === true));
    document.dispatchEvent(new CustomEvent('accessibilitychange'));
  }
  apply();
  /** Mount the same native disclosure in standalone experiments and the Astro shell. */
  function mount() {
    let controls = document.querySelector('[data-accessibility-preferences]');
    if (!controls) {
      controls = document.createElement('div');
      controls.dataset.accessibilityPreferences = '';
      const skip = document.querySelector('a.skip, a.skip-link');
      if (skip) skip.after(controls); else document.body.prepend(controls);
    }
    controls.classList.add('accessibility-preferences');
    controls.innerHTML = '<details><summary>Accessibility preferences</summary><div class="preference-options"><label><input type="checkbox" data-preference="text"> Larger text</label><label><input type="checkbox" data-preference="contrast"> Higher contrast</label><label><input type="checkbox" data-preference="motion"> Reduced motion</label><button type="button" data-reset-preferences>Reset preferences</button><p role="status" class="preference-status"></p></div></details>';
    const status = controls.querySelector('[role="status"]');
    const inputs = controls.querySelectorAll('[data-preference]');
    /** Keep usable preferences for this page if browser storage is unavailable. */
    function save(message) {
      apply();
      inputs.forEach(input => { input.checked = settings[input.dataset.preference] === true; });
      try { localStorage.setItem(key, JSON.stringify(settings)); status.textContent = message; }
      catch (error) { status.textContent = message + ' These settings apply here; this browser cannot save them.'; console.warn('Accessibility preferences could not be saved.', error); }
    }
    inputs.forEach(input => {
      input.checked = settings[input.dataset.preference] === true;
      input.addEventListener('change', () => { settings[input.dataset.preference] = input.checked; save('Preferences updated.'); });
    });
    controls.querySelector('[data-reset-preferences]').addEventListener('click', () => { settings = {}; save('Preferences reset. Your system motion preference still applies.'); });
    window.addEventListener('storage', event => {
      if (event.key !== key) return;
      try { settings = JSON.parse(event.newValue || '{}') || {}; apply(); inputs.forEach(input => { input.checked = settings[input.dataset.preference] === true; }); }
      catch (error) { console.warn('Updated accessibility preferences could not be read.', error); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
