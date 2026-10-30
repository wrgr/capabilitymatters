"""Resolve bounded experiment configurations into auditable, explicitly assigned simulation instructions."""
from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any

REPO = Path(__file__).resolve().parents[2]
CATALOG = REPO / "src/data/lifecycle/experiment-catalog.json"
DEFAULT_CONFIG = REPO / "src/data/lifecycle/experiments/baseline.json"
FRAMEWORK = REPO / "src/data/lifecycle/competencies.json"
STAGES = ("understand", "model", "design", "build", "instrument", "deploy", "evaluate", "refine")
SEED_FIELDS = {"title", "idea", "domain", "people", "constraints"}
CONFIG_FIELDS = {"schema_version", "id", "name", "seed", "team", "integration", "omit_competencies", "environment", "challenges", "execution"}
ACTOR_FIELDS = {"id", "name", "role", "competencies", "stages", "behavior", "authority", "available"}
RESERVED_ACTORS = {"orchestrator", "scenario", "human"}
IDENTIFIER = re.compile(r"[a-z][a-z0-9_-]{0,63}\Z")


def _object(value: Any, fields: set[str], label: str) -> dict:
    if not isinstance(value, dict) or set(value) != fields:
        raise ValueError(f"{label} must contain exactly: {', '.join(sorted(fields))}")
    return value


def _text(value: Any, label: str, limit: int = 6000, empty: bool = False) -> str:
    if not isinstance(value, str) or len(value) > limit or (not empty and not value.strip()):
        raise ValueError(f"{label} must be {'optional' if empty else 'nonempty'} text of at most {limit} characters")
    return value.strip()


def _identifier(value: Any, label: str) -> str:
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value):
        raise ValueError(f"{label} must start with a lowercase letter and use at most 64 lowercase letters, digits, hyphens, or underscores")
    return value


def _choice(value: Any, options: Any, label: str) -> str:
    if not isinstance(value, str) or value not in options:
        raise ValueError(f"Invalid {label}; choose from {', '.join(options)}")
    return value


def _selection(value: Any, options: Any, label: str) -> list[str]:
    if not isinstance(value, list) or len(value) > len(options):
        raise ValueError(f"{label} must be a bounded list")
    result = [_choice(item, options, label) for item in value]
    if len(result) != len(set(result)):
        raise ValueError(f"{label} must not contain duplicates")
    return result


def _integer(value: Any, label: str, minimum: int, maximum: int) -> int:
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f"{label} must be an integer from {minimum} to {maximum}")
    return value


def _hash(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(encoded.encode()).hexdigest()


def catalog() -> dict:
    """Return a fresh copy of the versioned instruction catalog."""
    value = json.loads(CATALOG.read_text())
    framework = json.loads(FRAMEWORK.read_text())
    if value.get("schema_version") != 1 or value.get("framework_version") != framework["version"]:
        raise ValueError("Experiment catalog and competency framework versions do not match")
    ids = [module["id"] for module in value["competencies"]]
    domains = {entry["id"] for entry in framework["domains"]}
    lenses = {entry["id"] for entry in framework["task_lenses"]}
    if len(ids) != len(set(ids)) or any(not IDENTIFIER.fullmatch(key) for key in ids):
        raise ValueError("Experiment competency IDs must be unique safe identifiers")
    for module in value["competencies"]:
        if not set(module["domains"]) <= domains or not set(module["task_lenses"]) <= lenses:
            raise ValueError("Experiment competency references an unknown framework domain or task lens")
    return value


def default_config() -> dict:
    """Return a validated, independent copy of the fictional baseline configuration."""
    return validate_config(json.loads(DEFAULT_CONFIG.read_text()))


def _actor(value: Any, index: int, definitions: dict) -> dict:
    actor = _object(value, ACTOR_FIELDS, f"team[{index}]")
    actor["id"] = _identifier(actor["id"], "actor ID")
    if actor["id"] in RESERVED_ACTORS:
        raise ValueError("Actor ID is reserved for journal infrastructure")
    for field in ("name", "role"):
        actor[field] = _text(actor[field], "actor " + field, 120)
    ids = [item["id"] for item in definitions["competencies"]]
    actor["competencies"] = _selection(actor["competencies"], ids, "actor competencies")
    actor["stages"] = _selection(actor["stages"], STAGES, "actor stages")
    options = definitions["behavior_options"]
    behavior = _object(actor["behavior"], set(options), "actor behavior")
    for key in options:
        behavior[key] = _choice(behavior[key], options[key], "behavior " + key)
    actor["authority"] = _choice(actor["authority"], definitions["authority_options"], "actor authority")
    if type(actor["available"]) is not bool:
        raise ValueError("Actor available must be true or false")
    return actor


def _team(config: dict, definitions: dict) -> None:
    team = config["team"]
    if not isinstance(team, list) or not 1 <= len(team) <= 20:
        raise ValueError("Team must contain between 1 and 20 actors")
    config["team"] = [_actor(actor, index, definitions) for index, actor in enumerate(team)]
    ids = [actor["id"] for actor in config["team"]]
    if len(ids) != len(set(ids)):
        raise ValueError("Actor IDs must be unique")
    integration = _object(config["integration"], {"mode", "coordinator"}, "integration")
    _choice(integration["mode"], definitions["integration_instructions"], "integration mode")
    coordinator = _choice(integration["coordinator"], ids, "integration coordinator")
    if not next(actor for actor in team if actor["id"] == coordinator)["available"]:
        raise ValueError("The coordinator must be available")


def _environment(config: dict, definitions: dict) -> None:
    env = _object(config["environment"], {"time_pressure", "resources", "constraints"}, "environment")
    env["time_pressure"] = _choice(env["time_pressure"], definitions["time_pressure_options"], "time pressure")
    env["resources"] = _text(env["resources"], "environment resources", 3000, empty=True)
    constraints = env["constraints"]
    if not isinstance(constraints, list) or len(constraints) > 20:
        raise ValueError("Environment constraints must be a list of at most 20 items")
    env["constraints"] = [_text(item, "environment constraint", 2000) for item in constraints]


def _challenges(config: dict) -> None:
    if not isinstance(config["challenges"], list) or len(config["challenges"]) > 20:
        raise ValueError("Challenges must be a list of at most 20 items")
    ids = []
    for item in config["challenges"]:
        _object(item, {"id", "stage", "description"}, "challenge")
        ids.append(_identifier(item["id"], "challenge ID"))
        _choice(item["stage"], STAGES, "challenge stage")
        item["description"] = _text(item["description"], "challenge description", 3000)
    if len(ids) != len(set(ids)):
        raise ValueError("Challenge IDs must be unique")


def _schedule(config: dict) -> dict[str, list[str]]:
    return {stage: [actor["id"] for actor in config["team"] if actor["available"] and stage in actor["stages"]] for stage in STAGES}


def _planned_calls(config: dict) -> int:
    stages = STAGES[:STAGES.index(config["execution"]["through"]) + 1]
    schedule = _schedule(config)
    return sum(len(schedule[stage]) + 1 for stage in stages)


def _execution(config: dict) -> None:
    fields = {"provider", "model", "through", "repetitions", "max_calls", "max_output_chars"}
    execution = _object(config["execution"], fields, "execution")
    execution["provider"] = _choice(execution["provider"], ("dry-run", "codex"), "provider")
    execution["model"] = _text(execution["model"], "model", 200, empty=True)
    if execution["provider"] == "codex" and not execution["model"]:
        raise ValueError("Live experiments require an explicit model identifier")
    _choice(execution["through"], STAGES, "last stage")
    _integer(execution["repetitions"], "repetitions", 1, 20)
    _integer(execution["max_calls"], "max_calls", 1, 200)
    _integer(execution["max_output_chars"], "max_output_chars", 1000, 100000)
    if execution["max_calls"] < _planned_calls(config):
        raise ValueError("max_calls is smaller than the configured fixed schedule")


def validate_config(config: dict) -> dict:
    """Reject ambiguous inputs and return a normalized deep copy of a complete configuration."""
    value = copy.deepcopy(_object(config, CONFIG_FIELDS, "experiment configuration"))
    if type(value["schema_version"]) is not int or value["schema_version"] != 1:
        raise ValueError("Unsupported experiment schema_version")
    value["id"] = _identifier(value["id"], "experiment ID")
    value["name"] = _text(value["name"], "experiment name", 200)
    seed = _object(value["seed"], SEED_FIELDS, "seed")
    for field in SEED_FIELDS:
        seed[field] = _text(seed[field], "seed " + field)
    definitions = catalog()
    modules = [item["id"] for item in definitions["competencies"]]
    value["omit_competencies"] = _selection(value["omit_competencies"], modules, "omitted competencies")
    _team(value, definitions)
    _environment(value, definitions)
    _challenges(value)
    _execution(value)
    return value


def _profile(actor: dict, modules: dict, omitted: set[str], definitions: dict) -> dict:
    selected = [modules[key] for key in actor["competencies"] if key not in omitted]
    behavior = [definitions["behavior_options"][key][value] for key, value in actor["behavior"].items()]
    return {
        "name": actor["name"], "actor_id": actor["id"], "functional_role": actor["role"],
        "category": "experiment-contributor", "abstract": False, "lineage": [],
        "competency_ids": [module["id"] for module in selected],
        "competency": " ".join(module["description"] for module in selected) or "No explicit competency module is assigned for this contribution.",
        "duties": [instruction for module in selected for instruction in module["instructions"]],
        "focus_lenses": list(dict.fromkeys(lens for module in selected for lens in module["task_lenses"])),
        "proficiency_targets": {}, "demonstrated_proficiency": "unverified; instruction assignment is not performance evidence",
        "behavior": copy.deepcopy(actor["behavior"]), "behavior_instructions": behavior,
        "authority": actor["authority"], "authority_instruction": definitions["authority_options"][actor["authority"]],
    }


def _coverage(config: dict, modules: dict) -> dict:
    through = STAGES.index(config["execution"]["through"])
    active_stages = set(STAGES[:through + 1])
    coordinator = config["integration"]["coordinator"]
    coverage = {}
    for key in modules:
        assigned = [actor for actor in config["team"] if key in actor["competencies"]]
        omitted = key in config["omit_competencies"]
        available = [] if omitted else [actor for actor in assigned if actor["available"]]
        scheduled = [actor["id"] for actor in available if actor["id"] == coordinator or active_stages.intersection(actor["stages"])]
        coverage[key] = {"assigned_to": [actor["id"] for actor in assigned], "available_to": [actor["id"] for actor in available], "scheduled_actors": scheduled, "omitted": omitted}
    return coverage


def _warnings(config: dict, coverage: dict) -> list[str]:
    messages = ["Withdrawing explicit instructions does not remove model knowledge; observed contributions require review."]
    messages.append("Free-text case, actor, and environment descriptions may cue a competency; omission controls selected instruction modules only.")
    if config["execution"]["provider"] == "dry-run":
        messages.append("Dry-run output verifies the pipeline only and cannot establish competency-ablation effects.")
    for key, item in coverage.items():
        if item["omitted"]:
            messages.append(f"{key}: explicit support is omitted from every resolved actor, including the coordinator.")
        elif not item["scheduled_actors"]:
            messages.append(f"{key}: no available assigned actor has a contribution opportunity in the selected stages.")
    through = STAGES.index(config["execution"]["through"])
    if any(STAGES.index(item["stage"]) > through for item in config["challenges"]):
        messages.append("Some fixed challenges occur after the selected last stage and will not be presented in this run.")
    messages.append("The accepted-response character limit does not enforce token usage or a spending cap.")
    return messages


def _role_contract(config: dict, definitions: dict, modules: dict) -> dict:
    omitted = set(config["omit_competencies"])
    roles = {actor["id"]: _profile(actor, modules, omitted, definitions) for actor in config["team"] if actor["available"]}
    coordinator = copy.deepcopy(roles[config["integration"]["coordinator"]])
    coordinator["category"] = "experiment-coordinator"
    coordinator["integration_instruction"] = definitions["integration_instructions"][config["integration"]["mode"]]
    roles["orchestrator"] = coordinator
    framework = json.loads(FRAMEWORK.read_text())
    selected_lenses = {key for profile in roles.values() for key in profile["focus_lenses"]}
    selected_domains = {domain for profile in roles.values() for key in profile["competency_ids"] for domain in modules[key]["domains"]}
    # Metadata is filtered too: omitted instructions must not return through legacy framework prompts.
    scoped_framework = {"version": framework["version"], "domains": [item for item in framework["domains"] if item["id"] in selected_domains], "task_lenses": [item for item in framework["task_lenses"] if item["id"] in selected_lenses]}
    return {
        "registry_version": "experiment-" + definitions["version"], "framework_version": framework["version"],
        "registry_hash": _hash(definitions), "framework_hash": _hash(framework),
        "framework": scoped_framework, "roles": roles,
        "claim": "Explicit assigned simulation instructions; no inherited duties or demonstrated human proficiency.",
    }


def resolve_config(config: dict) -> dict:
    """Compile assigned instructions, coverage, and the fixed schedule without legacy role inheritance."""
    value = validate_config(config)
    definitions = catalog()
    modules = {item["id"]: item for item in definitions["competencies"]}
    coverage = _coverage(value, modules)
    return {
        "config": value, "config_hash": _hash(value), "catalog_hash": _hash(definitions),
        "role_contract": _role_contract(value, definitions, modules), "coverage": coverage,
        "warnings": _warnings(value, coverage), "schedule": _schedule(value),
        "planned_calls": _planned_calls(value),
    }
