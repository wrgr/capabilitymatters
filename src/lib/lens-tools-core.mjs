export function programMap(input) {
  if (!input.capability.trim() || !input.standard.trim()) throw new Error('Describe the judgment capability and the faculty-agreed performance standard.');
  const stages = input.stages.map((stage, index) => {
    if (!stage.course.trim()) throw new Error(`Name the course or setting for stage ${index + 1}.`);
    const transferOpportunity = stage.opportunity === 'independent' && stage.context === 'new';
    const direct = ['guided', 'independent'].includes(stage.evidence);
    const documented = direct && Boolean(stage.note.trim());
    const observedContext = ['familiar', 'new'].includes(stage.observedContext) ? stage.observedContext : 'unknown';
    const transferEvidence = documented && stage.evidence === 'independent' && observedContext === 'new';
    let finding = 'No direct performance evidence; activity and completion do not establish judgment.';
    if (direct && !documented) finding = 'Performance evidence selected but not described. Treat this stage as undocumented.';
    if (documented) finding = stage.result === 'met'
      ? 'Reported standard met on this sample; faculty must verify the evidence.'
      : stage.result === 'not-yet' ? 'Reported standard not yet met; review feedback and another practice opportunity.'
        : 'Performance sample documented; judgment against the standard remains unknown.';
    return { ...stage, observedContext, transferOpportunity, transferEvidence, finding };
  });
  return {
    capability: input.capability.trim(), standard: input.standard.trim(), stages,
    missingOpportunities: stages.filter(stage => !stage.transferOpportunity).map(stage => stage.course),
    demonstratedTransfer: stages.filter(stage => stage.transferEvidence && stage.result === 'met').map(stage => stage.course),
    evidenceGaps: stages.filter(stage => !stage.transferEvidence).map(stage => stage.course)
  };
}

export function frontlineDiagnostic(input) {
  if (!input.task.trim() || !input.standard.trim()) throw new Error('Describe the task and the expected observable performance.');
  const direct = input.source === 'direct' && Boolean(input.observation.trim());
  const supportedKnown = direct && Boolean(input.supportNote.trim()) && ['can', 'cannot'].includes(input.supported);
  const unknowns = [];
  if (!direct) unknowns.push('Task performance is unknown: missing direct observation. Completion, throughput, and error totals alone cannot diagnose a worker.');
  if (!supportedKnown) unknowns.push('Performance with clear instructions, working equipment, adequate time, and agreed accommodations is unknown.');
  if (!input.voice.trim()) unknowns.push('Worker account and opportunity to challenge the explanation are missing.');
  const constraints = [];
  const reviewed = [];
  input.conditions.forEach(condition => {
    if (condition.state === 'unknown' || !condition.note.trim()) unknowns.push(`${condition.label}: unknown or undocumented; absence of evidence is not evidence of absence.`);
    else if (condition.state === 'present') constraints.push(`${condition.label}: reported constraint — ${condition.note.trim()}`);
    else reviewed.push(`${condition.label}: reported not observed in this sample — ${condition.note.trim()}`);
  });
  const trainingHypotheses = [];
  if (supportedKnown && input.supported === 'cannot') trainingHypotheses.push('A task-specific knowledge or practice gap is one hypothesis: difficulty was reported even under supported conditions. Confirm with the worker and another task sample; this is not a diagnosis.');
  const actions = [];
  if (constraints.length) actions.push('Ask the appropriate process owner to investigate the reported system constraints before attributing errors to training. Do not recreate unsafe conditions for a test.');
  if (supportedKnown && input.supported === 'can') actions.push('Reported success under supported conditions weakens a general training-deficit explanation. Compare workflow and operating conditions with the worker.');
  if (trainingHypotheses.length) actions.push('Offer a small, voluntary practice-and-feedback trial against the stated task standard, alongside any system repair. Evaluate a later independent sample.');
  if (unknowns.length) actions.push('Resolve unknowns through a consent-based task walkthrough and worker discussion before deciding on an intervention.');
  if (!actions.length) actions.push('Review another representative task sample with the worker before choosing an intervention.');
  return { ...input, directObservation: direct, unknowns, constraints, reviewed, trainingHypotheses, actions };
}

export function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

const normalize = value => value.trim().toLowerCase().replace(/\s+/g, ' ');
const overlaps = (first, second) => (!first.unit || !second.unit || normalize(first.unit) === normalize(second.unit)) && (!first.role || !second.role || normalize(first.role) === normalize(second.role));

export function harmonizeRules(input) {
  if (!input.task.trim() || !input.unit.trim() || !input.role.trim()) throw new Error('Enter the common task, target unit, and target role.');
  if (!input.rules.length) throw new Error('Add at least one source rule.');
  const rules = input.rules.map((rule, index) => {
    const id = `R${index + 1}`;
    if (!rule.decision.trim() || !rule.action.trim() || !rule.source.trim()) throw new Error(`${id}: provide a decision key, rule text, and source document / section.`);
    const needsUnit = ['unit', 'unit-role'].includes(rule.scope);
    const needsRole = ['role', 'unit-role'].includes(rule.scope);
    if ((needsUnit && !rule.unit.trim()) || (needsRole && !rule.role.trim())) throw new Error(`${id}: complete the unit / role required by its scope.`);
    return { ...rule, id, unit: needsUnit ? rule.unit.trim() : '', role: needsRole ? rule.role.trim() : '', sourceUrl: safeSourceUrl(rule.url), governanceReady: rule.review === 'reviewed' && Boolean(rule.owner.trim()) && Boolean(rule.version.trim()) };
  });
  const conflicts = [];
  const matches = [];
  for (let first = 0; first < rules.length; first++) {
    for (let second = first + 1; second < rules.length; second++) {
      const left = rules[first];
      const right = rules[second];
      if (normalize(left.decision) !== normalize(right.decision)) continue;
      if (normalize(left.action) === normalize(right.action)) matches.push({ ids: [left.id, right.id], message: 'Matching wording is only a comparison candidate. It does not confirm equivalent policy, scope, authority, or effective dates.' });
      else if (overlaps(left, right)) conflicts.push({ ids: [left.id, right.id], message: 'Potential conflict: different instructions share a decision key and overlapping scope. Ask the source owners to reconcile conditions and authority; no automatic winner.' });
    }
  }
  const blocked = new Set(conflicts.flatMap(conflict => conflict.ids));
  const applicable = rules.filter(rule => (!rule.unit || normalize(rule.unit) === normalize(input.unit)) && (!rule.role || normalize(rule.role) === normalize(input.role)));
  return {
    ...input, rules, conflicts, matches,
    common: rules.filter(rule => rule.scope === 'system'),
    variants: rules.filter(rule => rule.scope !== 'system'),
    unreviewed: rules.filter(rule => !rule.governanceReady).map(rule => rule.id),
    branch: applicable.map(rule => ({ ...rule, held: blocked.has(rule.id) || !rule.governanceReady })),
    branchHeld: applicable.length === 0 || applicable.some(rule => blocked.has(rule.id) || !rule.governanceReady)
  };
}
