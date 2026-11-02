"""Define flower-domain responsibility contrasts while preserving their declared execution controls."""
from __future__ import annotations

import copy

DEFAULT_DOMAIN = "assessment_measurement_evaluation"
FRAMEWORK_ID = "learning-engineering-flower-v1"


def is_flower_config(config: dict, definitions: dict) -> bool:
    """Identify flower assignments without changing the legacy configuration schema."""
    if config.get("framework") == FRAMEWORK_ID:
        return True
    domains = {item["id"] for item in definitions.get("flower", {}).get("domains", [])}
    requested = set(config["omit_competencies"])
    for actor in config["team"]:
        requested.update(actor["competencies"])
    requested.update(config.get("participation", {}).get("individual", {}).get("competencies", []))
    return bool(domains & requested)


def active_module_ids(config: dict, definitions: dict) -> list[str]:
    """Keep default coverage within its framework while exposing explicitly mixed assignments."""
    flower = is_flower_config(config, definitions)
    requested = set(config["omit_competencies"])
    for actor in config["team"]:
        requested.update(actor["competencies"])
    return [item["id"] for item in definitions["competencies"]
            if (item.get("origin") == "flower") == flower or item["id"] in requested]


def shared_responsibilities(config: dict, definitions: dict) -> list[str]:
    """Retain shared learner and stakeholder duties even when a flower domain is withdrawn."""
    return list(definitions["flower"]["shared_responsibilities"]) if is_flower_config(config, definitions) else []


def validate_flower_comparison(spec: dict, definitions: dict) -> dict:
    """Require an explicit flower domain and member for the five distinct interventions."""
    fields = {"schema_version", "kind", "competency", "actor_id", "integration_modes"}
    if set(spec) != fields or type(spec["schema_version"]) is not int or spec["schema_version"] != 2 or spec["kind"] != "flower":
        raise ValueError("Flower comparison requires schema_version 2, kind, competency, actor_id, and integration_modes")
    domains = {item["id"] for item in definitions["flower"]["domains"]}
    if not isinstance(spec["competency"], str) or spec["competency"] not in domains:
        raise ValueError("Select a flower domain for the five-condition comparison")
    if not isinstance(spec["actor_id"], str) or not spec["actor_id"]:
        raise ValueError("Select the member whose domain responsibility or availability will change")
    modes = spec["integration_modes"]
    if not isinstance(modes, list) or not 1 <= len(modes) <= 2 or any(mode not in ("explicit", "handoff") for mode in modes) or len(set(modes)) != len(modes):
        raise ValueError("Comparison requires one or two distinct integration modes")
    return copy.deepcopy(spec)


def withdrawal_target(config: dict, actor_id: str, competency: str) -> dict:
    """Reject unavailable, unscheduled, or coordinating targets before constructing a contrast."""
    target = next((actor for actor in config["team"] if actor["id"] == actor_id), None)
    if target is None or not target["available"] or competency not in target["competencies"]:
        raise ValueError("The selected member must be available and explicitly assigned the selected domain")
    if actor_id == config["integration"]["coordinator"]:
        raise ValueError("Choose a contributing member; this comparison preserves the coordinator")
    stages = ["understand", "model", "design", "build", "instrument", "deploy", "evaluate", "refine"]
    if not set(target["stages"]) & set(stages[:stages.index(config["execution"]["through"]) + 1]):
        raise ValueError("The selected member has no contribution slots before the configured endpoint")
    return target


def _variant(base: dict, condition: str, spec: dict) -> dict:
    value = copy.deepcopy(base)
    domain = spec["competency"]
    if condition == "domain-omitted":
        value["omit_competencies"].append(domain)
    elif condition == "domain-withdrawn":
        actor = withdrawal_target(value, spec["actor_id"], domain)
        actor["competencies"].remove(domain)
        actor["persona_ref"] = None
    elif condition == "member-removed":
        withdrawal_target(value, spec["actor_id"], domain)["available"] = False
    elif condition == "individual":
        individual = value["participation"]["individual"]
        # Consolidate identity, preserving each source slot's actual domain exposure.
        individual["competencies"] = list(dict.fromkeys(key for actor in value["team"] if actor["available"] for key in actor["competencies"]))
        individual.update(available=True, persona_ref=None)
        value["participation"]["mode"] = "individual"
    return value


def flower_conditions(base: dict, spec: dict) -> list[tuple[str, dict]]:
    """Build all five arms from one reference team without adding hidden redundancy."""
    from experiment_config import upgrade_config

    base = upgrade_config(base)
    base["participation"]["mode"] = "team"
    base["omit_competencies"] = [key for key in base["omit_competencies"] if key != spec["competency"]]
    withdrawal_target(base, spec["actor_id"], spec["competency"])
    result = []
    for integration in spec["integration_modes"]:
        for condition in ("full-team", "domain-omitted", "domain-withdrawn", "member-removed", "individual"):
            value = _variant(base, condition, spec)
            value["integration"]["mode"] = integration
            value["execution"]["repetitions"] = 1
            result.append((condition + "-" + integration, value))
    return result


def annotate_flower_plans(plans: list[dict], spec: dict) -> None:
    """Record overlap, lost capacity, and coincident instruction contrasts without outcome claims."""
    from experiment_config import resolve_config

    reference = resolve_config(plans[0]["config"])
    domain = spec["competency"]
    overlap = [actor for actor in reference["coverage"][domain]["scheduled_actors"] if actor != spec["actor_id"]]
    for item in plans:
        resolved = resolve_config(item["config"])
        item["flower_intervention"] = {
            "domain": domain, "target_actor": spec["actor_id"], "other_assigned_actors": overlap,
            "reference_slots": reference["planned_calls"], "planned_slots": resolved["planned_calls"],
            "lost_slots": reference["planned_calls"] - resolved["planned_calls"],
            "omission_and_withdrawal_coincide": not overlap,
        }
        item["matching"]["notes"].append("Member removal changes available effort. Domain omission and withdrawal retain the reference contribution slots. Shared learner and stakeholder responsibilities remain assigned.")
        if not overlap:
            item["matching"]["notes"].append("The target is the only scheduled assignee: global omission and single-member withdrawal remove the same explicit domain instructions. Assign overlap before comparing compensation.")
        if resolved["comparison_signature"]["individual_behavior_changed_slots"]:
            item["matching"]["notes"].append("The individual uses a different behavior profile in some slots; this is not an identity-only contrast.")
