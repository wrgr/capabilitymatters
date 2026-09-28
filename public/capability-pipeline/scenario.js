/* Runs the published Capability Pipeline scenario component. */
/* LENS Capability Pipeline — authored teaching scenario, not an empirical model. */
(function(root){
'use strict';
const source = {
  title: 'The eight-step iteration cycle',
  url: 'https://capabilitymatters.org/capability-pipeline/',
  originalArtifact: 'https://claude.ai/artifact/HYeWnSBxg4QqK4FzP9P5Xu',
  limitation: 'The original artifact was supplied by the user and is included in the companion case explorer. This fictional simulation is a separately authored teaching model.'
};
const cycle = [
 ['understand','Understand','What capability is missing, for whom, and under what conditions?',
  'Frame a capability gap before choosing a product. Separate the desired performance from a convenient proxy for it.',
  'A bounded problem statement, the people affected, and evidence that could disconfirm the framing.',
  'Revisit when the target population, operating conditions, or definition of success changes.'],
 ['model','Model','What produces the gap in this system?',
  'Represent the people, tools, incentives, dependencies, and constraints that might explain the observed performance.',
  'An explicit model with assumptions, dependencies, competing explanations, and testable predictions.',
  'Revisit when an observation contradicts the mechanism you assumed.'],
 ['design','Design','What intervention could close the gap, and what does it leave out?',
  'Choose a mechanism and make its tradeoffs explicit. Decide where humans retain judgment and how excluded users will be supported.',
  'A design rationale, plausible alternatives, expected costs, and failure or stop conditions.',
  'Revisit when the intervention depends on an assumption that no longer holds.'],
 ['build','Build','What is the smallest real version worth testing?',
  'Make the design operational. A prototype is useful when it exposes constraints and produces evidence, not merely when it looks finished.',
  'A testable implementation, known limitations, and a record of what changed during construction.',
  'Revisit the model or design when implementation reveals an invalid assumption.'],
 ['instrument','Instrument','What evidence could change your next decision?',
  'Specify what to observe before interpreting results. A measure of activity is not automatically a measure of capability.',
  'Measures, collection methods, missing-data checks, and decision rules tied to the actual capability claim.',
  'Revisit when the available data cannot distinguish your preferred explanation from an alternative.'],
 ['deploy','Deploy','What happens under real operating conditions?',
  'Introduce the built, instrumented intervention into its intended setting. Scope and reversibility are deliberate design decisions.',
  'A bounded rollout, responsibilities, support arrangements, and a way to stop or roll back.',
  'Revisit earlier steps when the operating setting differs materially from the pilot.'],
 ['evaluate','Evaluate','What does the evidence justify—and what does it not?',
  'Read the results against the original claim, uncertainty, implementation conditions, and plausible competing explanations.',
  'A bounded conclusion: what improved, for whom, on which measure, and what is still unknown.',
  'Revisit instrumentation or framing when the evidence cannot support the decision being requested.'],
 ['refine','Refine','What should change because of what you learned?',
  'Change the next decision. Refinement can return all the way to Understand; it need not mean polishing the existing build.',
  'A reasoned next step: continue, redesign, reframe, collect different evidence, or stop.',
  'Return to the earliest step whose assumptions no longer survive the evidence.']
].map(([id,title,question,meaning,deliverable,revisit])=>({id,title,question,meaning,deliverable,revisit}));
const a=(id,label,detail,cost,days,effects,odds={},extra={})=>({id,label,detail,cost,days,effects,odds,...extra});
const scenario={
 schemaVersion:1, revision:1, id:'september-launch', title:'The September Launch',
 subtitle:'An AI-supported learning pilot under pressure to scale',
 brief:'You lead a fictional district team introducing an artificial intelligence (AI) tutor. The sponsor wants more completed practice before a launch deadline. Teachers want students to solve unfamiliar problems without the tutor. The initial pilot is small, and the launch population has different support needs. You have 100 budget units and 34 working days. Decide what capability to pursue, what to build, what to measure, and when to change course.',
 mission:'Make a defensible next decision about independent problem solving—not simply a more attractive completion dashboard.',
 disclaimer:'All people, events, indices, probabilities, costs, and observations in this scenario are invented teaching assumptions. This is not an estimate of an actual product, district, or intervention.',
 initial:{budget:100,days:34,fit:30,readiness:30,evidence:20,trust:55,agency:50,transfer:35,completion:55,gap:18},
 base:{useful:0.43,setback:0.25,eventRate:0.62}, maxTurns:40,
 steps:[
 {id:'understand',prompt:'The sponsor asks for a 20-point increase in completed practice. Teachers say completion can rise while independent work does not. What will you treat as the problem?',actions:[
 a('u-completion','Adopt the completion target','Move quickly with the sponsor’s definition. Independent performance remains an untested assumption.',2,1,{trust:6,readiness:3,completion:4,fit:-4},{useful:0.07}),
 a('u-field','Observe learners and teachers','Spend time on unfamiliar tasks and classroom constraints before promising a solution.',9,3,{fit:18,trust:6,agency:3},{useful:0.04,setback:-0.03}),
 a('u-bound','Negotiate a bounded capability claim','Limit the first pilot to one skill and define an independent transfer task.',5,2,{fit:11,evidence:5,trust:-2},{useful:0.02})]},
 {id:'model',prompt:'Low performance could reflect a knowledge gap, dependence on hints, inaccessible materials, or classroom constraints. Which model will guide the first intervention?',actions:[
 a('m-skill','Model a knowledge gap','Focus resources on prerequisite skills. This is fast but leaves context and dependence less examined.',4,1,{readiness:5,fit:3,completion:3},{useful:0.06}),
 a('m-system','Map the whole work system','Examine teacher workload, devices, accessibility, incentives, and the interaction with the tutor.',9,3,{fit:15,agency:6,trust:3},{setback:-0.05}),
 a('m-compete','Test competing explanations','Run small probes comparing unaided performance, hints, and an accessible version of the same task.',7,2,{fit:10,evidence:8,transfer:2},{useful:0.03,setback:-0.02})]},
 {id:'design',prompt:'You need a design that fits the model, not merely one that can ship. What tradeoff will you make?',actions:[
 a('d-auto','Automate the practice flow','Use frequent hints and automated routing. More practice gets completed, but independent judgment may receive less practice.',5,1,{readiness:12,completion:14,agency:-12,transfer:-4},{useful:0.09}),
 a('d-fade','Design for fading support','Fade hints, include unaided tasks, and give teachers a visible override. This costs more to build.',11,3,{readiness:8,transfer:10,agency:14,completion:2},{setback:-0.04}),
 a('d-narrow','Build a small accessible pathway','Limit scope and preserve a non-AI route. Reach is narrower, but the intervention is easier to reverse.',7,2,{readiness:6,transfer:5,gap:-7,agency:8,trust:2},{useful:0.02})]},
 {id:'build',prompt:'The implementation is running behind. What must be real in the first version, and what can wait?',actions:[
 a('b-template','Use the vendor template','Get a working interface quickly and rely on the default integration.',4,1,{readiness:10,completion:6,agency:-3},{useful:0.04,setback:0.05}),
 a('b-test','Test the integration and fallback','Exercise edge cases and confirm that a teacher can intervene when the normal path fails.',10,3,{readiness:18,agency:8,trust:3},{setback:-0.08}),
 a('b-human','Run a human-supported prototype','Keep some operations manual so the team can learn before automating. Capacity is limited.',6,2,{readiness:9,agency:7,fit:5,trust:2},{useful:0.02})]},
 {id:'instrument',prompt:'Your dashboard is easy to instrument. Independent performance and subgroup differences require extra work. What evidence will you collect?',actions:[
 a('i-activity','Track activity and completion','Use inexpensive platform logs. You will not have a direct measure of unaided capability.',3,1,{evidence:5,completion:3},{useful:0.08},{sensors:['completion']}),
 a('i-transfer','Add independent transfer tasks','Collect unaided performance alongside activity, with missing-data checks. Subgroup estimates are still unavailable.',9,3,{evidence:20},{setback:-0.04},{sensors:['completion','transfer']}),
 a('i-full','Add transfer, subgroup, and agency checks','Measure more of the capability claim, but spend scarce budget and staff time. These are noisy pilot observations, not a causal trial.',13,4,{evidence:30,agency:4,trust:-2},{setback:-0.06},{sensors:['completion','transfer','gap','agency']})]},
 {id:'deploy',prompt:'The sponsor wants wider access. Your pilot may not represent the conditions of a full launch. How will you proceed?',actions:[
 a('p-wide','Launch broadly now','Reach more learners and meet the visible deadline. Support and rollback will be stretched.',5,1,{completion:10,readiness:-8,trust:7,gap:4},{useful:0.07,setback:0.10}),
 a('p-stage','Stage the rollout with a stop rule','Add sites in small increments, preserving support and the ability to pause.',10,3,{readiness:8,transfer:5,trust:3,agency:4},{setback:-0.08}),
 a('p-pilot','Extend the bounded pilot','Gain operating experience before expanding. The sponsor may dislike the delay.',7,3,{evidence:5,transfer:3,fit:6,trust:-6},{useful:0.02,setback:-0.04})]},
 {id:'evaluate',prompt:'You must recommend a next step using only the evidence you actually collected. A favorable activity trend may not answer the capability question.',actions:[
 a('e-headline','Report the headline trend','Provide a quick, narrow report. Do not mistake it for evidence about unmeasured transfer or subgroups.',2,1,{trust:5,evidence:-4},{useful:0.08}),
 a('e-challenge','Challenge the preferred explanation','Check missingness, competing explanations, and the bounds of the claim. This may delay the decision.',8,3,{evidence:12,fit:8,trust:1},{setback:-0.05}),
 a('e-replicate','Repeat a small independent check','Collect another observation using the instruments already chosen. Repetition cannot recover an outcome you never instrumented.',6,2,{evidence:8,trust:-2},{useful:0.03})]},
 {id:'refine',prompt:'State which assumption survived and which did not. Choose where to go next; ending a cycle is not the same as proving success.',actions:[
 a('r-reframe','Reframe the capability problem','Return to Understand with what the evidence has taught you. Past costs and observations remain in the record.',3,1,{fit:6,trust:-2},{},{next:0}),
 a('r-redesign','Revise the intervention','Keep a bounded framing but return to Design. Explain why the problem definition still holds.',3,1,{readiness:2,agency:3},{},{next:2}),
 a('r-conclude','Conclude this cycle','Write a bounded recommendation to continue, pause, or stop. A decision to stop can be well justified.',0,1,{},{},{next:'finish'})]}
 ],
 events:[
 {id:'cohort',title:'The launch cohort differs from the pilot',text:'The next group has different access and support needs. Your current model may not describe them.',from:0,to:6,weight:1,riskMetric:'fit',effects:{fit:-10,transfer:-6,gap:7,trust:-3},target:0,required:true,containment:'Keep the new cohort outside the launch while you arrange support.',containCost:5,containDays:1},
 {id:'deadline',title:'The sponsor moves the deadline',text:'A public demonstration is brought forward. Three working days disappear; the capability claim has not become easier.',from:0,to:6,weight:0.8,effects:{days:-3,trust:-2},target:0,required:true,containment:'Reduce the demonstration’s scope and explicitly retain the original evidence threshold.',containCost:2,containDays:0},
 {id:'dependency',title:'A dependency fails outside the pilot',text:'A previously reliable integration cannot support the next operating setting. Redesign the dependency or contain the affected rollout.',from:3,to:5,weight:1,riskMetric:'readiness',effects:{readiness:-13,trust:-4},target:3,required:true,containment:'Use a staffed fallback for the affected portion of the rollout.',containCost:7,containDays:1},
 {id:'missing',requiresSensor:'transfer',title:'The data feed loses important records',text:'A logging change invalidates the most recent independent-performance observation. More completion logs will not repair that missing evidence.',from:4,to:6,weight:1,riskMetric:'evidence',effects:{evidence:-12},invalidate:['transfer'],target:4,required:true,containment:'Commission a manual check before taking the next decision; no missing value is silently filled in.',containCost:6,containDays:2,repairSensor:'transfer'},
 {id:'agency',title:'Teachers cannot tell when to intervene',text:'A workflow issue makes intervention harder. A smooth-looking student session can now conceal a need for human judgment.',from:2,to:6,weight:1,riskMetric:'agency',effects:{agency:-13,transfer:-3,trust:-5},target:2,required:true,containment:'Restrict automation to supervised sessions until the workflow is repaired.',containCost:6,containDays:1},
 {id:'champion',title:'A teacher team offers protected time',text:'A small team offers time for the next iteration. This gives you options; it is not evidence that the intervention works.',from:0,to:6,weight:0.75,effects:{budget:5,days:1,trust:5},target:0,required:false,containment:'',containCost:0,containDays:0},
 {id:'quiet',title:'No new disruption is reported',text:'The operating environment is stable this turn. Stability does not validate an untested assumption.',from:0,to:6,weight:0.5,effects:{},target:0,required:false,containment:'',containCost:0,containDays:0}
 ]
};

scenario.eventModel='contextual-v2';
scenario.routingModel='justify-v2';
scenario.revision=2;
const eventAssumptions={
 cohort:{probability:0.03,riskIncrease:0.07,from:5,to:6,mechanism:'Cohort mismatch is discovered during deployment or evaluation; weaker model fit raises this risk.'},
 deadline:{probability:0.04,riskIncrease:0,mechanism:'An external sponsor decision; technical readiness does not change its probability.'},
 dependency:{probability:0.02,riskIncrease:0.10,mechanism:'Integration failure is possible during build through deployment; lower readiness raises the risk.'},
 missing:{probability:0.02,riskIncrease:0.10,mechanism:'Data loss requires an active transfer measure; weaker evidence infrastructure raises the risk.'},
 agency:{probability:0.02,riskIncrease:0.08,from:3,mechanism:'A built workflow can obstruct intervention; weaker human-control design raises this risk.'},
 champion:{probability:0.06,riskIncrease:0,mechanism:'An external offer of staff time; independent of technical readiness in this teaching model.'}
};
scenario.events=scenario.events.filter(e=>e.id!=='quiet').map(e=>({...e,...eventAssumptions[e.id]}));


scenario.realismModel='constraints-v3';scenario.revision=3;
scenario.sensitivity='central';
scenario.context={lever:'vendor',localPilot:true,wideRollout:false,vendorInternals:false,independentAssessment:true,eventSeen:[],exposed:false};
scenario.brief+=' You have permission for a bounded local pilot, but not district-wide rollout. Vendor internals and routing controls are unavailable. Independent assessments are allowed. You may decline the engagement, pause until a named prerequisite changes, negotiate authority, or pivot to a teacher-controlled workflow. These are legitimate outcomes, not failures.';
scenario.disclaimer='This is an uncalibrated, mechanism-based teaching model. Probability ranges are scenario bounds, not confidence intervals or measured frequencies. Compare adverse, central and favorable assumptions before drawing conclusions. A process improvement is not proof of learner benefit.';
const messages=[
 ['The capability gap is clearer; whether an intervention will improve it remains unknown.','Stakeholders disagree about the goal. The scope remains contested.','Access to the relevant work is limited. The original problem framing remains unsupported.'],
 ['A competing explanation becomes testable. This improves the model, not learner performance.','The observations fit several explanations. More modeling cannot identify the mechanism from these data alone.','The proposed mechanism cannot be observed with the available access. Try an external assessment or a different lever.'],
 ['A feasible intervention and a falsifiable claim are specified. No benefit has been established yet.','The design trades reach for control; the capability claim must stay narrow.','The design depends on unavailable control, support or evidence. Reframe or change the lever.'],
 ['The bounded implementation works in the tested setting. Transfer to other settings is unproven.','The prototype works only with manual support. Staffing, not software, now limits scale.','Integration or staff workload defeats the implementation. Rebuilding the same thing may not address the constraint.'],
 ['The selected measures are usable. They can still leave attribution and unmeasured outcomes unresolved.','Data are incomplete or noisy. Absence of a clear signal is not evidence of no effect.','The measurement approach does not support the intended claim. Use a different observable outcome or narrow the question.'],
 ['The bounded rollout operates as intended; any learning change still needs independent evidence.','Some delivery occurs, but uptake and support vary. A subgroup may experience more burden than benefit.','Delivery underperforms or adds burden. A good design has encountered incompatible operating conditions.'],
 ['The evidence supports a bounded next decision. A before-and-after change does not isolate the intervention’s causal effect.','The result is inconclusive: effect, implementation and measurement explanations remain entangled.','The preferred explanation is contradicted or not identifiable. Revise the claim; consider stopping or investing elsewhere.'],
 ['The next cycle starts with a revised understanding of the problem.','The remaining uncertainty changes what can responsibly be promised.','The original intervention may no longer be worth pursuing.']
];
scenario.steps.forEach((step,i)=>{
 step.actions.forEach(x=>{x.narratives=messages[i];x.chance=i===6?[0.25,0.60,0.10,0.25]:[0.35,0.70,0.10,0.25];
  if(i!==5)for(const k of ['transfer','completion','gap'])delete x.effects[k];
 });
 step.actions.push(a('decline-'+i,'Decline or withdraw from this engagement','The feasible work cannot support the requested claim. Preserve remaining resources and record that decision without a success roll.',0,0,{}, {}, {kind:'decline',next:'finish'}));
 step.actions.push(a('pause-'+i,'Pause pending a prerequisite','Re-entry condition: written authority for a feasible scope and access to an independent outcome measure. This run ends as paused; no random draw grants permission.',0,0,{}, {}, {kind:'pause',next:'finish'}));
 step.actions.push(a('pivot-'+i,'Change lever: teacher-controlled workflow','Stop trying to alter the opaque vendor. Reframe around teacher-led practice, handoffs, or independent assessment. Budget and time are spent; reach is narrower and efficacy remains unknown.',4,2,{readiness:-8,fit:-5}, {}, {kind:'pivot',next:0}));
});
for(const id of ['d-auto','d-fade'])scenario.steps[2].actions.find(x=>x.id===id).needs=['vendorControl'];
scenario.steps[5].actions.find(x=>x.id==='p-wide').needs=['wideRollout'];
for(const id of ['i-transfer','i-full'])scenario.steps[4].actions.find(x=>x.id===id).needs=['independentAssessment'];
scenario.steps[1].actions.push(a('negotiate','Ask the authority holder for a bounded mandate','Escalate a concrete request. The authority holder may approve, defer, or refuse. More technical readiness cannot force approval.',3,2,{}, {}, {kind:'negotiate',chance:[0.15,0.45,0.20,0.35],narratives:['The authority holder approves wider rollout subject to evaluation. Vendor internals remain inaccessible.','The request is deferred. Your mandate is unchanged; the waiting time has a cost.','The request is refused. The constraint is outside your control; narrow scope, pause, or decline.']}));
scenario.steps[7].actions.find(x=>x.id==='r-conclude').kind='conclude';
scenario.events.forEach(e=>{e.oneShot=true;});


const actionBounds={
 'u-completion':[0.65,0.85,0.05,0.10],'u-field':[0.30,0.60,0.10,0.25],'u-bound':[0.25,0.60,0.15,0.30],
 'm-skill':[0.30,0.60,0.10,0.25],'m-system':[0.25,0.60,0.10,0.25],'m-compete':[0.20,0.55,0.10,0.25],
 'd-auto':[0.40,0.65,0.10,0.25],'d-fade':[0.25,0.60,0.15,0.30],'d-narrow':[0.40,0.65,0.10,0.20],
 'b-template':[0.40,0.70,0.10,0.25],'b-test':[0.30,0.65,0.10,0.25],'b-human':[0.45,0.70,0.05,0.20],
 'i-activity':[0.65,0.85,0.05,0.10],'i-transfer':[0.30,0.60,0.10,0.25],'i-full':[0.20,0.55,0.10,0.30],
 'p-wide':[0.15,0.45,0.20,0.40],'p-stage':[0.35,0.65,0.10,0.25],'p-pilot':[0.40,0.65,0.10,0.20],
 'e-headline':[0.70,0.85,0.05,0.10],'e-challenge':[0.25,0.55,0.10,0.25],'e-replicate':[0.25,0.60,0.10,0.25]
};
for(const step of scenario.steps)for(const x of step.actions)if(actionBounds[x.id])x.chance=actionBounds[x.id];
scenario.steps[0].actions[0].narratives=['The sponsor accepts the completion target. This says nothing about independent capability.','The target is adopted with unresolved disagreement about its meaning.','The sponsor and teachers cannot agree on a shared target.'];
scenario.steps[4].actions[0].narratives=['Completion logs are available. Independent performance remains unmeasured.','Some activity records are missing. No transfer evidence is available.','The logs cannot support a usable completion estimate.'];
scenario.steps[6].actions[0].narratives=['A headline report is delivered. Easier reporting does not strengthen the evidence or establish causality.','The report needs caveats because the trend is noisy or incomplete.','The available trend cannot support even the narrow headline claim.'];
for(const id of ['p-stage','p-pilot'])scenario.steps[5].actions.find(x=>x.id===id).needs=['localPilot'];

const exported={source,cycle,scenario};
if(typeof module!=='undefined'&&module.exports)module.exports=exported;
root.LensData=exported;
})(typeof globalThis!=='undefined'?globalThis:this);
