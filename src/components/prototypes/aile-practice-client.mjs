import { teacherCases, teacherFeedback, workflowActions, newWorkflow, workflowStep, workflowHint, clinicalCases, commitClinical, clinicalFeedback } from '../../data/prototypes/aile-practice-core.mjs';

function element(tag, text, parent) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (parent) parent.append(node);
  return node;
}
function button(parent, text, action) {
  const node = element('button', text, parent);
  node.dataset.action = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  node.type = 'button'; node.addEventListener('click', action); return node;
}
function field(parent, text, options) {
  const label = element('label', text, parent);
  const node = element(options ? 'select' : 'textarea', undefined, label);
  if (options) options.forEach((text, index) => { const option = element('option', text, node); option.value = String(index); });
  else { node.rows = 3; node.maxLength = 4000; }
  return node;
}
function panel(parent, title) {
  const section = element('section', undefined, parent); section.className = 'panel';
  element('h3', title, section); return section;
}
function exportRecord(record, filename) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
  const link = element('a'); link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function mountTeacher(root) {
  root.replaceChildren();
  element('h2', 'Teacher AI decision practice', root);
  element('p', 'Two authored scenarios, three contrasting decisions each. Feedback is fixed, not AI-generated or an assessment of your writing. Policies are fictional; check your own school policy. Use no real student information.', root);
  const scenario = field(root, 'Scenario (changing it clears this attempt)', teacherCases.map(item => item.title));
  scenario.dataset.field = 'scenario';
  const context = panel(root, 'Situation');
  const contextText = element('p', '', context);
  const choice = field(root, 'Your decision', ['Choose a decision']);
  const reasoning = field(root, 'Why this choice? Address the learning target, evidence, policy, and learner access.');
  const confidence = field(root, 'Confidence before consequences', ['Unsure', 'Somewhat confident', 'Very confident']);
  choice.dataset.field = 'decision'; reasoning.dataset.field = 'reasoning'; confidence.dataset.field = 'confidence';
  const status = element('p', '', root); status.setAttribute('role', 'status');
  const feedback = panel(root, 'Consequences and comparison'); feedback.hidden = true;
  feedback.dataset.result = 'teacher';
  let record;
  const actions = element('div', undefined, root); actions.className = 'actions';
  button(actions, 'Commit reasoning and reveal', () => {
    try {
      const selected = Number(choice.value) - 1;
      const result = teacherFeedback(Number(scenario.value), selected, reasoning.value);
      feedback.replaceChildren(); element('h3', 'Consequence of your decision', feedback); element('p', result, feedback);
      element('h3', 'Compare the other paths', feedback);
      teacherCases[Number(scenario.value)].choices.forEach(([title, consequence], index) => {
        if (index !== selected) { element('h4', title, feedback); element('p', consequence, feedback); }
      });
      element('p', 'Reflection framework: instructional fit · evidence checking · policy/privacy · teacher agency · equitable access. These are discussion lenses, not a validated competency score.', feedback);
      const revision = field(feedback, 'Revise your decision or describe a safeguard and a fresh task that would test learning.');
      revision.dataset.field = 'revision';
      record = { scenario: teacherCases[Number(scenario.value)].title, decision: choice.selectedOptions[0].textContent, reasoning: reasoning.value.trim(), confidence: confidence.selectedOptions[0].textContent, consequence: result };
      button(feedback, 'Export attempt and revision', () => {
        if (!revision.value.trim()) { status.textContent = 'Add your revision before exporting.'; revision.focus(); return; }
        exportRecord({ ...record, revision: revision.value.trim(), limitation: 'Authored scenario; no automated reasoning assessment.' }, 'teacher-practice.json');
        status.textContent = 'Exported locally. Your reflection may contain personal information; review before sharing.';
      });
      feedback.hidden = false; status.textContent = 'Consequences revealed. Compare, then revise.';
    } catch (error) { status.textContent = error.message; }
  });
  function invalidate() { feedback.hidden = true; feedback.replaceChildren(); record = undefined; status.textContent = 'Attempt changed. Commit again to reveal matching consequences.'; }
  function load() {
    contextText.textContent = teacherCases[Number(scenario.value)].context;
    choice.replaceChildren(); ['Choose a decision', ...teacherCases[Number(scenario.value)].choices.map(item => item[0])].forEach((text, index) => { const option = element('option', text, choice); option.value = String(index); });
    reasoning.value = ''; confidence.value = '0'; invalidate(); status.textContent = '';
  }
  scenario.addEventListener('change', load);
  [choice, reasoning, confidence].forEach(node => node.addEventListener('input', invalidate));
  button(actions, 'Reset all', () => mountTeacher(root)); load();
}

export function mountWorkflow(root) {
  root.replaceChildren();
  element('h2', '2D workflow precursor — not XR', root);
  element('p', 'Configure a fictional desktop signal station, diagnose its injected fault, verify, then release it. This is a deterministic 2D state machine with authored hints, not an AI coach or real equipment training. No timing limit; all controls work with a keyboard.', root);
  const scene = panel(root, 'Live station state'); scene.classList.add('aile-practice-scene');
  const display = element('div', undefined, scene); display.className = 'aile-practice-nodes';
  display.dataset.result = 'station';
  const status = element('p', '', root); status.setAttribute('role', 'status');
  const actionKeys = Object.keys(workflowActions);
  const action = field(root, 'Next action', ['Choose an action', ...Object.values(workflowActions)]);
  const prediction = field(root, 'Before running: what will change, or what evidence do you expect?');
  action.dataset.field = 'action'; prediction.dataset.field = 'prediction';
  const actions = element('div', undefined, root); actions.className = 'actions';
  const history = panel(root, 'Run history');
  history.dataset.result = 'history';
  let state = newWorkflow();
  function render() {
    display.replaceChildren();
    [['Power', state.powered ? 'ON' : 'ISOLATED'], ['Cable → controller', state.connected ? 'Connected' : 'Disconnected'], ['Profile → station', state.configured ? 'Loaded' : 'Missing'], ['Handshake', state.passed ? 'PASS' : state.tested ? 'Not currently passed' : 'Not tested'], ['Connector C', state.inspected ? state.fault ? 'Intermittent' : 'Reseated' : 'Uninspected'], ['Release', state.released ? 'Complete' : 'Pending']].forEach(([title, value]) => {
      const box = element('div', undefined, display); element('strong', title, box); element('p', value, box);
    });
    history.replaceChildren(); element('h3', 'Run history', history);
    element('p', `${state.log.length} actions · ${state.errors} blocked attempts · ${state.hints} hints. These are simulator observations, not competence scores.`, history);
    const list = element('ol', undefined, history);
    state.log.forEach(entry => element('li', `${workflowActions[entry.action]} — Prediction: ${entry.prediction} — Observed: ${entry.message}`, list));
  }
  const run = button(actions, 'Run action', () => {
    try { state = workflowStep(state, actionKeys[Number(action.value) - 1], prediction.value); status.textContent = state.log.at(-1).message; prediction.value = ''; action.value = '0'; render(); run.disabled = state.released; }
    catch (error) { status.textContent = error.message; }
  });
  button(actions, 'Ask for a hint', () => { state = { ...state, hints: state.hints + 1 }; status.textContent = workflowHint(state); render(); });
  button(actions, 'Export run', () => {
    if (!state.log.length) { status.textContent = 'Run at least one action before exporting.'; return; }
    exportRecord({ ...state, limitation: 'Fictional 2D state machine. Does not establish real-world procedural skill.' }, 'workflow-practice.json'); status.textContent = 'Run exported locally.';
  });
  button(actions, 'Reset station', () => mountWorkflow(root)); render();
}

export function mountClinical(root) {
  root.replaceChildren();
  element('h2', 'Fictional record-check calibration', root);
  element('p', 'Educational source-check practice only. All records and “AI” advice are authored fiction. No diagnoses or treatments are proposed. This tool and its feedback have not been clinician validated and cannot assess clinical competence. Use no real patient information.', root);
  const scenario = field(root, 'Case (changing it clears all responses)', clinicalCases.map(item => item.title));
  scenario.dataset.field = 'case';
  const sources = panel(root, 'Supplied source records');
  const initial = element('fieldset', undefined, root); element('legend', '1. Independent assessment before advice', initial);
  const assessment = field(initial, 'What can these records establish, and what remains uncertain?');
  const changeEvidence = field(initial, 'What source evidence would change your assessment?');
  const missing = field(initial, 'What might I be missing?');
  const confidence = field(initial, 'Confidence in your record assessment', ['Choose confidence', 'Low', 'Medium', 'High']);
  assessment.dataset.field = 'assessment'; changeEvidence.dataset.field = 'change-evidence'; missing.dataset.field = 'missing'; confidence.dataset.field = 'confidence';
  const status = element('p', '', root); status.setAttribute('role', 'status');
  const advicePanel = panel(root, '2. Inspect fallible advice'); advicePanel.hidden = true;
  advicePanel.dataset.result = 'advice';
  const actions = element('div', undefined, root); actions.className = 'actions';
  let committed;
  const seenCases = new Set();
  const commit = button(actions, 'Commit assessment and reveal advice', () => {
    try {
      committed = commitClinical(Number(scenario.value), assessment.value, changeEvidence.value, missing.value, ['', 'low', 'medium', 'high'][Number(confidence.value)]);
      committed.assessmentAfterAdvice = seenCases.has(committed.caseIndex);
      seenCases.add(committed.caseIndex);
      initial.disabled = true; commit.disabled = true;
      advicePanel.replaceChildren(); element('h3', '2. Inspect fallible advice', advicePanel);
      element('p', clinicalCases[committed.caseIndex].advice, advicePanel);
      const finding = field(advicePanel, 'Source finding', ['Choose finding', 'Contradictory records', 'Missing documentation', 'Supported limited claim']);
      const response = field(advicePanel, 'Response to the advice', ['Choose response', 'Challenge its claim', 'Investigate what it omits', 'Accept its bounded claim']);
      const rationale = field(advicePanel, 'Cite source A or B in your own words. Why accept, challenge, or investigate?');
      const afterConfidence = field(advicePanel, 'Confidence after checking advice', ['Low', 'Medium', 'High']);
      finding.dataset.field = 'finding'; response.dataset.field = 'response'; rationale.dataset.field = 'rationale'; afterConfidence.dataset.field = 'after-confidence';
      const output = panel(advicePanel, 'Authored source-check feedback'); output.hidden = true;
      output.dataset.result = 'clinical';
      let result;
      button(advicePanel, 'Compare source check', () => {
        try {
          result = clinicalFeedback(committed, ['', 'contradictory', 'missing', 'supported'][Number(finding.value)], ['', 'challenge', 'investigate', 'accept'][Number(response.value)], rationale.value);
          output.replaceChildren(); element('h3', 'Authored source-check feedback', output);
          element('p', `Structured evidence choice: ${result.evidenceMatch ? 'matches' : 'differs from'} the authored record check. Advice response: ${result.responseMatch ? 'matches' : 'differs from'} the suggested response. Other defensible responses require human discussion.`, output);
          element('p', result.feedback, output); element('p', result.limitation, output);
          const revision = field(output, 'Revision: what would you check next, and why?');
          revision.dataset.field = 'revision';
          button(output, 'Export reflection', () => {
            if (!revision.value.trim()) { status.textContent = 'Add a revision before exporting.'; revision.focus(); return; }
            exportRecord({ case: clinicalCases[committed.caseIndex].title, independent: committed, advice: clinicalCases[committed.caseIndex].advice, finding: finding.selectedOptions[0].textContent, response: response.selectedOptions[0].textContent, rationale: rationale.value.trim(), afterConfidence: afterConfidence.selectedOptions[0].textContent, revision: revision.value.trim(), result }, 'clinical-record-practice.json');
            status.textContent = 'Reflection exported locally. Review its contents before sharing.';
          });
          output.hidden = false; status.textContent = 'Source comparison ready; no free-text assessment was performed.';
        } catch (error) { status.textContent = error.message; }
      });
      [finding, response, rationale, afterConfidence].forEach(node => node.addEventListener('input', () => { result = undefined; output.hidden = true; output.replaceChildren(); status.textContent = 'Response changed. Compare again for current feedback.'; }));
      advicePanel.hidden = false; status.textContent = 'Independent response saved for this attempt. Read advice against both sources.';
    } catch (error) { status.textContent = error.message; }
  });
  button(actions, 'Revise independent assessment', () => {
    committed = undefined; initial.disabled = false; commit.disabled = false; advicePanel.hidden = true; advicePanel.replaceChildren();
    status.textContent = 'Advice cleared. A revision after advice is marked in export. Choose an unseen case for an independent first attempt; reset clears records but cannot undo exposure.';
    assessment.focus();
  });
  button(actions, 'Reset all', () => mountClinical(root));
  function load() {
    committed = undefined; initial.disabled = false; commit.disabled = false;
    [assessment, changeEvidence, missing].forEach(node => { node.value = ''; }); confidence.value = '0';
    advicePanel.hidden = true; advicePanel.replaceChildren(); status.textContent = '';
    sources.replaceChildren(); element('h3', 'Supplied source records', sources);
    clinicalCases[Number(scenario.value)].sources.forEach(text => element('p', text, sources));
  }
  scenario.addEventListener('change', load); load();
}
