const m=(e,r)=>{if(typeof e!="string"||!e.trim())throw new Error(`Enter ${r}.`);return e.trim()},l=(e,r,i)=>{if(!r.includes(e))throw new Error(`Choose a valid ${i}.`);return e};function g(e){const r=m(e.purpose,"an instructional purpose"),i=m(e.evidence,"evidence that must remain the learner’s own"),o=l(e.age,["younger","older"],"age band"),a=l(e.use,["planning","feedback","generation"],"use"),c=l(e.data,["synthetic","identifiable","sensitive","unknown"],"data category"),d=l(e.oversight,["before","after","none"],"oversight"),s=[];return c!=="synthetic"&&s.push(c==="unknown"?"Data handling is unknown: resolve collection, retention, and vendor access first.":"Identifiable or sensitive information: route to the district privacy/data steward before any tool use."),d!=="before"&&s.push("No human review before learners receive output: designate a reviewer and correction process."),o==="younger"&&a!=="planning"&&s.push("Younger learners: confirm age eligibility, family communication, and adult mediation locally."),a==="generation"&&s.push("Full-text generation may replace the target capability: require an independent first attempt and a later unaided task."),{text:`SANDBOX ROUTE: ${s.length?"HUMAN REVIEW NEEDED":"BOUNDED TRIAL DISCUSSION"}
This rule-based classification is not institutional or legal approval. Local policy, tool terms, accessibility, and authorized district review still govern every use. No policy database is consulted.

Purpose: ${r}
Learner age band: ${o==="younger"?"Under 13":"13 and older"}
Use: ${a}
Data: ${c}
Oversight: ${d}

Reasons / next checks:
${s.length?s.map(n=>"- "+n).join(`
`):"- Synthetic/public inputs and advance human review reduce some risks; they do not establish permission."}

DRAFT CLASSROOM PROTOCOL
1. Teacher confirms district authorization and tool/data boundaries before a trial. Use synthetic examples until review is complete.
2. Preserve this independent evidence: ${i}
3. ${a==="planning"?"Teacher prepares materials, checks accuracy and accessibility, then teaches without requiring student accounts.":a==="feedback"?"Learner drafts first; teacher checks suggested feedback before it reaches the learner. Learner chooses which changes to make and explains why.":"Keep generated text visibly labeled and separate from assessed learner work. Learner critiques it, then completes an unaided task."}
4. Offer the same objective using paper, peer discussion, or teacher feedback with no account requirement.
5. Stop the trial for unexpected data capture, harmful output, or loss of independent work. Escalate to the district reviewer.

STUDENT-FACING EXPLANATION
We are considering AI for: ${r}. Your own work must show: ${i}. You can question or reject a suggestion and use the teacher-supported alternative. Never enter private details. Ask your teacher which tools and uses are authorized.

CHECK LEARNING
Compare an unaided task before and after the trial, ask students to explain a new AI-use scenario, and review errors and unequal access. Completing the protocol does not prove learning.`}}function v(e){const r=m(e.target,"the weekly literacy target"),i=m(e.context,"a story, passage, or everyday context without identifying details"),o=l(e.strategy,["inference","sequence","vocabulary"],"strategy"),a=l(e.minutes,["3","5","10"],"time budget"),c=l(e.mode,["oral","text"],"activity format"),d=l(e.observation,["unobserved","independent","supported","question"],"optional observation"),s=l(e.share,["no","yes"],"sharing choice"),t={inference:["What do you think is happening that is not said directly?","Which detail helped you think that? Could another explanation fit?","Try a different detail or story. Explain a new inference and the clue behind it."],sequence:["What happened first, next, and last?","What detail tells us the order? Retell it in your own words.","Change one event. Explain how the later events might change."],vocabulary:["Choose an unfamiliar or interesting word. What might it mean here?","Which surrounding words or events give you clues? Try a replacement word.","Use the word in a different situation and explain whether its meaning still fits."]}[o],n={unobserved:"Not observed / prefer not to report. This is not evidence of difficulty.",independent:"Family noticed an independent strategy attempt; not a mastery score.",supported:"Family noticed an attempt with support; context may affect performance.",question:"Family has a question; invite a conversation rather than assign a deficit label."},h=String(e.explanation||"").trim();return{text:`OPTIONAL HOME LITERACY INVITATION
Weekly target: ${r}
Time: up to ${a} minutes; stop or adapt whenever needed. No completion requirement.

Use this context (supplied by teacher/family, not analyzed):
${i}

${c==="oral"?"Tell or listen to a familiar story together. Reading aloud or writing is not required.":"Read the short passage together, or have someone read it aloud. Use large print or oral retelling if helpful."}
Use any language you are comfortable with; the learner can respond by speaking, drawing, pointing, or writing.

1. NOTICE
${t[0]}
2. EXPLAIN
${t[1]}
${a==="3"?"Keep it to one exchange today. Save the next prompt for another day.":"Leave time for the learner to ask their own question."}
3. OPTIONAL TRANSFER${a==="10"?" — try a second example today":" — later if useful"}
${t[2]}

Adult support: wait for the learner’s idea, ask for a clue, and accept more than one defensible interpretation. These fixed prompts cannot judge the response or whether the chosen strategy fits the passage.
${h?`
Teacher/family-supplied explanation in a preferred language (reproduced exactly; not translated or verified):
${h}
`:""}
No names, contact details, or home activity logs are needed. Observations are optional and are never sent automatically. Lack of participation is not evidence of low ability.`,teacher:s==="yes"?`OPTIONAL FAMILY-REVIEWED NOTE
Review and edit the inputs before choosing to download/share. No transmission occurs here.
Target: ${r}
Observation: ${n[d]}
${String(e.note||"").trim()?`Family’s optional question or observation: ${String(e.note).trim()}
`:""}Follow up with a brief, independent classroom task using a different text. Do not grade home participation or infer ability from missing reports.
The story/context and preferred-language explanation are omitted from this note.`:""}}const w=e=>e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");function y(e){const r=m(e.title,"a source title or reference"),o=m(e.source,"curriculum source text").split(/\r?\n/).map(t=>t.trim()).filter(Boolean);if(o.length>12)throw new Error("Use at most 12 source lines. Split a longer source into separate packets.");const a=m(e.terms,"one target term per line").split(/\r?\n/).map(t=>t.trim()).filter(Boolean);if(a.length>6)throw new Error("Use at most 6 target terms per packet.");if(new Set(a.map(t=>t.toLocaleLowerCase())).size!==a.length)throw new Error("Use distinct target terms.");const c=l(e.support,["guided","independent"],"support level"),d=a.map(t=>{const n=new RegExp(`(?<![\\p{L}\\p{N}_])${w(t)}(?![\\p{L}\\p{N}_])`,"giu"),h=o.findIndex(_=>(n.lastIndex=0,n.test(_)));if(h<0)throw new Error(`Target term “${t}” must appear as a complete word or phrase in the source. No exercise was exported.`);const u=o[h];n.lastIndex=0;const f=u.match(n)[0];n.lastIndex=0;const p=u.replace(n,"________");if(!/[\p{L}\p{N}]/u.test(p))throw new Error(`Add explanatory context around “${t}” in its source line; a term alone cannot make a useful exercise.`);return{line:h+1,original:u,answer:f,question:p}}),s=o.map((t,n)=>`[${n+1}] ${t}`).join(`
`);return{text:`PRACTICE PACKET — ${r}
Teacher-selected source; this tool has not verified its accuracy, rights, or reading level.

HOW TO USE
Read the source. ${c==="guided"?"Use the word bank and line references as support.":"Cover the source for the first attempt, then uncover it to check and revise."}
Answer orally, on paper, or in a text editor. Ask a teacher about unclear wording.

SOURCE
${s}

${c==="guided"?`WORD BANK
${a.slice().sort((t,n)=>t.localeCompare(n)).join(" • ")}

`:""}A. RETRIEVE AND CHECK
${d.map((t,n)=>`${n+1}. ${t.question}${c==="guided"?` (source line ${t.line})`:""}
Your answer: ____________________
After checking the source, my revision: ____________________`).join(`

`)}

B. EXPLAIN WITH EVIDENCE
Choose one completed statement. Explain it in your own words and quote a short supporting detail with its line number.
My explanation: ________________________________________
Evidence and line number: ______________________________

C. TRY TRANSFER
Propose a different example where one source idea might apply. Explain the connection. Mark anything the source does not establish as uncertain and discuss it with your teacher.
New example: ___________________________________________
Connection / uncertainty: _______________________________

OFFLINE USE
Save this text file while the page is open, then open or print the saved file without a network connection. The website itself is not cached for offline use. No synchronization or AI generation is implemented.`,teacher:`TEACHER GUIDE — ${r}
Separate from learner packet. Review source suitability and every exercise before distributing. A literal match does not verify factual truth.

ANSWER KEY WITH PROVENANCE
${d.map((t,n)=>`${n+1}. ${t.answer}
Source line ${t.line}: ${t.original}`).join(`

`)}

Review explanation for accurate meaning plus a cited detail. Review transfer for a defensible connection and stated uncertainty; there is no automatic right answer. Accept valid paraphrases, oral responses, or accessible alternatives. Cloze recall alone does not establish understanding.

Compare preparation time with a manually prepared worksheet, source errors found, and performance on a new example later. Both support levels keep the explanation and transfer targets. No scores or usage data are collected.`}}function b(e){const r=["unobserved","developing","demonstrated"],i=l(e.prerequisite,r,"prerequisite evidence"),o=l(e.explanation,r,"explanation evidence"),a=l(e.transfer,r,"transfer evidence"),c=String(e.evidence||"").trim();if([i,o,a].some(p=>p!=="unobserved")&&!c)throw new Error("Describe the observed work supporting your evidence judgments, without identifying the learner.");const d=l(e.override,["recommended","diagnostic","prerequisite","guided","transfer","extend"],"teacher override"),s=d!=="recommended"?m(e.reason,"a reason for the teacher override"):"";let t,n;i==="unobserved"?(t="diagnostic",n="Equivalent-fraction evidence is unobserved. Collect it before assuming a gap."):i==="developing"?(t="prerequisite",n="Observed work suggests equivalent fractions need support. This is an instructional judgment, not an ability label."):o==="unobserved"?(t="diagnostic",n="Prerequisite evidence is present; an explanation has not yet been observed."):o==="developing"?(t="guided",n="An observed explanation needs support even though the prerequisite was demonstrated."):a==="unobserved"?(t="transfer",n="A new-context attempt is unobserved. Offer the transfer task as evidence collection, not remediation."):a==="developing"?(t="transfer",n="Observed transfer work needs discussion and another new-context attempt."):(t="extend",n="All three evidence types were marked demonstrated by the teacher. Offer extension and a delayed check; durable mastery is not established by this form."),a==="demonstrated"&&(i!=="demonstrated"||o!=="demonstrated")&&(n+=" Evidence is uneven: transfer was demonstrated while an earlier category was not. Reconcile the actual work with the learner; a brief targeted check or teacher override may avoid unnecessary repetition.");const h={diagnostic:"Ask the learner to show why 2/3 equals 4/6 using a drawing. Then solve 1/2 + 1/3 and explain why adding denominators would not preserve the units. Observe missing evidence without scoring silence as error.",prerequisite:"Fold or draw equal-sized wholes into thirds and sixths. Match 1/3 to 2/6 and 2/3 to 4/6. Explain why the shaded amount stays the same. Retry 1/2 + 1/3 with common units. Keep this support brief and offer a new-context attempt each cycle; do not confine the learner to prerequisite repetition.",guided:"Draw equal-sized fraction strips for 1/2 and 1/3. Rename both in sixths, combine the pieces, and explain why the answer uses sixths. Fade the strips for 1/4 + 1/3.",transfer:"A recipe uses 3/4 cup of one ingredient and 2/3 cup of another. Is a one-cup bowl large enough for their combined volume? Represent the sum, justify common units, and explain the decision. Teacher: note whether this task was supported or independent.",extend:"Create two different pairs of positive fractions that each sum to 5/6. Prove both sums with common units. On a later day, solve a fresh context problem without hints."},u=d==="recommended"?t:d,f=[["Equivalent fractions",i],["Conceptual explanation",o],["Independent transfer",a]].filter(([,p])=>p==="unobserved").map(([p])=>p);return{text:`MASTERY PATHWAY — FRACTION ADDITION
Fixed thin slice: add fractions with unlike denominators and justify common units in a new context. No model, score inference, or student profile is used.

TEACHER-ENTERED EVIDENCE
Equivalent fractions: ${i}
Conceptual explanation: ${o}
Independent transfer: ${a}
Observation: ${c||"No observed work supplied."}
${f.length?`Unobserved evidence still to collect: ${f.join("; ")}. Missing evidence is not poor performance.`:"All categories have teacher-entered observations; verify their quality and independence."}

RULE RECOMMENDATION: ${t}
Why: ${n}
Priority: prerequisite observation/support, then explanation, then independent transfer.

TEACHER DECISION: ${u}
${d==="recommended"?"Teacher retained the recommendation.":`Teacher override reason: ${s}
Original recommendation retained above for review; an override does not change the evidence states.`}

NEXT ACTIVITY
${h[u]}

SAME EVIDENCE STANDARD FOR EVERY PATH
Demonstrate equivalent fractions, explain common units, and independently solve and justify a new-context problem. Record the actual work and support given; revisit on a later day before concluding durable mastery.

LEARNER AGENCY AND ACCESS
Ask which representation helps and what still feels uncertain. Offer fraction strips, large-print diagrams, oral explanation, or assistive communication while keeping the mathematics target stable. Do not infer ability from speed, language fluency, missing work, or this route. Teacher may revise judgments and override after discussion.`,teacher:`TEACHER CHECKS — FRACTION ADDITION
2/3 = 4/6 because each third is two sixths of the same whole.
1/2 + 1/3 = 3/6 + 2/6 = 5/6. Denominators describe unit size, not a count to add.
1/4 + 1/3 = 3/12 + 4/12 = 7/12.
Recipe transfer: 3/4 + 2/3 = 9/12 + 8/12 = 17/12 = 1 5/12 cups; a one-cup bowl is too small.
Example extension pairs: 1/2 + 1/3 and 1/6 + 2/3 both sum to 5/6; accept other valid pairs.
These example solutions support teacher review. Judge reasoning and independent performance, not answer matching alone. Do not reuse a revealed task as fresh transfer evidence.`}}function x(e,r){if(e==="district-ai-use-sandbox")return g(r);if(e==="family-literacy-connector")return v(r);if(e==="offline-practice-packet")return y(r);if(e==="mastery-pathway-planner")return b(r);throw new Error("Unknown tool.")}document.querySelectorAll("[data-aile-foundation]").forEach(e=>{const r=e.querySelector("form");r.querySelector("fieldset").disabled=!1,r.querySelector('button[type="submit"]').disabled=!1;const i=e.querySelector("[data-result]"),o=e.querySelector("[data-status]"),a=e.querySelector("[data-output]"),c=e.querySelector("[data-teacher]"),d=e.querySelector("[data-teacher-section]"),s=e.querySelector("[data-export-teacher]");let t={text:"",teacher:""};const n=()=>{const u=!!t.text;t={text:"",teacher:""},a.textContent="",c.textContent="",i.hidden=!0,o.textContent=u?"Inputs changed. Generate a new draft before exporting.":""};r.addEventListener("input",n),r.addEventListener("change",n),r.addEventListener("reset",()=>{n(),o.textContent="Reset to starting values. No result retained."}),r.addEventListener("submit",u=>{u.preventDefault(),n();try{t={teacher:"",...x(e.dataset.aileFoundation,Object.fromEntries(new FormData(r)))},a.textContent=t.text,c.textContent=t.teacher,d.hidden=!t.teacher,s.hidden=!t.teacher,i.hidden=!1,o.textContent="Draft ready. Review the output and revise inputs as needed."}catch(f){o.textContent=f instanceof Error?f.message:"Please check your inputs."}});const h=(u,f)=>{if(!u)return;const p=URL.createObjectURL(new Blob([u],{type:"text/plain;charset=utf-8"})),_=document.createElement("a");_.href=p,_.download=`${e.dataset.aileFoundation}${f}.txt`,_.click(),setTimeout(()=>URL.revokeObjectURL(p),1e3)};e.querySelector("[data-export]").addEventListener("click",()=>h(t.text,"")),s.addEventListener("click",()=>h(t.teacher,"-teacher"))});
