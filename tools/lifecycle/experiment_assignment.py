"""Compile explicit actor assignments into comparable execution slots without inferred human proficiency."""
from __future__ import annotations

import copy
import hashlib
import json
from experiment_flower import active_module_ids, is_flower_config, shared_responsibilities

STAGES = ("understand", "model", "design", "build", "instrument", "deploy", "evaluate", "refine")


def _hash(value: object) -> str:
    encoded = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(encoded.encode()).hexdigest()


def _profile(actor: dict, modules: dict, omitted: set[str], definitions: dict, shared: list[str] | None = None) -> dict:
    selected = [modules[key] for key in actor["competencies"] if key not in omitted]
    profile = {
        "name": actor["name"], "actor_id": actor["id"], "functional_role": actor["role"],
        "category": "experiment-contributor", "abstract": False, "lineage": [],
        "competency_ids": [module["id"] for module in selected],
        "competency": " ".join(module["description"] for module in selected) or "No explicit competency module is assigned for this contribution.",
        "duties": [*(shared or []), *[instruction for module in selected for instruction in module["instructions"]]],
        "focus_lenses": list(dict.fromkeys(lens for module in selected for lens in module["task_lenses"])),
        "proficiency_targets": {}, "demonstrated_proficiency": "unverified; instruction assignment is not performance evidence",
        "behavior": copy.deepcopy(actor["behavior"]),
        "behavior_instructions": [definitions["behavior_options"][key][value] for key, value in actor["behavior"].items()],
        "authority": actor["authority"], "authority_instruction": definitions["authority_options"][actor["authority"]],
    }
    if "persona_ref" in actor:
        profile["persona_ref"] = copy.deepcopy(actor["persona_ref"])
    return profile


def _source_roles(config: dict, definitions: dict, modules: dict) -> dict:
    omitted = set(config["omit_competencies"])
    shared = shared_responsibilities(config, definitions)
    roles = {actor["id"]: _profile(actor, modules, omitted, definitions, shared) for actor in config["team"] if actor["available"]}
    coordinator = copy.deepcopy(roles[config["integration"]["coordinator"]])
    coordinator["category"] = "experiment-coordinator"
    coordinator["integration_instruction"] = definitions["integration_instructions"][config["integration"]["mode"]]
    roles["orchestrator"] = coordinator
    return roles


def _source_schedule(config: dict) -> dict:
    return {stage: [actor["id"] for actor in config["team"] if actor["available"] and stage in actor["stages"]] for stage in STAGES}


def _plan(config: dict, schedule: dict, roles: dict) -> list[dict]:
    plan = []
    for stage in STAGES[:STAGES.index(config["execution"]["through"]) + 1]:
        turns = [("contribution", actor) for actor in schedule[stage]] + [("decision", "orchestrator")]
        for index, (kind, key) in enumerate(turns, 1):
            profile = roles[key]
            plan.append({"slot_id": f"{stage}-{kind}-{index:02d}", "stage": stage, "kind": kind,
                         "actor_id": profile["actor_id"], "source_actor_id": profile["actor_id"],
                         "profile_key": key, "competency_ids": list(profile["competency_ids"])})
    return plan


def _individual_roles(config: dict, plan: list[dict], sources: dict, definitions: dict, modules: dict) -> dict:
    individual = config["participation"]["individual"]
    roles = {}
    for slot in plan:
        source = sources[slot["profile_key"]]
        actor = copy.deepcopy(individual)
        # Preserve when each duty is available; consolidating identity does not multiply its exposure.
        actor["competencies"] = [key for key in source["competency_ids"] if key in individual["competencies"]]
        actor["authority"] = source["authority"]
        actor["role"] = "Stage coordinator" if slot["kind"] == "decision" else "Project contributor"
        profile = _profile(actor, modules, set(config["omit_competencies"]), definitions, shared_responsibilities(config, definitions))
        if slot["kind"] == "decision":
            profile["category"] = "experiment-coordinator"
            profile["integration_instruction"] = source["integration_instruction"]
        slot.update(actor_id=individual["id"], profile_key=slot["slot_id"], competency_ids=list(profile["competency_ids"]))
        roles[slot["profile_key"]] = profile
    # Legacy viewers may ask for this alias; it represents the same individual, not another actor.
    decision = next(slot for slot in plan if slot["kind"] == "decision")
    roles["orchestrator"] = copy.deepcopy(roles[decision["profile_key"]])
    return roles


def _coverage(config: dict, modules: dict, plan: list[dict], individual_mode: bool) -> dict:
    actors = [config["participation"]["individual"]] if individual_mode else config["team"]
    result = {}
    for key in modules:
        assigned = [actor for actor in actors if key in actor["competencies"]]
        omitted = key in config["omit_competencies"]
        available = [] if omitted else [actor for actor in assigned if actor["available"]]
        scheduled = list(dict.fromkeys(slot["actor_id"] for slot in plan if key in slot["competency_ids"]))
        result[key] = {"assigned_to": [actor["id"] for actor in assigned],
                       "available_to": [actor["id"] for actor in available], "scheduled_actors": scheduled, "omitted": omitted}
    return result


def _contract(definitions: dict, framework: dict, modules: dict, roles: dict, config: dict) -> dict:
    lenses = {key for profile in roles.values() for key in profile["focus_lenses"]}
    domains = {domain for profile in roles.values() for key in profile["competency_ids"] for domain in modules[key]["domains"]}
    scoped = {"version": framework["version"], "domains": [item for item in framework["domains"] if item["id"] in domains],
              "task_lenses": [item for item in framework["task_lenses"] if item["id"] in lenses]}
    if is_flower_config(config, definitions):
        flower = definitions["flower"]
        scoped = {"version": flower["version"], "id": flower["id"], "domains": copy.deepcopy(flower["domains"]),
                  "task_lenses": [], "center": flower["center"], "stakeholders": flower["stakeholders"],
                  "source": copy.deepcopy(flower["source"]), "shared_responsibilities": list(flower["shared_responsibilities"]),
                  "status": flower["status"], "crosswalk": "None; flower domains organize requested contributions."}
        framework = flower
    return {"registry_version": "experiment-" + definitions["version"], "framework_version": framework["version"],
            "registry_hash": _hash(definitions), "framework_hash": _hash(framework), "framework": scoped, "roles": roles,
            "claim": "Explicit assigned simulation instructions; no inherited duties or demonstrated human proficiency."}


def _signature(config: dict, plan: list[dict], roles: dict, sources: dict, individual_mode: bool) -> dict:
    profiles = [roles[slot["profile_key"]] for slot in plan]
    source_profiles = [sources["orchestrator" if slot["kind"] == "decision" else slot["source_actor_id"]] for slot in plan]
    execution = {key: value for key, value in config["execution"].items() if key != "repetitions"}
    model_fields = ("name", "functional_role", "competency", "duties", "behavior_instructions", "authority_instruction", "integration_instruction")
    return {
        "schema_version": 1, "slot_count": len(plan),
        "opportunities_hash": _hash([{key: slot[key] for key in ("slot_id", "stage", "kind", "source_actor_id")} for slot in plan]),
        "competency_exposure_hash": _hash([slot["competency_ids"] for slot in plan]),
        "behavior_hash": _hash([profile["behavior"] for profile in profiles]),
        "authority_hash": _hash([profile["authority"] for profile in profiles]),
        "model_profiles_hash": _hash([{key: profile[key] for key in model_fields if key in profile} for profile in profiles]),
        "case_hash": _hash(config["seed"]), "environment_hash": _hash(config["environment"]),
        "challenges_hash": _hash(config["challenges"]), "outcomes_hash": _hash(config.get("outcomes")),
        "execution_hash": _hash(execution), "integration_hash": _hash(config["integration"]["mode"]),
        "actor_identity_hash": _hash([slot["actor_id"] for slot in plan]),
        "individual_filtered_competencies": sorted({key for profile in source_profiles for key in profile["competency_ids"]} - {key for slot in plan for key in slot["competency_ids"]}),
        "individual_behavior_changed_slots": [slot["slot_id"] for slot, profile, source in zip(plan, profiles, source_profiles) if profile["behavior"] != source["behavior"]],
        "notes": [
            "Equal slots and accepted-character limits match contribution opportunities, not tokens, elapsed time, or human workload.",
            "The shared decision-parameter interface can cue perspectives even when an explicit competency instruction is omitted.",
            "Assigned modules and requested behavior do not establish demonstrated human proficiency.",
        ] + (["One model actor performs the same scheduled duties; a selected specialist filters those duties while retaining the same calls."] if individual_mode else []),
    }


def compile_assignment(config: dict, definitions: dict, framework: dict) -> dict:
    """Return bounded profiles, coverage, and ordered turn slots for a validated configuration."""
    modules = {item["id"]: item for item in definitions["competencies"]}
    sources = _source_roles(config, definitions, modules)
    source_schedule = _source_schedule(config)
    plan = _plan(config, source_schedule, sources)
    individual_mode = config.get("participation", {}).get("mode") == "individual"
    roles = _individual_roles(config, plan, sources, definitions, modules) if individual_mode else sources
    schedule = ({stage: [config["participation"]["individual"]["id"] for _ in assigned]
                 for stage, assigned in source_schedule.items()} if individual_mode else source_schedule)
    coverage_modules = {key: modules[key] for key in active_module_ids(config, definitions)}
    return {"role_contract": _contract(definitions, framework, modules, roles, config),
            "coverage": _coverage(config, coverage_modules, plan, individual_mode), "schedule": schedule,
            "planned_calls": len(plan), "execution_plan": plan, "execution_plan_hash": _hash(plan),
            "comparison_signature": _signature(config, plan, roles, sources, individual_mode)}
