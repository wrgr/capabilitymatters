export const teacherCases = [
  { title: 'Writing feedback under time pressure', context: 'You have 28 argument drafts and 35 minutes. The goal is for students to revise the link between evidence and claim. Fictional school policy permits approved AI with de-identified excerpts and teacher review, but prohibits identifiable uploads and automatic grading.', choices: [
    ['Upload named drafts and release generated comments', 'Fast turnaround, but names leave the classroom and students may receive invented criticisms. This violates this scenario’s policy. Repair: withdraw unrevised comments, follow local incident procedures, and review the evidence yourself.'],
    ['Use de-identified excerpts with a rubric; review each suggestion', 'The draft suggestion says “add more evidence,” although the excerpt already has two examples. Reject that suggestion and ask how the examples support the claim. Rubric grounding helps focus review; it does not guarantee accuracy. Budget time for checking every comment.'],
    ['Use teacher-only planning and peer review', 'No student writing leaves the classroom. You model one evidence-to-claim revision, then pairs use a checklist. This saves individual commenting time but may miss a quiet learner’s misconception; sample revisions and offer a private check-in.']
  ] },
  { title: 'A polished explanation that hides the target skill', context: 'Tomorrow students must independently compare two competing explanations. A generated model paragraph looks fluent but states a cause not supported by the provided sources. Fictional policy allows teacher planning with public sources only.', choices: [
    ['Give the paragraph as an authoritative model to copy', 'Students can reproduce polished prose without comparing evidence. The unsupported causal claim becomes an apparent fact. Remove the unsupported claim and assess a fresh source comparison without a model.'],
    ['Turn the paragraph into a source-check exercise', 'Students annotate which claims each source supports, then revise the unsupported claim. Provide a plain-language version and a paper option. A fresh independent comparison is still needed to test transfer.'],
    ['Skip AI and compare two teacher-selected explanations', 'This directly rehearses the target capability and avoids generated misinformation. It takes preparation time; keep the same evidence checklist and independent transfer task to compare learning fairly.']
  ] }
];

export function teacherFeedback(caseIndex, choice, reasoning) {
  if (!reasoning.trim()) throw new Error('Explain your reasoning before revealing consequences.');
  const scenario = teacherCases[caseIndex];
  if (!scenario || !Number.isInteger(choice) || !scenario.choices[choice]) throw new Error('Choose a decision.');
  return scenario.choices[choice][1];
}
export const workflowActions = { isolate: 'Isolate power', connect: 'Connect signal cable', configure: 'Load station profile', power: 'Power on', test: 'Run handshake test', inspect: 'Inspect diagnostic panel', repair: 'Reseat signal connector', release: 'Release station' };
export function newWorkflow() {
  return { powered: true, connected: false, configured: false, fault: true, inspected: false, tested: false, passed: false, released: false, errors: 0, hints: 0, log: [] };
}
export function workflowStep(previous, action, prediction) {
  if (!workflowActions[action] || !prediction?.trim()) throw new Error('Choose an action and predict its outcome.');
  const state = { ...previous, log: [...previous.log] };
  let message;
  let blocked = false;
  if (state.released) { message = 'Station already released. Reset for another run.'; blocked = true; }
  else if (action === 'isolate') { state.powered = false; state.passed = false; message = 'Power isolated. Connector work is now available.'; }
  else if (action === 'connect' || action === 'configure' || action === 'repair') {
    if (state.powered) { message = 'Blocked: isolate power before changing the fictional station.'; blocked = true; }
    else if (action === 'repair' && !state.inspected) { message = 'Blocked: inspect diagnostic evidence before choosing a repair.'; blocked = true; }
    else {
      state.passed = false;
      if (action === 'connect') { state.connected = true; message = 'Cable connected. Connection quality is still unverified.'; }
      if (action === 'configure') { state.configured = true; message = 'Station profile loaded.'; }
      if (action === 'repair') { state.fault = false; message = 'Signal connector reseated. Run a new handshake test before release.'; }
    }
  } else if (action === 'power') { state.powered = true; message = 'Power on. This alone does not verify readiness.'; }
  else if (action === 'test') {
    if (!state.powered || !state.connected || !state.configured) { message = 'Test unavailable: power, cable and profile are all required.'; blocked = true; }
    else { state.tested = true; state.passed = !state.fault; message = state.passed ? 'Handshake passed. The station can be released.' : 'Handshake failed: intermittent signal. Investigate before release.'; }
  } else if (action === 'inspect') {
    if (!state.tested) { message = 'No diagnostic trace yet. Run the handshake test first.'; blocked = true; }
    else { state.inspected = true; message = state.fault ? 'Trace: profile matches; signal drops at connector C. A reseat with power isolated is the supported repair in this toy model.' : 'Connector C stable. A fresh passed handshake is still required after any change.'; }
  } else if (action === 'release') {
    if (!state.passed || !state.powered) { message = 'Release blocked: a current passed handshake with power on is required.'; blocked = true; }
    else { state.released = true; message = 'Station released. Review the sequence and try a run without hints.'; }
  }
  if (blocked) state.errors += 1;
  state.log.push({ action, prediction: prediction.trim(), message, blocked });
  return state;
}
export function workflowHint(state) {
  if (state.released) return 'Reset and repeat without hints, then compare with a paper sequence task.';
  if (state.powered && (!state.connected || !state.configured || (state.inspected && state.fault))) return 'Check whether power must be isolated before changing the station.';
  if (!state.connected) return 'The controller needs a signal cable.';
  if (!state.configured) return 'The station needs its configuration profile.';
  if (state.tested && state.fault && !state.inspected) return 'Use the diagnostic trace to distinguish configuration from signal trouble.';
  if (state.inspected && state.fault) return 'The trace points to connector C. What change is supported by that evidence?';
  if (!state.powered) return 'Power is required to run a handshake.';
  if (!state.passed) return 'Verify the current setup with a handshake test.';
  return 'A passed handshake permits release in this fictional model.';
}
export const clinicalCases = [
  { title: 'Conflicting review status', sources: ['A · Fictional intake checklist, 09:00: review status = pending; reviewer signature = blank.', 'B · Fictional handoff summary, 09:15: review status = complete; no linked review record.'], advice: 'Scripted AI: The later summary proves review is complete. Treat the record as fully verified.', expected: 'contradictory', response: 'challenge', feedback: 'A and B conflict, and B provides no linked verification. A later timestamp alone does not resolve the discrepancy. Challenge the certainty and seek the original review record; do not infer anything about diagnosis or care.' },
  { title: 'An incomplete handoff packet', sources: ['A · Fictional packet index: attachment R is required to document reviewer sign-off.', 'B · Fictional attachment inventory: R absent; status field blank.'], advice: 'Scripted AI: The status field is blank. Ask someone to fill it in.', expected: 'missing', response: 'investigate', feedback: 'The suggestion notices the blank field but omits missing attachment R. Investigate the underlying sign-off record before filling a field. Filling a blank is not evidence that a review happened.' },
  { title: 'A supported administrative check', sources: ['A · Fictional packet index: required attachment R; review status = complete.', 'B · Fictional attachment R: matching packet ID, reviewer sign-off present, review status = complete.'], advice: 'Scripted AI: These two supplied records agree on administrative sign-off. No discrepancy is visible in this limited packet; this says nothing about clinical adequacy.', expected: 'supported', response: 'accept', feedback: 'The limited administrative claim is supported by A and B. Accepting a bounded supported claim is appropriate; automatic distrust is not calibration. This does not establish authenticity, clinical adequacy, diagnosis or treatment.' }
];
export function commitClinical(caseIndex, assessment, changeEvidence, missing, confidence) {
  if (!clinicalCases[caseIndex]) throw new Error('Choose a case.');
  if (![assessment, changeEvidence, missing].every(value => typeof value === 'string' && value.trim())) throw new Error('Complete your independent assessment, change-of-mind evidence, and missing-information reflection first.');
  if (!['low', 'medium', 'high'].includes(confidence)) throw new Error('Choose your confidence.');
  return { caseIndex, assessment: assessment.trim(), changeEvidence: changeEvidence.trim(), missing: missing.trim(), confidence };
}
export function clinicalFeedback(committed, evidence, response, rationale) {
  const scenario = clinicalCases[committed?.caseIndex];
  if (!scenario || !committed.assessment) throw new Error('Commit an independent assessment first.');
  if (!['contradictory', 'missing', 'supported'].includes(evidence) || !['challenge', 'investigate', 'accept'].includes(response)) throw new Error('Choose an evidence finding and response to the advice.');
  if (!rationale.trim()) throw new Error('Explain your source check before feedback.');
  return { evidenceMatch: evidence === scenario.expected, responseMatch: response === scenario.response, feedback: scenario.feedback, limitation: 'Only structured choices are compared with authored record facts. Free text and clinical competence are not scored. Cases and feedback have not been clinician validated.' };
}
