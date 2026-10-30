/** Build accessible controls without interpreting configuration or model output as markup. */
let labelIndex = 0;

/** @param {string} tag @param {string} [className] @param {string} [text] @returns {HTMLElement} Create a text-safe element. */
export function el(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** @param {string} text @param {Function} action @param {string} [className] @returns {HTMLButtonElement} Create a non-submitting action. */
export function button(text, action, className = '') {
  const node = el('button', className, text);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

/** @param {string} label @param {string|number} value @param {Function} change @param {object} [options] @returns {HTMLElement} Bind a labeled text control. */
export function field(label, value, change, options = {}) {
  const wrapper = el('label', 'field');
  const title = el('span', 'field-label', label);
  title.id = `control-label-${++labelIndex}`;
  wrapper.append(title);
  const input = document.createElement(options.multiline ? 'textarea' : 'input');
  input.setAttribute('aria-labelledby', title.id);
  if (!options.multiline) input.type = options.type || 'text';
  input.value = String(value ?? '');
  for (const key of ['min', 'max', 'maxLength', 'rows', 'placeholder', 'step']) {
    if (options[key] !== undefined) input[key] = options[key];
  }
  if (options.required) input.required = true;
  input.addEventListener('input', () => change(input.type === 'number' ? Number(input.value) : input.value));
  wrapper.append(input);
  if (options.help) {
    const help = el('small', 'muted', options.help);
    help.id = `${title.id}-help`; input.setAttribute('aria-describedby', help.id); wrapper.append(help);
  }
  return wrapper;
}

/** @param {string} label @param {string} value @param {Array} options @param {Function} change @returns {HTMLElement} Bind a labeled selection control. */
export function select(label, value, options, change) {
  const wrapper = el('label', 'field');
  const title = el('span', 'field-label', label);
  title.id = `control-label-${++labelIndex}`;
  wrapper.append(title);
  const input = document.createElement('select');
  input.setAttribute('aria-labelledby', title.id);
  for (const option of options) {
    const [key, text] = typeof option === 'string' ? [option, option] : option;
    input.add(new Option(text, key));
  }
  input.value = value;
  input.addEventListener('change', () => change(input.value));
  wrapper.append(input);
  return wrapper;
}

/** @param {string} label @param {boolean} checked @param {Function} change @returns {HTMLElement} Bind a labeled boolean control. */
export function check(label, checked, change) {
  const wrapper = el('label', 'check');
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => change(input.checked));
  wrapper.append(input, el('span', '', label));
  return wrapper;
}

/** @param {string} title @param {boolean} [open] @returns {HTMLDetailsElement} Create an accessible disclosure. */
export function disclosure(title, open = false) {
  const node = el('details', 'disclosure');
  node.open = open;
  node.append(el('summary', '', title));
  return node;
}

/** @param {unknown} value @returns {HTMLPreElement} Display data as literal JSON. */
export function jsonBlock(value) {
  return el('pre', 'json', JSON.stringify(value, null, 2));
}

/** @param {unknown} value @param {string} name @returns {void} Download an original JSON record. */
export function downloadJSON(value, name) {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name.replace(/[^a-zA-Z0-9_.-]/g, '-');
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** @param {File} file @returns {Promise<unknown>} Read a bounded local JSON file without uploading it. */
export async function readJSON(file) {
  if (!file) throw new Error('Choose a JSON file.');
  if (file.size > 30 * 1024 * 1024) throw new Error('Choose a JSON record smaller than 30 MB.');
  return JSON.parse(await file.text());
}
