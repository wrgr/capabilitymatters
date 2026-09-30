export const sources = [
  { id: 'F1', title: 'Fictional catalog', text: 'The published course schedule lists meeting times and delivery format. An advisor helps learners check program sequencing.' },
  { id: 'F2', title: 'Fictional enrollment guide', text: 'Before changing enrollment, ask advising about progress and the aid office about any funding implications. These offices provide the binding answer for the learner’s circumstances.' },
  { id: 'F3', title: 'Fictional access services guide', text: 'Access services explains its request process privately. Do not put personal records into this practice tool.' },
];

export function required(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Enter ${label}.`);
  return value.trim();
}

export function navigate({ topic, question, format }) {
  const query = required(question, 'a practice question');
  const policySensitive = /drop|withdraw|refund|deadline|eligib|visa|grade|appeal|tuition|policy|rule|scholar|aid|fund|loan|cost|pay|fee|credit|transfer|graduat|enroll/i.test(query);
  const accessSensitive = /disab|accommod|accessibil/i.test(query);
  const wellbeing = /mental|suicid|self.harm|depress|anxiety|crisis|counsel/i.test(query);
  const roles = [];
  const cards = [];
  if (topic === 'change' || policySensitive) {
    roles.push('Academic advising / registrar: confirm progress, enrollment rules, and any deadlines', 'Financial aid office: confirm funding implications before changing enrollment');
    cards.push(sources[1]);
  }
  if (topic === 'access' || accessSensitive) {
    roles.push('Access services: ask about the private request process');
    cards.push(sources[2]);
  }
  if (topic === 'wellbeing' || wellbeing) roles.push('Student wellbeing / counseling staff: request human support; if there is immediate danger, contact local emergency help');
  if (topic === 'schedule') {
    cards.push(sources[0]);
    roles.push('Academic advising: verify the current official schedule and program sequencing');
  }
  if (!roles.length || topic === 'other') roles.push('Student services information desk: identify the responsible office and current official source');
  const sensitive = policySensitive || accessSensitive || wellbeing || topic !== 'schedule';
  const boundary = sensitive
    ? 'Human answer required. These cards cannot determine your eligibility, obligations, deadlines, or personal outcome.'
    : 'Only meeting times and delivery format are covered by F1. Any additional question needs a human or a current official source.';
  const quotes = cards.map(card => `${card.id} · ${card.title}\n${card.text}`).join('\n\n') || 'No approved fictional card covers this topic.';
  const next = format === 'message'
    ? `Practice message (choose the appropriate role below):\nHello, I would like help with this question: ${query}\nWhich current official source applies? What should I check before acting? Could you confirm the next step and another way to contact you if needed?`
    : `Conversation checklist:\n• Ask: ${query}\n• Request the current official source.\n• Confirm the next action and responsible office.\n• Ask about phone or in-person support if useful.\n• Repeat the answer back before acting.`;
  return { roles, cards: cards.map(card => card.id), text: `FICTIONAL NAVIGATION REHEARSAL — not college advice\n\n${boundary}\nMatching is a small keyword aid, not reliable classification. You can always choose another topic or contact student services.\n\nApproved practice sources:\n${quotes}\n\nHuman roles to contact:\n${roles.map(role => `• ${role}`).join('\n')}\n\n${next}\n\nUnderstanding check: In your own words, which office must confirm the answer and what will you ask?` };
}

export const familyTemplate = {
  original: 'Practice example: Join us in Room 12 at 6 pm on October 8. Bring a question about reading. If you cannot attend, ask the teacher for another time or a phone conversation.',
  adapted: 'Ejemplo de práctica: Acompáñenos en el salón 12 a las 6 p. m. el 8 de octubre. Traiga una pregunta sobre la lectura. Si no puede asistir, pídale al docente otro horario o una conversación por teléfono.',
  action: 'Attend if possible, or ask the teacher for another time or a phone conversation.',
};

export function numericTokens(text) {
  const normalized = text.normalize('NFKC').replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)));
  return (normalized.match(/\d+(?:[.,:/-]\d+)*/g) || []).sort();
}

export function compareDrafts({ original, adapted, action, meaning, reviewer, terms = '', access, reviewed, feedback = '' }) {
  const source = required(original, 'an original message');
  const draft = required(adapted, 'an adapted draft');
  const intended = required(action, 'the intended family action');
  const numbersSource = numericTokens(source);
  const numbersDraft = numericTokens(draft);
  const numbersMatch = JSON.stringify(numbersSource) === JSON.stringify(numbersDraft);
  const glossary = terms.split('\n').map(term => term.trim()).filter(Boolean);
  const confirmed = reviewed === 'yes' && Boolean(meaning?.trim()) && Boolean(reviewer?.trim());
  const concerns = [];
  if (!numbersMatch) concerns.push('Numeric tokens differ. Check every date, time, room, quantity, cost, and contact detail with a human. Differences can also be legitimate formatting changes.');
  else concerns.push('Numeric token lists match. This does NOT verify which number belongs to which date, time, room, or instruction, or verify written-out numbers.');
  if (source === draft) concerns.push('The drafts are identical. Confirm whether adaptation is actually needed and what access need remains.');
  if (access === 'internet') concerns.push('Internet access is assumed. Add a phone, paper, or in-person way to take the same action.');
  if (access === 'oral') concerns.push('An oral explanation is planned, not generated. Agree on a language and arrange a human speaker.');
  if (glossary.length) concerns.push(`Explain these user-identified terms with the family: ${glossary.join('; ')}.`);
  concerns.push('Human meaning check: compare who acts, what they do, when/where, whether participation is optional, any cost, and the alternative way to respond. Check negation, tone, and local examples in both drafts.');
  return { numbersMatch, confirmed, text: `FAMILY COMMUNICATION REVIEW — ${confirmed ? 'human review recorded (self-reported)' : 'UNREVIEWED DRAFT'}\nNo AI translation or semantic verification is performed. This is a token comparison and review worksheet, not publication approval.\n\nOriginal:\n${source}\n\nUser-provided or authored-template adaptation:\n${draft}\n\nIntended family action:\n${intended}\n\nNumeric tokens in original: ${numbersSource.join(', ') || '(none)'}\nNumeric tokens in adaptation: ${numbersDraft.join(', ') || '(none)'}\n\nReview prompts:\n${concerns.map(concern => `• ${concern}`).join('\n')}\n\nReviewer role: ${reviewer?.trim() || 'Not recorded'}\nHuman meaning check / family teach-back: ${meaning?.trim() || 'Not recorded'}\nOptional family feedback: ${feedback.trim() || 'Not recorded'}\n\nNext step: ${confirmed ? 'Resolve any remaining numeric or access concerns with the reviewer before sharing.' : 'Ask a language/community reviewer to compare the drafts and record what the family should understand before sharing.'}` };
}

export const curiosityPaths = {
  debug: { label: 'Investigate a game bug', challenge: 'A game character moves twice as far on a faster computer. Propose one explanation and a small test that could prove it wrong. Describe the result you would observe.', hint: 'Compare movement per frame with movement per elapsed second. What would you keep constant in a fair test?' },
  visual: { label: 'Explore visual design', challenge: 'Design two ways to show a player that a door is locked, without relying only on color or sound. Predict which would be clearer and describe how a player could test your prediction.', hint: 'Try shape, text, position, or an interaction cue. Ask someone to explain the cue without telling them what it means.' },
  story: { label: 'Experiment with a story choice', challenge: 'Create two choices for a game character facing a dilemma. Explain a different consequence for each choice and how you would find out whether a player felt the choice mattered.', hint: 'Change one consequence and ask what a player expects next. Distinguish a cosmetic change from a choice that affects the story.' },
  own: { label: 'My own challenge', challenge: '', hint: 'Name one uncertainty. Try a small experiment, seek another perspective, or ask a human mentor for a hint. You can keep the challenge difficult.' },
};

export function startCuriosity({ goal, path, custom }) {
  const target = required(goal, 'your learning goal');
  const selected = curiosityPaths[path];
  if (!selected) throw new Error('Choose a path.');
  const challenge = path === 'own' ? required(custom, 'your own challenge') : selected.challenge;
  return { goal: target, path, challenge, hint: selected.hint };
}

export function finishCuriosity(cycle, { attempt, reflection, next, reason }) {
  if (!cycle) throw new Error('Start a challenge first.');
  const work = required(attempt, 'an attempt before reflecting');
  const insight = required(reflection, 'what you noticed or would test next');
  const rationale = required(reason, 'why you chose that next step');
  const choices = { persist: 'Stay with this challenge', switch: 'Choose another path myself', mentor: 'Ask a human mentor', pause: 'Pause and return later' };
  if (!choices[next]) throw new Error('Choose your next step.');
  return { ...cycle, attempt: work, reflection: insight, next, reason: rationale, text: `Goal: ${cycle.goal}\nLearner-selected path: ${curiosityPaths[cycle.path].label}\nChallenge: ${cycle.challenge}\n\nAttempt:\n${work}\n\nReflection / evidence:\n${insight}\n\nMy next choice: ${choices[next]}\nMy reason: ${rationale}\nNo path or difficulty was automatically changed. This record does not assess learning or ability.` };
}

export const languageTasks = {
  clarify: {
    label: 'Ask a teacher for clarification',
    situation: 'Your teacher says: “Compare the two characters and support your answer.” You are unsure what kind of support to include. Ask a question that makes the unclear part specific.',
    checks: ['Name the part you do not understand.', 'Ask a specific question or request an example.', 'Check your understanding of the answer.'],
    hint: 'Name the instruction first, then ask what would count as evidence. You may plan in your home language and rehearse in the language you need for class.',
    model: 'When you say “support your answer,” should I quote a sentence from the story? Could you show one example?',
    partner: 'Authored teacher turn: “Use one detail from each character’s actions.” Rehearse checking that you understood, or asking another question.',
  },
  assignment: {
    label: 'Interpret an assignment instruction',
    situation: 'Practice instruction: “Read two paragraphs. Choose one claim and underline the evidence. Bring one question to our discussion.” Explain what you will do, then ask about anything still unclear.',
    checks: ['Explain the steps in your own words.', 'Distinguish the claim from evidence.', 'Ask about one uncertainty instead of guessing.'],
    hint: 'Separate what you read, what you mark, and what you bring. If “claim” or “evidence” is unfamiliar, ask for an example.',
    model: 'I will read two paragraphs, choose a claim, underline its evidence, and bring a question. How can I tell which sentence is a claim?',
    partner: 'Authored teacher turn: “A claim is an idea the writer wants you to accept; evidence gives reasons to accept it.” Rehearse explaining your next step or requesting an example.',
  },
  group: {
    label: 'Contribute an idea to a group',
    situation: 'Your group is deciding how to make a school garden easier to use. Offer one idea, explain why it could help, and invite a classmate’s view.',
    checks: ['Offer an idea connected to the task.', 'Give a reason others can discuss.', 'Invite a response or connect to a peer’s idea.'],
    hint: 'Try an idea + reason + invitation. You can disagree respectfully; there is no required opinion.',
    model: 'Could we add signs with pictures? They might help visitors find plants. What do you think?',
    partner: 'Authored classmate turn: “How would that help someone visiting for the first time?” Rehearse responding with an example and inviting another idea.',
  },
};

export function rehearseLanguage({ task, attempt, context = '', home = '' }) {
  const selected = languageTasks[task];
  if (!selected) throw new Error('Choose a communication task.');
  const first = required(attempt, 'your first attempt');
  return { task, attempt: first, context: context.trim(), home: home.trim(), text: `AUTHORED SUPPORT — not feedback generated from your response\n\n${selected.hint}\n\nOne possible English model (not the only valid response):\n${selected.model}\n\nCommunication checklist for your own review:\n${selected.checks.map(check => `• ${check}`).join('\n')}\n\n${selected.partner}` };
}

export function reviseLanguage(session, { revision, reply, reflection, transfer }) {
  if (!session) throw new Error('Record your first attempt before opening hints or revising.');
  const revised = required(revision, 'a revised first response');
  const followup = required(reply, 'a response to the authored partner turn');
  const note = required(reflection, 'your communication self-check');
  const next = required(transfer, 'a real-world practice plan');
  const selected = languageTasks[session.task];
  const unchanged = revised === session.attempt;
  return { unchanged, text: `LANGUAGE REHEARSAL RECORD — no proficiency score\nTask: ${selected.label}\nSituation: ${selected.situation}\nTeacher / learner context: ${session.context || 'No extra context'}\nHome-language planning notes: ${session.home || 'Not used'}\n\nFirst attempt:\n${session.attempt}\n\nRevised first response:\n${revised}\n${unchanged ? 'The first response is unchanged. Explain in your self-check why keeping it serves your goal.' : 'The response changed. A change alone is not evidence of improvement.'}\n\n${selected.partner}\nMy reply:\n${followup}\n\nSelf-check (not machine-validated):\n${note}\n\nTransfer plan:\n${next}\n\nHuman review: ask a teacher or practice partner whether your meaning was clear in the real setting. This text-only rehearsal does not evaluate grammar, pronunciation, fluency, proficiency, or actual task success.` };
}
