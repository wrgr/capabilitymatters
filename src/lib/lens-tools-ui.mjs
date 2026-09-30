import { programMap, frontlineDiagnostic, harmonizeRules } from './lens-tools-core.mjs';

function paragraph(parent, value) {
  const element = document.createElement('p');
  element.textContent = value;
  parent.append(element);
}

function section(parent, title, lines) {
  const element = document.createElement('section');
  element.className = 'panel';
  const heading = document.createElement('h3');
  heading.textContent = title;
  element.append(heading);
  lines.forEach(line => paragraph(element, line));
  parent.append(element);
}

function wire(root, compute, render, filename) {
  const form = root.querySelector('form');
  const output = root.querySelector('[data-output]');
  const status = root.querySelector('[data-status]');
  const download = root.querySelector('[data-export]');
  let report = null;
  const invalidate = () => {
    report = null;
    download.disabled = true;
    output.replaceChildren();
    output.hidden = true;
    status.textContent = 'Inputs changed. Review again to update the result.';
  };
  form.addEventListener('input', invalidate);
  form.addEventListener('change', invalidate);
  form.addEventListener('reset', () => { invalidate(); status.textContent = 'Reset to the initial example. No results retained.'; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    invalidate();
    try {
      report = compute(new FormData(form), form);
      render(output, report);
      output.hidden = false;
      download.disabled = false;
      status.textContent = 'Review updated. These are inspectable rules, not validated conclusions.';
    } catch (error) { status.textContent = error.message; }
  });
  download.addEventListener('click', () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify({ limitation: 'Local rule-based planning aid; human verification required. No AI analysis or policy validation.', ...report }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Export prepared. The downloaded file contains your entries; share deliberately.';
  });
  form.querySelector('[data-client-gate]').disabled = false;
}

export function mountProgram(root) {
  if (!root) return;
  wire(root, data => programMap({
    capability: String(data.get('capability') || ''), standard: String(data.get('standard') || ''),
    stages: [0, 1, 2].map(index => Object.fromEntries(['course', 'opportunity', 'context', 'observedContext', 'evidence', 'result', 'note'].map(key => [key, String(data.get(`${key}-${index}`) || '')])))
  }), (output, report) => {
    section(output, 'Program evidence map', [report.capability, `Standard: ${report.standard}`, 'This maps opportunities and reported samples, not student readiness or program quality.']);
    report.stages.forEach(stage => section(output, stage.course, [
      stage.transferOpportunity ? 'Independent transfer opportunity planned: a new context without scaffolding.' : 'Missing independent transfer opportunity: plan a new-context task without scaffolding.',
      stage.finding,
      `Observed sample context: ${stage.observedContext}. Planned context does not establish the sample's context.`,
      stage.transferEvidence ? 'Independent transfer sample documented; this does not establish general transfer.' : 'No documented independent transfer sample at this stage.',
      `Evidence note: ${stage.note.trim() || 'Not supplied.'}`
    ]));
    section(output, 'Next faculty review', [
      `Stages missing an independent transfer opportunity: ${report.missingOpportunities.join('; ') || 'None in this plan.'}`,
      `Reported standard met on independent transfer samples: ${report.demonstratedTransfer.join('; ') || 'None documented.'}`,
      'Compare early, middle, and later samples against the same rubric. Add complexity deliberately; these rules cannot judge task difficulty, evidence quality, or faculty agreement.',
      'Test with an unseen case after a delay, allow accessible equivalent formats, and record rubric agreement rather than clicks or completion.'
    ]);
  }, 'program-judgment-map.json');
}

export function mountFrontline(root) {
  if (!root) return;
  wire(root, data => frontlineDiagnostic({
    ...Object.fromEntries(['task', 'standard', 'source', 'observation', 'supported', 'supportNote', 'voice'].map(key => [key, String(data.get(key) || '')])),
    conditions: ['Instructions / workflow', 'Equipment / interface', 'Staffing / time', 'Incentives / competing goals'].map((label, index) => ({ label, state: String(data.get(`state-${index}`)), note: String(data.get(`note-${index}`) || '') }))
  }), (output, report) => {
    section(output, 'Observation boundary', [report.task, `Expected: ${report.standard}`, report.directObservation ? 'A direct task observation was supplied; its accuracy and causal meaning remain unverified.' : 'Only unknown or proxy evidence is available. No worker capability inference is made.', `Observation: ${report.observation || 'Not supplied.'}`, `Worker account: ${report.voice || 'Not supplied.'}`]);
    section(output, 'Unknown observations', report.unknowns.length ? report.unknowns : ['No checklist items remain unknown; this is not a complete causal investigation.']);
    section(output, 'Reported system constraints', report.constraints.length ? report.constraints : ['No documented constraints reported. This does not rule out system causes.']);
    if (report.reviewed.length) section(output, 'Conditions reviewed in this sample', report.reviewed);
    section(output, 'Training hypotheses', report.trainingHypotheses.length ? report.trainingHypotheses : ['No training hypothesis supported by these inputs. Do not assign training from weak proxies.']);
    section(output, 'Next investigation', [...report.actions, 'Compare errors per comparable task opportunity, rework, worker burden, and delayed independent task performance. Record false training recommendations and changes in operating conditions. No person ranking or automated employment decision is justified.']);
  }, 'frontline-performance-diagnostic.json');
}

function renderRule(parent, rule) {
  section(parent, `${rule.id} · ${rule.decision}`, [
    `Declared scope: ${rule.scope}; unit: ${rule.unit || 'all'}; role: ${rule.role || 'all'}.`, rule.action,
    `Source: ${rule.source}. Version / effective date: ${rule.version || 'unknown'}. Owner: ${rule.owner || 'unknown'}.`,
    rule.governanceReady ? 'User reports owner review; this tool cannot authenticate the source or approval.' : 'HOLD: source-owner review, owner, or version is missing.'
  ]);
  if (rule.sourceUrl) {
    const link = document.createElement('a');
    link.textContent = `Open source for ${rule.id} (leaves this page)`;
    link.href = rule.sourceUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    parent.lastElementChild.append(link);
  } else if (rule.url.trim()) paragraph(parent.lastElementChild, 'Source link omitted: only valid HTTP(S) links without embedded credentials are supported.');
}

export function bindRuleReviewInvalidation(rows) {
  const invalidate = event => {
    if (!['action', 'source', 'version', 'owner', 'scope', 'decision', 'unit', 'role', 'url'].includes(event.target.name)) return;
    const row = event.target.closest('fieldset');
    if (row) row.querySelector('[name="review"]').value = 'pending';
  };
  rows.addEventListener('input', invalidate);
  rows.addEventListener('change', invalidate);
}

export function mountHarmonization(root) {
  if (!root) return;
  const form = root.querySelector('form');
  const rows = root.querySelector('[data-rules]');
  const initial = [...rows.children].map(row => row.cloneNode(true));
  bindRuleReviewInvalidation(rows);
  root.querySelector('[data-add-rule]').addEventListener('click', () => {
    const row = initial[0].cloneNode(true);
    row.querySelectorAll('input, textarea').forEach(input => { input.value = ''; });
    row.querySelector('[name="scope"]').value = 'unit';
    row.querySelector('[name="review"]').value = 'pending';
    rows.append(row);
    renumber();
    form.dispatchEvent(new Event('input', { bubbles: true }));
    row.querySelector('input').focus();
  });
  function renumber() {
    [...rows.children].forEach((row, index) => {
      row.querySelector('legend').textContent = `Source rule R${index + 1}`;
      row.querySelector('[data-remove-rule]').setAttribute('aria-label', `Remove source rule R${index + 1}`);
    });
  }
  rows.addEventListener('click', event => {
    const button = event.target.closest('[data-remove-rule]');
    if (!button) return;
    button.closest('fieldset').remove();
    renumber();
    form.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('[data-add-rule]').focus();
  });
  form.addEventListener('reset', () => { rows.replaceChildren(...initial.map(row => row.cloneNode(true))); renumber(); });
  wire(root, data => harmonizeRules({
    task: String(data.get('task') || ''), unit: String(data.get('targetUnit') || ''), role: String(data.get('targetRole') || ''),
    rules: [...rows.children].map(row => Object.fromEntries(['decision', 'action', 'source', 'url', 'scope', 'unit', 'role', 'owner', 'version', 'review'].map(key => [key, row.querySelector(`[name="${key}"]`).value])))
  }), (output, report) => {
    section(output, 'Comparison boundaries', [
      `Task: ${report.task}. Target: ${report.unit} / ${report.role}.`,
      'Scope is declared by you. Decision keys only group rules for comparison. Different keys may conceal conflicts; matching words never establish policy equivalence. All rule IDs refer to this current review.',
      `Rules awaiting documented owner review: ${report.unreviewed.join(', ') || 'None reported; approvals remain unverified.'}`
    ]);
    section(output, 'Potential conflicts — owner decision required', report.conflicts.length ? report.conflicts.map(conflict => `${conflict.ids.join(' ↔ ')}: ${conflict.message}`) : ['No conflicts detected by decision-key and scope comparison. This is not evidence that all rules are compatible.']);
    section(output, 'Matching wording — equivalence unconfirmed', report.matches.length ? report.matches.map(match => `${match.ids.join(' ↔ ')}: ${match.message}`) : ['No same-key wording matches found. No semantic comparison is performed.']);
    section(output, 'Declared common rules — candidates for a shared core', ['Rules remain separately source-linked; no automatic merging or approval.']);
    if (!report.common.length) paragraph(output.lastElementChild, 'No system-wide rules declared.');
    report.common.forEach(rule => renderRule(output, rule));
    section(output, 'Unit / role-specific rules', ['These differences are retained as explicit branches.']);
    if (!report.variants.length) paragraph(output.lastElementChild, 'No local or role-specific rules declared.');
    report.variants.forEach(rule => renderRule(output, rule));
    section(output, 'Target practice branch', [report.branchHeld ? 'HOLD for source-owner review: the target has unresolved rules or no applicable rules. Do not use this as operational guidance.' : 'Draft for human review only. Reported approvals do not establish completeness, current policy, or equivalent training.', 'Discussion prompt: perform the target task, explain which source governs each decision, and identify what would change in another unit or role.']);
    report.branch.forEach(rule => paragraph(output.lastElementChild, `${rule.id} · ${rule.held ? 'HOLD' : 'Draft'} · ${rule.decision}: ${rule.action} [${rule.source}]`));
    paragraph(output.lastElementChild, 'Next: source owners reconcile overlapping instructions and check missing conditions. Compare maintenance time with scenario accuracy and local exception errors before consolidating courses.');
  }, 'training-harmonization-review.json');
}
