const required = (value, label) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Enter ${label}.`);
  return value.trim();
};
const choice = (value, options, label) => {
  if (!options.includes(value)) throw new Error(`Choose a valid ${label}.`);
  return value;
};

export function policy(input) {
  const purpose = required(input.purpose, 'an instructional purpose');
  const evidence = required(input.evidence, 'evidence that must remain the learner’s own');
  const age = choice(input.age, ['younger', 'older'], 'age band');
  const use = choice(input.use, ['planning', 'feedback', 'generation'], 'use');
  const data = choice(input.data, ['synthetic', 'identifiable', 'sensitive', 'unknown'], 'data category');
  const oversight = choice(input.oversight, ['before', 'after', 'none'], 'oversight');
  const reasons = [];
  if (data !== 'synthetic') reasons.push(data === 'unknown' ? 'Data handling is unknown: resolve collection, retention, and vendor access first.' : 'Identifiable or sensitive information: route to the district privacy/data steward before any tool use.');
  if (oversight !== 'before') reasons.push('No human review before learners receive output: designate a reviewer and correction process.');
  if (age === 'younger' && use !== 'planning') reasons.push('Younger learners: confirm age eligibility, family communication, and adult mediation locally.');
  if (use === 'generation') reasons.push('Full-text generation may replace the target capability: require an independent first attempt and a later unaided task.');
  const route = reasons.length ? 'HUMAN REVIEW NEEDED' : 'BOUNDED TRIAL DISCUSSION';
  return { text: `SANDBOX ROUTE: ${route}\nThis rule-based classification is not institutional or legal approval. Local policy, tool terms, accessibility, and authorized district review still govern every use. No policy database is consulted.\n\nPurpose: ${purpose}\nLearner age band: ${age === 'younger' ? 'Under 13' : '13 and older'}\nUse: ${use}\nData: ${data}\nOversight: ${oversight}\n\nReasons / next checks:\n${reasons.length ? reasons.map((reason) => '- ' + reason).join('\n') : '- Synthetic/public inputs and advance human review reduce some risks; they do not establish permission.'}\n\nDRAFT CLASSROOM PROTOCOL\n1. Teacher confirms district authorization and tool/data boundaries before a trial. Use synthetic examples until review is complete.\n2. Preserve this independent evidence: ${evidence}\n3. ${use === 'planning' ? 'Teacher prepares materials, checks accuracy and accessibility, then teaches without requiring student accounts.' : use === 'feedback' ? 'Learner drafts first; teacher checks suggested feedback before it reaches the learner. Learner chooses which changes to make and explains why.' : 'Keep generated text visibly labeled and separate from assessed learner work. Learner critiques it, then completes an unaided task.'}\n4. Offer the same objective using paper, peer discussion, or teacher feedback with no account requirement.\n5. Stop the trial for unexpected data capture, harmful output, or loss of independent work. Escalate to the district reviewer.\n\nSTUDENT-FACING EXPLANATION\nWe are considering AI for: ${purpose}. Your own work must show: ${evidence}. You can question or reject a suggestion and use the teacher-supported alternative. Never enter private details. Ask your teacher which tools and uses are authorized.\n\nCHECK LEARNING\nCompare an unaided task before and after the trial, ask students to explain a new AI-use scenario, and review errors and unequal access. Completing the protocol does not prove learning.` };
}

export function family(input) {
  const target = required(input.target, 'the weekly literacy target');
  const context = required(input.context, 'a story, passage, or everyday context without identifying details');
  const strategy = choice(input.strategy, ['inference', 'sequence', 'vocabulary'], 'strategy');
  const minutes = choice(input.minutes, ['3', '5', '10'], 'time budget');
  const mode = choice(input.mode, ['oral', 'text'], 'activity format');
  const observation = choice(input.observation, ['unobserved', 'independent', 'supported', 'question'], 'optional observation');
  const share = choice(input.share, ['no', 'yes'], 'sharing choice');
  const prompts = {
    inference: ['What do you think is happening that is not said directly?', 'Which detail helped you think that? Could another explanation fit?', 'Try a different detail or story. Explain a new inference and the clue behind it.'],
    sequence: ['What happened first, next, and last?', 'What detail tells us the order? Retell it in your own words.', 'Change one event. Explain how the later events might change.'],
    vocabulary: ['Choose an unfamiliar or interesting word. What might it mean here?', 'Which surrounding words or events give you clues? Try a replacement word.', 'Use the word in a different situation and explain whether its meaning still fits.']
  }[strategy];
  const labels = { unobserved: 'Not observed / prefer not to report. This is not evidence of difficulty.', independent: 'Family noticed an independent strategy attempt; not a mastery score.', supported: 'Family noticed an attempt with support; context may affect performance.', question: 'Family has a question; invite a conversation rather than assign a deficit label.' };
  const explanation = String(input.explanation || '').trim();
  return {
    text: `OPTIONAL HOME LITERACY INVITATION\nWeekly target: ${target}\nTime: up to ${minutes} minutes; stop or adapt whenever needed. No completion requirement.\n\nUse this context (supplied by teacher/family, not analyzed):\n${context}\n\n${mode === 'oral' ? 'Tell or listen to a familiar story together. Reading aloud or writing is not required.' : 'Read the short passage together, or have someone read it aloud. Use large print or oral retelling if helpful.'}\nUse any language you are comfortable with; the learner can respond by speaking, drawing, pointing, or writing.\n\n1. NOTICE\n${prompts[0]}\n2. EXPLAIN\n${prompts[1]}\n${minutes === '3' ? 'Keep it to one exchange today. Save the next prompt for another day.' : 'Leave time for the learner to ask their own question.'}\n3. OPTIONAL TRANSFER${minutes === '10' ? ' — try a second example today' : ' — later if useful'}\n${prompts[2]}\n\nAdult support: wait for the learner’s idea, ask for a clue, and accept more than one defensible interpretation. These fixed prompts cannot judge the response or whether the chosen strategy fits the passage.\n${explanation ? `\nTeacher/family-supplied explanation in a preferred language (reproduced exactly; not translated or verified):\n${explanation}\n` : ''}\nNo names, contact details, or home activity logs are needed. Observations are optional and are never sent automatically. Lack of participation is not evidence of low ability.`,
    teacher: share === 'yes' ? `OPTIONAL FAMILY-REVIEWED NOTE\nReview and edit the inputs before choosing to download/share. No transmission occurs here.\nTarget: ${target}\nObservation: ${labels[observation]}\n${String(input.note || '').trim() ? `Family’s optional question or observation: ${String(input.note).trim()}\n` : ''}Follow up with a brief, independent classroom task using a different text. Do not grade home participation or infer ability from missing reports.\nThe story/context and preferred-language explanation are omitted from this note.` : ''
  };
}

const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function packet(input) {
  const title = required(input.title, 'a source title or reference');
  const source = required(input.source, 'curriculum source text');
  const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 12) throw new Error('Use at most 12 source lines. Split a longer source into separate packets.');
  const terms = required(input.terms, 'one target term per line').split(/\r?\n/).map((term) => term.trim()).filter(Boolean);
  if (terms.length > 6) throw new Error('Use at most 6 target terms per packet.');
  if (new Set(terms.map((term) => term.toLocaleLowerCase())).size !== terms.length) throw new Error('Use distinct target terms.');
  const support = choice(input.support, ['guided', 'independent'], 'support level');
  const exercises = terms.map((term) => {
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${escapePattern(term)}(?![\\p{L}\\p{N}_])`, 'giu');
    const lineIndex = lines.findIndex((line) => { pattern.lastIndex = 0; return pattern.test(line); });
    if (lineIndex < 0) throw new Error(`Target term “${term}” must appear as a complete word or phrase in the source. No exercise was exported.`);
    const original = lines[lineIndex];
    pattern.lastIndex = 0;
    const answer = original.match(pattern)[0];
    pattern.lastIndex = 0;
    const question = original.replace(pattern, '________');
    if (!/[\p{L}\p{N}]/u.test(question)) throw new Error(`Add explanatory context around “${term}” in its source line; a term alone cannot make a useful exercise.`);
    return { line: lineIndex + 1, original, answer, question };
  });
  const citedSource = lines.map((line, index) => `[${index + 1}] ${line}`).join('\n');
  return {
    text: `PRACTICE PACKET — ${title}\nTeacher-selected source; this tool has not verified its accuracy, rights, or reading level.\n\nHOW TO USE\nRead the source. ${support === 'guided' ? 'Use the word bank and line references as support.' : 'Cover the source for the first attempt, then uncover it to check and revise.'}\nAnswer orally, on paper, or in a text editor. Ask a teacher about unclear wording.\n\nSOURCE\n${citedSource}\n\n${support === 'guided' ? `WORD BANK\n${terms.slice().sort((first, second) => first.localeCompare(second)).join(' • ')}\n\n` : ''}A. RETRIEVE AND CHECK\n${exercises.map((exercise, index) => `${index + 1}. ${exercise.question}${support === 'guided' ? ` (source line ${exercise.line})` : ''}\nYour answer: ____________________\nAfter checking the source, my revision: ____________________`).join('\n\n')}\n\nB. EXPLAIN WITH EVIDENCE\nChoose one completed statement. Explain it in your own words and quote a short supporting detail with its line number.\nMy explanation: ________________________________________\nEvidence and line number: ______________________________\n\nC. TRY TRANSFER\nPropose a different example where one source idea might apply. Explain the connection. Mark anything the source does not establish as uncertain and discuss it with your teacher.\nNew example: ___________________________________________\nConnection / uncertainty: _______________________________\n\nOFFLINE USE\nSave this text file while the page is open, then open or print the saved file without a network connection. The website itself is not cached for offline use. No synchronization or AI generation is implemented.`,
    teacher: `TEACHER GUIDE — ${title}\nSeparate from learner packet. Review source suitability and every exercise before distributing. A literal match does not verify factual truth.\n\nANSWER KEY WITH PROVENANCE\n${exercises.map((exercise, index) => `${index + 1}. ${exercise.answer}\nSource line ${exercise.line}: ${exercise.original}`).join('\n\n')}\n\nReview explanation for accurate meaning plus a cited detail. Review transfer for a defensible connection and stated uncertainty; there is no automatic right answer. Accept valid paraphrases, oral responses, or accessible alternatives. Cloze recall alone does not establish understanding.\n\nCompare preparation time with a manually prepared worksheet, source errors found, and performance on a new example later. Both support levels keep the explanation and transfer targets. No scores or usage data are collected.`
  };
}

export function mastery(input) {
  const states = ['unobserved', 'developing', 'demonstrated'];
  const prerequisite = choice(input.prerequisite, states, 'prerequisite evidence');
  const explanation = choice(input.explanation, states, 'explanation evidence');
  const transfer = choice(input.transfer, states, 'transfer evidence');
  const evidence = String(input.evidence || '').trim();
  if ([prerequisite, explanation, transfer].some((state) => state !== 'unobserved') && !evidence) throw new Error('Describe the observed work supporting your evidence judgments, without identifying the learner.');
  const override = choice(input.override, ['recommended', 'diagnostic', 'prerequisite', 'guided', 'transfer', 'extend'], 'teacher override');
  const reason = override !== 'recommended' ? required(input.reason, 'a reason for the teacher override') : '';
  let route;
  let rationale;
  if (prerequisite === 'unobserved') {
    route = 'diagnostic'; rationale = 'Equivalent-fraction evidence is unobserved. Collect it before assuming a gap.';
  } else if (prerequisite === 'developing') {
    route = 'prerequisite'; rationale = 'Observed work suggests equivalent fractions need support. This is an instructional judgment, not an ability label.';
  } else if (explanation === 'unobserved') {
    route = 'diagnostic'; rationale = 'Prerequisite evidence is present; an explanation has not yet been observed.';
  } else if (explanation === 'developing') {
    route = 'guided'; rationale = 'An observed explanation needs support even though the prerequisite was demonstrated.';
  } else if (transfer === 'unobserved') {
    route = 'transfer'; rationale = 'A new-context attempt is unobserved. Offer the transfer task as evidence collection, not remediation.';
  } else if (transfer === 'developing') {
    route = 'transfer'; rationale = 'Observed transfer work needs discussion and another new-context attempt.';
  } else {
    route = 'extend'; rationale = 'All three evidence types were marked demonstrated by the teacher. Offer extension and a delayed check; durable mastery is not established by this form.';
  }
  if (transfer === 'demonstrated' && (prerequisite !== 'demonstrated' || explanation !== 'demonstrated')) {
    rationale += ' Evidence is uneven: transfer was demonstrated while an earlier category was not. Reconcile the actual work with the learner; a brief targeted check or teacher override may avoid unnecessary repetition.';
  }
  const activities = {
    diagnostic: 'Ask the learner to show why 2/3 equals 4/6 using a drawing. Then solve 1/2 + 1/3 and explain why adding denominators would not preserve the units. Observe missing evidence without scoring silence as error.',
    prerequisite: 'Fold or draw equal-sized wholes into thirds and sixths. Match 1/3 to 2/6 and 2/3 to 4/6. Explain why the shaded amount stays the same. Retry 1/2 + 1/3 with common units. Keep this support brief and offer a new-context attempt each cycle; do not confine the learner to prerequisite repetition.',
    guided: 'Draw equal-sized fraction strips for 1/2 and 1/3. Rename both in sixths, combine the pieces, and explain why the answer uses sixths. Fade the strips for 1/4 + 1/3.',
    transfer: 'A recipe uses 3/4 cup of one ingredient and 2/3 cup of another. Is a one-cup bowl large enough for their combined volume? Represent the sum, justify common units, and explain the decision. Teacher: note whether this task was supported or independent.',
    extend: 'Create two different pairs of positive fractions that each sum to 5/6. Prove both sums with common units. On a later day, solve a fresh context problem without hints.'
  };
  const selected = override === 'recommended' ? route : override;
  const missing = [['Equivalent fractions', prerequisite], ['Conceptual explanation', explanation], ['Independent transfer', transfer]].filter(([, state]) => state === 'unobserved').map(([label]) => label);
  return {
    text: `MASTERY PATHWAY — FRACTION ADDITION\nFixed thin slice: add fractions with unlike denominators and justify common units in a new context. No model, score inference, or student profile is used.\n\nTEACHER-ENTERED EVIDENCE\nEquivalent fractions: ${prerequisite}\nConceptual explanation: ${explanation}\nIndependent transfer: ${transfer}\nObservation: ${evidence || 'No observed work supplied.'}\n${missing.length ? `Unobserved evidence still to collect: ${missing.join('; ')}. Missing evidence is not poor performance.` : 'All categories have teacher-entered observations; verify their quality and independence.'}\n\nRULE RECOMMENDATION: ${route}\nWhy: ${rationale}\nPriority: prerequisite observation/support, then explanation, then independent transfer.\n\nTEACHER DECISION: ${selected}\n${override === 'recommended' ? 'Teacher retained the recommendation.' : `Teacher override reason: ${reason}\nOriginal recommendation retained above for review; an override does not change the evidence states.`}\n\nNEXT ACTIVITY\n${activities[selected]}\n\nSAME EVIDENCE STANDARD FOR EVERY PATH\nDemonstrate equivalent fractions, explain common units, and independently solve and justify a new-context problem. Record the actual work and support given; revisit on a later day before concluding durable mastery.\n\nLEARNER AGENCY AND ACCESS\nAsk which representation helps and what still feels uncertain. Offer fraction strips, large-print diagrams, oral explanation, or assistive communication while keeping the mathematics target stable. Do not infer ability from speed, language fluency, missing work, or this route. Teacher may revise judgments and override after discussion.`,
    teacher: 'TEACHER CHECKS — FRACTION ADDITION\n2/3 = 4/6 because each third is two sixths of the same whole.\n1/2 + 1/3 = 3/6 + 2/6 = 5/6. Denominators describe unit size, not a count to add.\n1/4 + 1/3 = 3/12 + 4/12 = 7/12.\nRecipe transfer: 3/4 + 2/3 = 9/12 + 8/12 = 17/12 = 1 5/12 cups; a one-cup bowl is too small.\nExample extension pairs: 1/2 + 1/3 and 1/6 + 2/3 both sum to 5/6; accept other valid pairs.\nThese example solutions support teacher review. Judge reasoning and independent performance, not answer matching alone. Do not reuse a revealed task as fresh transfer evidence.'
  };
}

export function generate(tool, input) {
  if (tool === 'district-ai-use-sandbox') return policy(input);
  if (tool === 'family-literacy-connector') return family(input);
  if (tool === 'offline-practice-packet') return packet(input);
  if (tool === 'mastery-pathway-planner') return mastery(input);
  throw new Error('Unknown tool.');
}
