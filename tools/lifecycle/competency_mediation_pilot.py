#!/usr/bin/env python3
"""Reproducible mechanistic fixture; not a live LLM or human study."""
import hashlib,json,random,sys
A={"map_workflow":("ops",1,[1,3,7,6],.88),"assign_escalation":("ops",1,[3,2,4,8],.58),"manual_fallback":("ops",1,[4,2,-2,15],.57),"segment_errors":("data",1,[1,1,3,4],.85),"predictive_alerts":("data",2,[0,-4,12,-8],.74),"compare_shifts":("data",1,[1,1,2,3],.53),"worked_examples":("trainer",1,[5,2,3,1],.82),"rehearse_exceptions":("trainer",2,[12,2,-2,8],.79),"job_aid":("trainer",1,[5,7,5,4],.74),"unassisted_probe":("ls",1,[6,0,-2,6],.88),"varied_transfer":("ls",2,[17,3,-4,13],.91)}
P={"map_workflow":1.4,"assign_escalation":1.,"manual_fallback":1.,"segment_errors":1.35,"predictive_alerts":1.13,"compare_shifts":.95,"worked_examples":1.25,"rehearse_exceptions":1.2,"job_aid":1.1,"unassisted_probe":1.06,"varied_transfer":1.25}
AX=["capability","agency","throughput","recovery"]
C=["baseline","consultation","integration"]
def digest(x):return hashlib.sha256(json.dumps(x,sort_keys=True).encode()).hexdigest()
def draw(seed,variant,key):return random.Random(f"{seed}/{variant}/{key}").random()
def design(seed,variant,cond):
  chat=[["ops","We need throughput, judgment and worker agency; which failures are caused by workflow rather than training?"],["data","Reported errors mix ordinary cases with exceptions."],["trainer","We should investigate whether practice, workflow, or interface is the barrier."]]
  offered=[k for k,v in A.items() if v[0]!="ls" and draw(seed,variant,k+"/offer")<v[3]]
  consulted=cond!="baseline" and draw(seed,variant,"consult")<(.48 if cond=="consultation" else .9)
  if consulted:
    chat.append(["ls","Check independent judgment on changed cases. Practice completion alone is not evidence."])
    offered += [k for k,v in A.items() if v[0]=="ls" and draw(seed,variant,k+"/offer")<v[3]]
  elif cond=="baseline":chat.append(["trainer","Learning-science expertise is unavailable; keep transfer claims provisional."])
  else:chat.append(["trainer","Consultation was available but not initiated."])
  if cond=="integration":chat += [["ops","Integrate operational, learner and human objectives, recording unresolved tradeoffs."],["data","Check independent evidence and first attempts."],["trainer","Align practice with workplace exceptions."]]
  bonuses={"manual_fallback":.24,"assign_escalation":.17,"varied_transfer":.2,"unassisted_probe":.15,"predictive_alerts":-.2,"segment_errors":.12}
  def priority(k):return P[k]+(bonuses.get(k,0) if cond=="integration" else 0)+(draw(seed,variant,k+"/rank")-.5)*.85
  budget=7;selected=[]
  for k in sorted(offered,key=priority,reverse=True):
    if A[k][1]<=budget:
      selected.append(k);budget-=A[k][1];chat.append([A[k][0],"Adopt "+k+"; provisional causal assumptions remain."])
  artifact={"seed":seed,"variant":variant,"condition":cond,"actions":selected,"spent":7-budget}
  chat.append(["ops","Frozen intervention: "+", ".join(selected)])
  return {"artifact":artifact,"hash":digest(artifact),"consulted":consulted,"conversation":chat}
def test(art,level):
  names=set(art["actions"]);scores=[55,60,100,48]
  for k in names:scores=[x+y for x,y in zip(scores,A[k][2])]
  if {"manual_fallback","assign_escalation"}<=names:scores[3]+=4
  if {"varied_transfer","rehearse_exceptions"}<=names:scores[0]+=3
  if level!="easy":
    medium=level=="medium";pen=[6,3,10,14] if medium else [17,9,28,36]
    if art["variant"]=="rapid_turnover":pen=[x+y for x,y in zip(pen,[5,2,4,5])]
    scores=[x-y for x,y in zip(scores,pen)]
    if "manual_fallback" in names:scores[3]+=7 if medium else 17;scores[2]+=2 if medium else 8
    if "varied_transfer" in names or "unassisted_probe" in names:scores[0]+=6 if medium else 14;scores[3]+=4 if medium else 11
    if "map_workflow" in names:scores[2]+=3 if medium else 6;scores[3]+=2 if medium else 4
    if level=="hard" and "predictive_alerts" in names:scores[1]-=3;scores[2]-=4;scores[3]-=6
  jitter=random.Random(f'{art["seed"]}/{art["variant"]}/{level}/event').randint(-2,2)
  scores[2]+=jitter;scores[0]+=round(jitter/2)
  return {"level":level,"indices":dict(zip(AX,[max(0,min(150,int(x))) for x in scores])),"event_key":digest([art["seed"],art["variant"],level])}
def run(version):
  seeds=range(41,44) if version=="mvp" else range(201,241)
  variants=["standard"] if version=="mvp" else ["standard","rapid_turnover"]
  rows=[];traces=[];issues=[]
  for variant in variants:
    for seed in seeds:
      for cond in C:
        d=design(seed,variant,cond);h=d["hash"]
        observations=[test(d["artifact"],level) for level in ["easy","medium","hard"]]
        if digest(d["artifact"])!=h:issues.append("mutation")
        if d["artifact"]["spent"]>7:issues.append("overspend")
        if not d["consulted"] and any(t[0]=="ls" for t in d["conversation"]):issues.append("expert-leak")
        rows.append({"seed":seed,"variant":variant,"condition":cond,"consulted":d["consulted"],"artifact":d["artifact"],"hash":h,"deployment":observations})
        if seed==next(iter(seeds)):traces.append({"condition":cond,"variant":variant,**d,"deployment":observations})
  summary=[]
  for cond in C:
    subset=[r for r in rows if r["condition"]==cond]
    summary.append({"condition":cond,"consultation_rate":round(sum(r["consulted"] for r in subset)/len(subset),3),"hard_means":{axis:round(sum(r["deployment"][2]["indices"][axis] for r in subset)/len(subset),2) for axis in AX}})
  matched=all(len({r["deployment"][i]["event_key"] for r in rows if r["seed"]==seed and r["variant"]==v})==1 for v in variants for seed in seeds for i in range(3))
  replay=all(design(r["seed"],r["variant"],r["condition"])["hash"]==r["hash"] for r in rows)
  return {"version":version,"evidence":"authored policy-agent simulation; not real LLM or human outcome evidence","models":A,"designs":len(rows),"deployments":len(rows)*3,"summary":summary,"audits":{"issues":issues,"matched_events":matched,"exact_replay":replay},"rows":rows,"sample_conversations":traces}
if __name__=="__main__":
  version=sys.argv[1] if len(sys.argv)>1 else "mvp"
  assert version in ("mvp","v2")
  print(json.dumps(run(version),indent=2))
