/** Explain pinned typed agent contracts as inspectable instructions rather than inferred capabilities. */
import {el, disclosure, jsonBlock} from './dom.js';

/** @param {object|null} contract @param {object} specs @returns {HTMLElement} Render a shared signature and each effective execution profile. */
export function contractView(contract, specs = {}) {
  const panel = disclosure('Standard agent signature and effective profiles');
  if (!contract) {
    panel.append(el('p', 'muted small', 'This record predates the standardized agent signature. Its original role contract remains available below.'));
    return panel;
  }
  panel.append(el('p', 'muted small', `Contract ${contract.id} · version ${contract.version}. Every turn uses the same typed inputs and outputs.`),
    el('pre', 'signature', contract.signature?.notation || ''));
  const types = disclosure('Typed inputs and outputs');
  types.append(typedFields('Inputs', contract.input_schema), typedFields('Outputs', contract.output_schema));
  panel.append(types);
  for (const [key, spec] of Object.entries(specs)) panel.append(specView(key, spec));
  const policy = disclosure('Context, tools, evidence, and stopping rules');
  policy.append(jsonBlock({context: contract.context_policy, tools: contract.tool_policy, evidence: contract.evidence_policy, stopping: contract.stopping_conditions}));
  panel.append(policy);
  if (contract.scope) panel.append(el('p', 'muted small', typeof contract.scope === 'string' ? contract.scope : JSON.stringify(contract.scope)));
  return panel;
}

/** @param {string} title @param {object} schema @returns {HTMLElement} Present named typed fields without hiding the original schemas. */
function typedFields(title, schema) {
  const block = el('div'); block.append(el('h4', '', title));
  const list = el('dl', 'signature-fields');
  for (const [key, value] of Object.entries(schema?.properties || {})) {
    list.append(el('dt', '', key), el('dd', '', `${Array.isArray(value.type) ? value.type.join(' / ') : value.type || '$ref'}${schema.required?.includes(key) ? ' · required' : ''}${value.description ? ` — ${value.description}` : ''}`));
  }
  block.append(list);
  const raw = disclosure(`Original ${title.toLowerCase()} JSON schema`); raw.append(jsonBlock(schema)); block.append(raw);
  return block;
}

/** @param {string} key @param {object} spec @returns {HTMLElement} Explain one actual profile including its stable executing identity. */
function specView(key, spec) {
  const panel = disclosure(`${spec.identity?.display_name || spec.identity?.actor_id || key} · ${key}`);
  panel.append(el('p', '', spec.purpose?.objective || spec.purpose?.role || ''),
    el('p', 'muted small', `Executing identity: ${spec.identity?.actor_id || key}. Authority: ${spec.authority?.level || 'Unspecified'}. Requested tools: ${spec.authority?.requested_tools?.join(', ') || 'None'}.`));
  if (spec.authority?.instruction) panel.append(el('p', 'muted small', spec.authority.instruction));
  const duties = el('ul');
  for (const text of spec.effective_duties || []) duties.append(el('li', '', text));
  panel.append(duties, el('p', 'fingerprint', `Agent specification SHA-256: ${spec.spec_hash || 'Not recorded'}`));
  const raw = disclosure('Exact agent specification'); raw.append(jsonBlock(spec)); panel.append(raw);
  return panel;
}
