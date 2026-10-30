/** Inspect stage artifacts at a replay position with an opt-in isolated candidate preview. */
import {el, button, disclosure} from './dom.js';
import {stageLabels} from '../replay/stage-labels.js';

const POLICY = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; media-src 'none'; base-uri 'none'; form-action 'none'; navigate-to 'none'";

/** @param {HTMLElement} root @param {object} state @param {Function} seek @returns {void} Render visible artifact versions and their originating decisions. */
export function renderArtifacts(root, state, seek) {
  root.replaceChildren(el('h2', '', 'Artifacts at this point'));
  const artifacts = Object.values(state.artifacts);
  if (!artifacts.length) {
    root.append(el('p', 'empty-note', 'Stage artifacts appear after a recorded decision. Step forward to inspect how they develop.'));
    return;
  }
  for (const artifact of artifacts) {
    const panel = disclosure(`${stageLabels[artifact.id] || artifact.id} · revision ${artifact.revision}`, artifact === artifacts.at(-1));
    panel.append(el('h3', '', artifact.content.title), el('p', 'fingerprint', `Content SHA-256: ${artifact.content_hash}`),
      button(`Inspect source decision #${artifact.trigger_seq}`, () => seek(artifact.trigger_seq), 'text-action'),
      el('div', 'record-text artifact-text', artifact.content.body));
    const previous = state.events.filter(event => event.kind === 'artifact' && event.payload.id === artifact.id && event.payload.revision < artifact.revision).at(-1);
    if (previous) {
      const comparison = disclosure(`Compare previous revision ${previous.payload.revision}`);
      comparison.append(el('div', 'record-text artifact-text', previous.payload.content.body),
        button(`Go to previous artifact #${previous.seq}`, () => seek(previous.seq), 'text-action'));
      panel.append(comparison);
    }
    if (artifact.content.prototype_html) panel.append(preview(artifact.content.prototype_html));
    root.append(panel);
  }
}

/** @param {string} source @returns {HTMLElement} Keep generated code inert until the user opens a sandboxed preview. */
function preview(source) {
  const wrapper = el('div', 'candidate-preview');
  wrapper.append(el('p', 'muted small', 'Candidate implementation. The isolated preview blocks external resources and has no access to the surrounding page. Its behavior does not establish learning outcomes.'));
  const holder = el('div');
  const launch = button('Open isolated preview', () => {
    const frame = document.createElement('iframe');
    frame.title = 'Isolated generated candidate';
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.referrerPolicy = 'no-referrer';
    frame.setAttribute('csp', POLICY);
    frame.srcdoc = protectedSource(source);
    holder.replaceChildren(frame, button('Close preview', () => { holder.replaceChildren(); launch.hidden = false; }));
    launch.hidden = true;
  });
  const raw = disclosure('Inspect candidate source');
  raw.append(el('pre', 'prompt', source));
  wrapper.append(launch, holder, raw);
  return wrapper;
}

/** @param {string} source @returns {string} Pin network restrictions before any untrusted candidate content. */
function protectedSource(source) {
  // Template parsing remains inert: candidate images, frames, and scripts never enter the host document.
  const template = document.createElement('template');
  template.innerHTML = source;
  template.content.querySelectorAll('base,object,embed,iframe,meta[http-equiv="refresh" i]').forEach(node => node.remove());
  template.content.querySelectorAll('a[href]').forEach(node => node.removeAttribute('href'));
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${POLICY}">` + template.innerHTML;
}
