// Reproducible mechanistic competency-availability and integration fixture.
// Run: node tools/lifecycle/competency_pilot.mjs mvp|v2
// Does not call a language model. Keep its authored causal assumptions visible.

export function runSuite(version="mvp") {
  const spec={
    id:"ai-operations-readiness-v1",
    world_public:{
      organization:"Fictional three-site logistics operation, 220 staff",
      brief:"An AI dispatch assistant shortened routine decisions, but exception errors and inconsistent handoffs remain; management seeks throughput, reliable judgment, worker agency, and affordable deployment.",
      disclosed_evidence:["Exception errors rose from 11% to 17% after rollout.","Routine cases became faster while unusual cases and shift changes remain problematic.","Some staff report uncertainty about when to override the assistant."],
      constraints:["Implementation budget: 7 units.","No unapproved access to real worker records.","Staff cannot be taken off shift for more than brief sessions."],
      objective_axes:["capability","agency","throughput","recovery"]
    },
    hidden_state:{failure_modes:["over-reliance during assistant outage","ambiguous escalation ownership","insufficient practice on novel cases"],warning:"Only the test environment uses this object; participant policies never receive it."},
    participants:[
      {id:"ops",profession:"Operations manager",role:"Project sponsor and operational lead",competencies:{subject_matter_expertise:0.95,learning_environment_engineering:0.7,learning_sciences:0.15},availability:"embedded"},
      {id:"data",profession:"Data scientist",role:"Evidence and measurement lead",competencies:{data_science:0.95,assessment_measurement_evaluation:0.55,learning_sciences:0.25},availability:"embedded"},
      {id:"trainer",profession:"Workplace training designer",role:"Learning intervention designer",competencies:{education_training_professionals:0.9,learning_experience_design:0.9,learning_sciences:0.48},availability:"embedded"},
      {id:"ls",profession:"Learning scientist",role:"Optional transfer and learning-evidence consultant",competencies:{learning_sciences:0.95,assessment_measurement_evaluation:0.8},availability:"consultable"}
    ],
    budget:7
  };
  const catalog=[
    {id:"workflow_mapping",actor:"ops",cost:1,prob:.85,priority:1.5,cap:1,agency:4,throughput:7,recovery:5,tags:["workflow"],line:"Map exception and shift-change handoffs before buying another training package."},
    {id:"supervisor_escalation",actor:"ops",cost:1,prob:.64,priority:1.0,cap:3,agency:2,throughput:3,recovery:8,tags:["workflow","fallback"],line:"Give each shift an explicit escalation owner and a handoff rule."},
    {id:"fallback_protocol",actor:"ops",cost:1,prob:.62,priority:.9,cap:5,agency:3,throughput:-1,recovery:15,tags:["fallback"],line:"Specify what staff do when the assistant is unavailable."},
    {id:"instrumentation",actor:"data",cost:1,prob:.83,priority:1.4,cap:1,agency:1,throughput:4,recovery:5,tags:["measure"],line:"Separate routine and exception events; retain first attempts and denominators."},
    {id:"predictive_alerts",actor:"data",cost:2,prob:.75,priority:1.12,cap:0,agency:-3,throughput:11,recovery:-7,tags:["automation"],line:"Add targeted alerts for unusual cases, with a measured false-alarm rate."},
    {id:"comparison_audit",actor:"data",cost:1,prob:.55,priority:.88,cap:1,agency:1,throughput:1,recovery:4,tags:["measure"],line:"Compare handoff errors by shift and case complexity before attributing causation."},
    {id:"guided_walkthrough",actor:"trainer",cost:1,prob:.78,priority:1.23,cap:6,agency:1,throughput:3,recovery:2,tags:["practice"],line:"Offer short worked examples of routine and exception cases."},
    {id:"practice_rehearsal",actor:"trainer",cost:2,prob:.78,priority:1.19,cap:12,agency:2,throughput:-1,recovery:8,tags:["practice"],line:"Use brief supported rehearsal with corrective feedback during shifts."},
    {id:"job_aid",actor:"trainer",cost:1,prob:.75,priority:1.04,cap:5,agency:7,throughput:5,recovery:5,tags:["interface"],line:"Provide a job aid for exceptions, with an accessible alternative."},
    {id:"transfer_probe",actor:"trainer",cost:2,prob:.27,priority:.94,cap:14,agency:2,throughput:-3,recovery:10,tags:["transfer","practice"],line:"Try a changed case without the assistant to see whether the method transfers."},
    {id:"varied_transfer_practice",actor:"ls",cost:2,prob:.94,priority:1.36,cap:18,agency:3,throughput:-3,recovery:13,tags:["transfer","practice"],line:"Practice novel failure cases and scaffold independent judgment, not just interface use."},
    {id:"delayed_unassisted_check",actor:"ls",cost:1,prob:.86,priority:1.10,cap:5,agency:0,throughput:-1,recovery:4,tags:["transfer","measure"],line:"Check delayed, unassisted performance; do not use completion as proof of readiness."}
  ];
  const allowed={ops:["workflow_mapping","supervisor_escalation","fallback_protocol"],data:["instrumentation","predictive_alerts","comparison_audit"],trainer:["guided_walkthrough","practice_rehearsal","job_aid","transfer_probe"],ls:["varied_transfer_practice","delayed_unassisted_check"]};
  function rng(seed){let x=seed>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
  function hash(value){let s=JSON.stringify(value),h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return ("00000000"+(h>>>0).toString(16)).slice(-8)}
  const conds=[
    {id:"baseline",specialist:false,integration:false,label:"Embedded team only"},
    {id:"consultable",specialist:true,integration:false,label:"Learning scientist consultable"},
    {id:"integrated",specialist:true,integration:true,label:"Same expertise; structured integration"}
  ];
  const variants=version==="mvp"?["standard"]:["standard","rapid_turnover"];
  const seeds=version==="mvp"?[41,42,43]:Array.from({length:40},(_,i)=>201+i);
  const rows=[],traces=[],audits={unauthorized_proposals:0,unavailable_expert_utterances:0,freeze_mutations:0,budget_violations:0,mismatched_event_seeds:0};
  function build(seed,condition,variant) {
    const r=rng(seed*997+(variant==="standard"?19:29));
    const messages=[],proposals=[];
    function say(actor,text,type="discussion"){messages.push({id:`m${messages.length+1}`,actor,type,text})}
    say("ops","We need fewer exceptions and dependable throughput, not a course that merely looks completed. What is actually failing?");
    say("data","The headline error rate mixes ordinary cases and exceptions. We should avoid claiming causality from that number.");
    say("trainer","We can help people practice decisions, but I'm not yet sure whether the main issue is knowledge, interface design, or shift workflow.");
    const offered=catalog.filter(a=>a.actor!=="ls");
    for (const a of offered) {
      const p=Math.min(.98,a.prob+(condition.integration? .055:0));
      if(r()<p){proposals.push({...a,proposal_origin:a.actor});if(r()<.54)say(a.actor,a.line,"proposal")}
    }
    const needExpert=condition.specialist&&(r()<(condition.integration?.91:.48));
    if(condition.specialist) {
      say("trainer",needExpert?"I want a learning-science review of how independent judgment will be tested. Can we consult?":"We have access to a learning scientist, but consultation is not yet scheduled.","request");
    } else {
      say("trainer","We do not have a dedicated learning scientist for this project; I can suggest basic rehearsal but cannot certify transfer.","boundary");
    }
    if(needExpert) {
      say("ls","The first question is whether staff can recognize and handle a changed exception without the AI assistant. I can advise on that, but I cannot certify operational feasibility.","consultation");
      for(const a of catalog.filter(a=>a.actor==="ls")) if(r()<a.prob){proposals.push({...a,proposal_origin:"ls"});say("ls",a.line,"proposal")}
    }
    if(condition.integration) {
      say("ops","Integration check: separate the performance, capability, and worker impacts. What do we know, and what remains uncertain?","integration");
      say("data","We need segmented first-attempt evidence and an independent check rather than treating completed walkthroughs as workforce readiness.","integration");
      say("trainer","We should connect any practice activity to the exception workflow and to a feasible unassisted check.","integration");
      say("ops","Before committing resources, identify who owns fallback decisions and which unresolved assumptions require a pilot.","integration");
    }
    const taken=new Set(),selected=[];let remaining=spec.budget;
    const ranked=proposals.map(a=>{
      let support=0;
      if(condition.integration){
        if(a.tags.includes("fallback")||a.tags.includes("workflow"))support+=.22;
        if(a.tags.includes("transfer"))support+=.24;
        if(a.tags.includes("measure"))support+=.16;
        if(a.tags.includes("automation"))support-=.19;
      }
      return {...a,rank:a.priority+support+(r()-.5)*.82};
    }).sort((a,b)=>b.rank-a.rank);
    for(const a of ranked) {
      if(taken.has(a.id)||a.cost>remaining)continue;
      selected.push({id:a.id,actor:a.actor,cost:a.cost,reason:a.line,rank:+a.rank.toFixed(3)});
      taken.add(a.id);remaining-=a.cost;
      say(a.actor,`I recommend ${a.id.replaceAll("_"," ")} within the seven-unit budget. ${a.line}`,"decision");
    }
    say("ops",`Commit ${selected.length} interventions at ${spec.budget-remaining} of ${spec.budget} units. Record unresolved assumptions and test what happens when the assistant fails.`,"freeze");
    const frozen={scenario:spec.id,variant,seed,condition:condition.id,actions:selected.map(x=>x.id),spent:spec.budget-remaining};
    const frozenHash=hash(frozen);
    const overlay=[
      {message_id:"m2",question:"What evidence distinguishes task capability from workflow or technology failure?"},
      {message_id:messages.find(x=>x.type==="request"||x.type==="boundary")?.id,question:"Is learning-science expertise actually requested and used, or only nominally available?"},
      {message_id:messages[ messages.length-1].id,question:"Which decisions are frozen, and what failure modes remain unaddressed?"}
    ].filter(x=>x.message_id);
    return {frozen,frozen_hash:frozenHash,messages,overlay,consultation_occurred:needExpert,proposals:proposals.map(x=>({id:x.id,actor:x.actor})),selected,remaining};
  }
  function deploy(design,difficulty,variant,seed){
    const sr=rng(seed*2047+(variant==="standard"?1:5)+(difficulty==="easy"?23:difficulty==="medium"?47:71));
    const jitter=Math.round((sr()-.5)*4);
    const actionIDs=design.frozen.actions,chosen=actionIDs.map(id=>catalog.find(a=>a.id===id));
    let state={capability:55,agency:60,throughput:100,recovery:48};
    for(const a of chosen)for(const k of Object.keys(state))state[k]+=a[k];
    const tags=new Set(chosen.flatMap(a=>a.tags));
    if(actionIDs.includes("varied_transfer_practice")&&actionIDs.includes("practice_rehearsal"))state.capability+=3;
    if(actionIDs.includes("fallback_protocol")&&actionIDs.includes("supervisor_escalation"))state.recovery+=4;
    const shock=difficulty==="easy"?0:difficulty==="medium"?1:2;
    const regime=variant==="rapid_turnover"?1:0;
    if(shock){
      state.capability-=(shock===1?6:17)+regime*5;
      state.agency-=(shock===1?3:9)+regime*2;
      state.throughput-=(shock===1?10:28)+regime*4;
      state.recovery-=(shock===1?14:36)+regime*5;
      if(tags.has("fallback")){state.recovery+=shock===1?7:17;state.throughput+=shock===1?2:8}
      if(tags.has("transfer")){state.capability+=shock===1?6:14;state.recovery+=shock===1?4:11}
      if(tags.has("workflow")){state.throughput+=shock===1?3:6;state.recovery+=shock===1?2:4}
      if(tags.has("automation")&&shock===2){state.agency-=3;state.throughput-=4;state.recovery-=6}
    }
    state.throughput+=jitter;state.capability+=Math.round(jitter/2);
    for(const k of Object.keys(state))state[k]=Math.max(0,Math.min(150,Math.round(state[k])));
    return {event:difficulty,variant,stress_description:difficulty==="easy"?"Routine operations":difficulty==="medium"?"Shift turnover and exception surge":"Assistant unavailable during a surge; independent judgment required",outcomes:state,event_seed:seed*2047+(variant==="standard"?1:5)+(difficulty==="easy"?23:difficulty==="medium"?47:71)};
  }
  for(const variant of variants)for(const seed of seeds)for(const condition of conds) {
    const d=build(seed,condition,variant);
    const before=hash(d.frozen);
    for(const p of d.proposals)if(!allowed[p.actor].includes(p.id))audits.unauthorized_proposals++;
    if(!d.consultation_occurred&&d.messages.some(m=>m.actor==="ls"))audits.unavailable_expert_utterances++;
    if(d.remaining<0)audits.budget_violations++;
    const tests=["easy","medium","hard"].map(level=>deploy(d,level,variant,seed));
    if(hash(d.frozen)!==before)audits.freeze_mutations++;
    if(tests.some((t,i)=>t.event_seed!==seed*2047+(variant==="standard"?1:5)+[23,47,71][i]))audits.mismatched_event_seeds++;
    rows.push({variant,seed,condition:condition.id,consultation:d.consultation_occurred,proposal_count:d.proposals.length,selected:d.selected.map(x=>x.id),spent:d.frozen.spent,freeze:d.frozen_hash,dialogue_turns:d.messages.length,tests});
    if(traces.filter(t=>t.variant===variant&&t.condition===condition.id).length===0)traces.push({variant,condition:condition.id,seed,freeze:d.frozen_hash,transcript:d.messages,teaching_overlays:d.overlay,proposal_registry:d.proposals,intervention:d.selected,tests});
  }
  const summary=conds.map(c=>{
    const condRows=rows.filter(x=>x.condition===c.id);
    const means={};
    for(const lev of ["easy","medium","hard"]){
      means[lev]={};
      for(const ax of spec.world_public.objective_axes)means[lev][ax]=+(condRows.reduce((s,x)=>s+x.tests.find(t=>t.event===lev).outcomes[ax],0)/condRows.length).toFixed(2);
    }
    return {condition:c.id,n_designs:condRows.length,consultation_rate:+(condRows.filter(x=>x.consultation).length/condRows.length).toFixed(3),avg_spend:+(condRows.reduce((s,x)=>s+x.spent,0)/condRows.length).toFixed(2),mean_dialogue_turns:+(condRows.reduce((s,x)=>s+x.dialogue_turns,0)/condRows.length).toFixed(2),mean_outcomes:means};
  });
  const replay=build(seeds[0],conds[0],variants[0]);const exactReplay=hash(replay.frozen)===rows[0].freeze;
  return {schema:"competency-mediation-mechanistic-1",version,evidence_type:"deterministic policy-agent fixture; NOT independently generated LLM conversations or evidence about human learners",not_a_result:"All world-to-outcome effects are authored assumptions; comparisons demonstrate model behavior and architecture only.",model_status:"No external provider invoked; no human subjects; no statistical inference.",scenario:spec,conditions:conds,action_catalog:catalog,seed_register:{variants,seeds,randomization:"fixed deterministic per seed and condition; deployment event seeds matched across conditions"},n_designs:rows.length,n_deployments:rows.length*3,summary,validity_audits:{...audits,exact_replay:exactReplay},rows,traces};
}

if (process.argv[1]?.endsWith('competency_pilot.mjs')) {
  const mode = process.argv[2] || 'mvp';
  if (!['mvp','v2'].includes(mode)) throw new Error('Expected mvp or v2');
  process.stdout.write(JSON.stringify(runSuite(mode), null, 2) + '\n');
}
