const b=[{id:"F1",title:"Fictional catalog",text:"The published course schedule lists meeting times and delivery format. An advisor helps learners check program sequencing."},{id:"F2",title:"Fictional enrollment guide",text:"Before changing enrollment, ask advising about progress and the aid office about any funding implications. These offices provide the binding answer for the learner’s circumstances."},{id:"F3",title:"Fictional access services guide",text:"Access services explains its request process privately. Do not put personal records into this practice tool."}];function h(e,n){if(typeof e!="string"||!e.trim())throw new Error(`Enter ${n}.`);return e.trim()}function C({topic:e,question:n,format:d}){const s=h(n,"a practice question"),i=/drop|withdraw|refund|deadline|eligib|visa|grade|appeal|tuition|policy|rule|scholar|aid|fund|loan|cost|pay|fee|credit|transfer|graduat|enroll/i.test(s),o=/disab|accommod|accessibil/i.test(s),c=/mental|suicid|self.harm|depress|anxiety|crisis|counsel/i.test(s),r=[],l=[];(e==="change"||i)&&(r.push("Academic advising / registrar: confirm progress, enrollment rules, and any deadlines","Financial aid office: confirm funding implications before changing enrollment"),l.push(b[1])),(e==="access"||o)&&(r.push("Access services: ask about the private request process"),l.push(b[2])),(e==="wellbeing"||c)&&r.push("Student wellbeing / counseling staff: request human support; if there is immediate danger, contact local emergency help"),e==="schedule"&&(l.push(b[0]),r.push("Academic advising: verify the current official schedule and program sequencing")),(!r.length||e==="other")&&r.push("Student services information desk: identify the responsible office and current official source");const u=i||o||c||e!=="schedule"?"Human answer required. These cards cannot determine your eligibility, obligations, deadlines, or personal outcome.":"Only meeting times and delivery format are covered by F1. Any additional question needs a human or a current official source.",g=l.map(t=>`${t.id} · ${t.title}
${t.text}`).join(`

`)||"No approved fictional card covers this topic.",a=d==="message"?`Practice message (choose the appropriate role below):
Hello, I would like help with this question: ${s}
Which current official source applies? What should I check before acting? Could you confirm the next step and another way to contact you if needed?`:`Conversation checklist:
• Ask: ${s}
• Request the current official source.
• Confirm the next action and responsible office.
• Ask about phone or in-person support if useful.
• Repeat the answer back before acting.`;return{roles:r,cards:l.map(t=>t.id),text:`FICTIONAL NAVIGATION REHEARSAL — not college advice

${u}
Matching is a small keyword aid, not reliable classification. You can always choose another topic or contact student services.

Approved practice sources:
${g}

Human roles to contact:
${r.map(t=>`• ${t}`).join(`
`)}

${a}

Understanding check: In your own words, which office must confirm the answer and what will you ask?`}}const q={original:"Practice example: Join us in Room 12 at 6 pm on October 8. Bring a question about reading. If you cannot attend, ask the teacher for another time or a phone conversation.",adapted:"Ejemplo de práctica: Acompáñenos en el salón 12 a las 6 p. m. el 8 de octubre. Traiga una pregunta sobre la lectura. Si no puede asistir, pídale al docente otro horario o una conversación por teléfono.",action:"Attend if possible, or ask the teacher for another time or a phone conversation."};function x(e){return(e.normalize("NFKC").replace(/[٠-٩۰-۹]/g,d=>String(d.charCodeAt(0)-(d<="٩"?1632:1776))).match(/\d+(?:[.,:/-]\d+)*/g)||[]).sort()}function S({original:e,adapted:n,action:d,meaning:s,reviewer:i,terms:o="",access:c,reviewed:r,feedback:l=""}){const m=h(e,"an original message"),u=h(n,"an adapted draft"),g=h(d,"the intended family action"),a=x(m),t=x(u),p=JSON.stringify(a)===JSON.stringify(t),y=o.split(`
`).map(k=>k.trim()).filter(Boolean),w=r==="yes"&&!!s?.trim()&&!!i?.trim(),f=[];return p?f.push("Numeric token lists match. This does NOT verify which number belongs to which date, time, room, or instruction, or verify written-out numbers."):f.push("Numeric tokens differ. Check every date, time, room, quantity, cost, and contact detail with a human. Differences can also be legitimate formatting changes."),m===u&&f.push("The drafts are identical. Confirm whether adaptation is actually needed and what access need remains."),c==="internet"&&f.push("Internet access is assumed. Add a phone, paper, or in-person way to take the same action."),c==="oral"&&f.push("An oral explanation is planned, not generated. Agree on a language and arrange a human speaker."),y.length&&f.push(`Explain these user-identified terms with the family: ${y.join("; ")}.`),f.push("Human meaning check: compare who acts, what they do, when/where, whether participation is optional, any cost, and the alternative way to respond. Check negation, tone, and local examples in both drafts."),{numbersMatch:p,confirmed:w,text:`FAMILY COMMUNICATION REVIEW — ${w?"human review recorded (self-reported)":"UNREVIEWED DRAFT"}
No AI translation or semantic verification is performed. This is a token comparison and review worksheet, not publication approval.

Original:
${m}

User-provided or authored-template adaptation:
${u}

Intended family action:
${g}

Numeric tokens in original: ${a.join(", ")||"(none)"}
Numeric tokens in adaptation: ${t.join(", ")||"(none)"}

Review prompts:
${f.map(k=>`• ${k}`).join(`
`)}

Reviewer role: ${i?.trim()||"Not recorded"}
Human meaning check / family teach-back: ${s?.trim()||"Not recorded"}
Optional family feedback: ${l.trim()||"Not recorded"}

Next step: ${w?"Resolve any remaining numeric or access concerns with the reviewer before sharing.":"Ask a language/community reviewer to compare the drafts and record what the family should understand before sharing."}`}}const A={debug:{label:"Investigate a game bug",challenge:"A game character moves twice as far on a faster computer. Propose one explanation and a small test that could prove it wrong. Describe the result you would observe.",hint:"Compare movement per frame with movement per elapsed second. What would you keep constant in a fair test?"},visual:{label:"Explore visual design",challenge:"Design two ways to show a player that a door is locked, without relying only on color or sound. Predict which would be clearer and describe how a player could test your prediction.",hint:"Try shape, text, position, or an interaction cue. Ask someone to explain the cue without telling them what it means."},story:{label:"Experiment with a story choice",challenge:"Create two choices for a game character facing a dilemma. Explain a different consequence for each choice and how you would find out whether a player felt the choice mattered.",hint:"Change one consequence and ask what a player expects next. Distinguish a cosmetic change from a choice that affects the story."},own:{label:"My own challenge",challenge:"",hint:"Name one uncertainty. Try a small experiment, seek another perspective, or ask a human mentor for a hint. You can keep the challenge difficult."}};function $({goal:e,path:n,custom:d}){const s=h(e,"your learning goal"),i=A[n];if(!i)throw new Error("Choose a path.");const o=n==="own"?h(d,"your own challenge"):i.challenge;return{goal:s,path:n,challenge:o,hint:i.hint}}function E(e,{attempt:n,reflection:d,next:s,reason:i}){if(!e)throw new Error("Start a challenge first.");const o=h(n,"an attempt before reflecting"),c=h(d,"what you noticed or would test next"),r=h(i,"why you chose that next step"),l={persist:"Stay with this challenge",switch:"Choose another path myself",mentor:"Ask a human mentor",pause:"Pause and return later"};if(!l[s])throw new Error("Choose your next step.");return{...e,attempt:o,reflection:c,next:s,reason:r,text:`Goal: ${e.goal}
Learner-selected path: ${A[e.path].label}
Challenge: ${e.challenge}

Attempt:
${o}

Reflection / evidence:
${c}

My next choice: ${l[s]}
My reason: ${r}
No path or difficulty was automatically changed. This record does not assess learning or ability.`}}const v={clarify:{label:"Ask a teacher for clarification",situation:"Your teacher says: “Compare the two characters and support your answer.” You are unsure what kind of support to include. Ask a question that makes the unclear part specific.",checks:["Name the part you do not understand.","Ask a specific question or request an example.","Check your understanding of the answer."],hint:"Name the instruction first, then ask what would count as evidence. You may plan in your home language and rehearse in the language you need for class.",model:"When you say “support your answer,” should I quote a sentence from the story? Could you show one example?",partner:"Authored teacher turn: “Use one detail from each character’s actions.” Rehearse checking that you understood, or asking another question."},assignment:{label:"Interpret an assignment instruction",situation:"Practice instruction: “Read two paragraphs. Choose one claim and underline the evidence. Bring one question to our discussion.” Explain what you will do, then ask about anything still unclear.",checks:["Explain the steps in your own words.","Distinguish the claim from evidence.","Ask about one uncertainty instead of guessing."],hint:"Separate what you read, what you mark, and what you bring. If “claim” or “evidence” is unfamiliar, ask for an example.",model:"I will read two paragraphs, choose a claim, underline its evidence, and bring a question. How can I tell which sentence is a claim?",partner:"Authored teacher turn: “A claim is an idea the writer wants you to accept; evidence gives reasons to accept it.” Rehearse explaining your next step or requesting an example."},group:{label:"Contribute an idea to a group",situation:"Your group is deciding how to make a school garden easier to use. Offer one idea, explain why it could help, and invite a classmate’s view.",checks:["Offer an idea connected to the task.","Give a reason others can discuss.","Invite a response or connect to a peer’s idea."],hint:"Try an idea + reason + invitation. You can disagree respectfully; there is no required opinion.",model:"Could we add signs with pictures? They might help visitors find plants. What do you think?",partner:"Authored classmate turn: “How would that help someone visiting for the first time?” Rehearse responding with an example and inviting another idea."}};function I({task:e,attempt:n,context:d="",home:s=""}){const i=v[e];if(!i)throw new Error("Choose a communication task.");const o=h(n,"your first attempt");return{task:e,attempt:o,context:d.trim(),home:s.trim(),text:`AUTHORED SUPPORT — not feedback generated from your response

${i.hint}

One possible English model (not the only valid response):
${i.model}

Communication checklist for your own review:
${i.checks.map(c=>`• ${c}`).join(`
`)}

${i.partner}`}}function R(e,{revision:n,reply:d,reflection:s,transfer:i}){if(!e)throw new Error("Record your first attempt before opening hints or revising.");const o=h(n,"a revised first response"),c=h(d,"a response to the authored partner turn"),r=h(s,"your communication self-check"),l=h(i,"a real-world practice plan"),m=v[e.task],u=o===e.attempt;return{unchanged:u,text:`LANGUAGE REHEARSAL RECORD — no proficiency score
Task: ${m.label}
Situation: ${m.situation}
Teacher / learner context: ${e.context||"No extra context"}
Home-language planning notes: ${e.home||"Not used"}

First attempt:
${e.attempt}

Revised first response:
${o}
${u?"The first response is unchanged. Explain in your self-check why keeping it serves your goal.":"The response changed. A change alone is not evidence of improvement."}

${m.partner}
My reply:
${c}

Self-check (not machine-validated):
${r}

Transfer plan:
${l}

Human review: ask a teacher or practice partner whether your meaning was clear in the real setting. This text-only rehearsal does not evaluate grammar, pronunciation, fluency, proficiency, or actual task success.`}}function T(){document.querySelectorAll("[data-aile-access]").forEach(e=>{if(e.dataset.ready)return;e.dataset.ready="true";const n=e.querySelector("[data-status]"),d=e.querySelector("[data-result]"),s=e.querySelector("[data-output]"),i=e.querySelector("[data-export]");let o="",c=null,r="",l=null;const m=[],u=()=>{o="",s.textContent="",d.hidden=!0,i.disabled=!0,n.textContent="Inputs changed. Prepare new guidance to update the record."},g=a=>{const t=e.querySelector('[name="reviewed"]');if(t&&a.target!==t&&(t.checked=!1),e.dataset.aileAccess==="curiosity"&&(["goal","path","custom"].includes(a.target.name)&&(c=null,r="",e.querySelector("[data-cycle-work]").hidden=!0,e.querySelector("[data-challenge]").textContent=""),a.target.name==="attempt"&&(r="",e.querySelector("[data-reflect]").hidden=!0,e.elements.namedItem("reflection").value="",e.elements.namedItem("reason").value="")),e.dataset.aileAccess==="language"&&["task","attempt","context","home"].includes(a.target.name)){l=null,e.querySelector("[data-language-revision]").hidden=!0,e.querySelector("[data-language-hints]").textContent="";for(const p of["revision","reply","reflection","transfer"])e.elements.namedItem(p).value="";e.querySelector("[data-situation]").textContent=v[e.elements.namedItem("task").value].situation}u()};e.addEventListener("input",g),e.addEventListener("change",g),e.querySelector("[data-template]")?.addEventListener("click",()=>{for(const[t,p]of Object.entries(q))e.elements.namedItem(t).value=p;const a=e.querySelector('[name="reviewed"]');a&&(a.checked=!1),u(),n.textContent="Authored English/Spanish practice template loaded. Human review is still needed."}),e.querySelector("[data-start-cycle]")?.addEventListener("click",()=>{u();try{c=$(Object.fromEntries(new FormData(e))),r="";for(const a of["attempt","reflection","reason"])e.elements.namedItem(a).value="";e.querySelector("[data-challenge]").textContent=c.challenge,e.querySelector("[data-cycle-work]").hidden=!1,e.querySelector("[data-reflect]").hidden=!0,n.textContent="Your chosen challenge is ready. Try it before opening the reflection prompts.",e.elements.namedItem("attempt").focus()}catch(a){n.textContent=a.message}}),e.querySelector("[data-save-attempt]")?.addEventListener("click",()=>{u();try{if(!c)throw new Error("Start your chosen challenge first.");r=h(e.elements.namedItem("attempt").value,"an attempt"),e.querySelector("[data-reflect]").hidden=!1,e.querySelector("[data-hint]").textContent=c.hint,n.textContent="Attempt recorded. Reflect on evidence and choose your own next step.",e.elements.namedItem("reflection").focus()}catch(a){n.textContent=a.message}}),e.querySelector("[data-language-attempt]")?.addEventListener("click",()=>{u();try{l=I(Object.fromEntries(new FormData(e))),e.querySelector("[data-language-hints]").textContent=l.text,e.querySelector("[data-language-revision]").hidden=!1,e.elements.namedItem("revision").value=l.attempt,n.textContent="First attempt recorded. Authored hints and a partner turn are now available. Review and revise in your own words.",e.elements.namedItem("revision").focus()}catch(a){n.textContent=a.message}}),e.addEventListener("reset",()=>{u(),c=null,r="",l=null,m.length=0,e.querySelectorAll("[data-cycle-work], [data-reflect], [data-language-revision]").forEach(y=>{y.hidden=!0});const a=e.querySelector("[data-challenge]");a&&(a.textContent="");const t=e.querySelector("[data-language-hints]");t&&(t.textContent="");const p=e.querySelector("[data-situation]");p&&(p.textContent=v.clarify.situation),n.textContent="Practice reset. No entries retained."}),e.addEventListener("submit",a=>{a.preventDefault(),u();try{const t=Object.fromEntries(new FormData(e));if(e.dataset.aileAccess==="curiosity"){if(!r||r!==t.attempt.trim())throw new Error("Record your current attempt before saving a reflection.");const p=E(c,t);m.push(p.text),o=`CURIOSITY PRACTICE JOURNAL — local self-report, not an assessment

${m.map((y,w)=>`Cycle ${w+1}
${y}`).join(`

———

`)}`,c=null,r="",e.querySelector("[data-cycle-work]").hidden=!0,e.querySelector("[data-challenge]").textContent="Cycle saved. Your path selection is unchanged. Start another challenge when you choose."}else e.dataset.aileAccess==="language"?o=R(l,t).text:o=(e.dataset.aileAccess==="communication"?S(t):C(t)).text;s.textContent=o,d.hidden=!1,i.disabled=!1,n.textContent="Current record ready. You can download it, revise inputs, or reset. Nothing has been sent."}catch(t){n.textContent=t.message}}),i.addEventListener("click",()=>{if(!o)return;const a=URL.createObjectURL(new Blob([o],{type:"text/plain;charset=utf-8"})),t=document.createElement("a");t.href=a,t.download=`${e.dataset.aileAccess}-practice.txt`,t.click(),setTimeout(()=>URL.revokeObjectURL(a),1e3)}),e.querySelector("[data-local-controls]").disabled=!1})}T();
