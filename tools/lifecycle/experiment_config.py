"""Resolve bounded experiment configurations into auditable, explicitly assigned simulation instructions."""
from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from experiment_assignment import STAGES, compile_assignment
from experiment_flower import FRAMEWORK_ID, is_flower_config

REPO = Path(__file__).resolve().parents[2]
CATALOG = REPO / "src/data/lifecycle/experiment-catalog.json"
FLOWER_CATALOG = REPO / "src/data/lifecycle/flower-catalog.json"
DEFAULT_CONFIG = REPO / "src/data/lifecycle/experiments/flower-baseline.json"
LEGACY_CONFIG = REPO / "src/data/lifecycle/experiments/baseline.json"
FRAMEWORK = REPO / "src/data/lifecycle/competencies.json"
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


def _catalog_sources() -> dict:
    """Combine separate source catalogs without inventing mappings between their domains."""
    value = json.loads(CATALOG.read_text())
    flower = json.loads(FLOWER_CATALOG.read_text())
    for key in ("description", "version", "status", "flower", "framework_status"):
        value[key] = flower[key]
    value["competencies"] = [*flower["competencies"], *value["competencies"]]
    value["personas"] = [*flower["personas"], *value["personas"]]
    return value


def catalog() -> dict:
    """Return a fresh copy of the versioned instruction catalog."""
    value = _catalog_sources()
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
    persona_ids = []
    for persona in value["personas"]:
        _object(persona, {"id", "version", "name", "description", "competencies", "behavior", "recommended_stages"}, "persona preset")
        persona_ids.append(_identifier(persona["id"], "persona ID"))
        _text(persona["version"], "persona version", 40)
        _selection(persona["competencies"], ids, "persona competencies")
        _selection(persona["recommended_stages"], STAGES, "recommended stages")
        _object(persona["behavior"], set(value["behavior_options"]), "persona behavior")
        for key, options in value["behavior_options"].items():
            _choice(persona["behavior"][key], options, "persona behavior " + key)
    if len(persona_ids) != len(set(persona_ids)):
        raise ValueError("Persona preset IDs must be unique")
    return value


def default_config() -> dict:
    """Return the current eight-domain flower baseline with forty scheduled calls."""
    return validate_config(json.loads(DEFAULT_CONFIG.read_text()))


def legacy_config() -> dict:
    """Return the retained twenty-one-call baseline without relabeling its historical modules."""
    return validate_config(json.loads(LEGACY_CONFIG.read_text()))


def _actor(value: Any, label: str, definitions: dict, version: int) -> dict:
    fields = ACTOR_FIELDS | ({"persona_ref"} if version == 2 else set())
    actor = _object(value, fields, label)
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
    if version == 2 and actor["persona_ref"] is not None:
        reference = _object(actor["persona_ref"], {"id", "version"}, "persona_ref")
        presets = {item["id"]: item for item in definitions["personas"]}
        _choice(reference["id"], presets, "persona preset")
        if reference["version"] != presets[reference["id"]]["version"]:
            raise ValueError("Persona version does not match its catalog preset")
    return actor


def _team(config: dict, definitions: dict) -> None:
    team = config["team"]
    if not isinstance(team, list) or not 1 <= len(team) <= 20:
        raise ValueError("Team must contain between 1 and 20 actors")
    config["team"] = [_actor(actor, f"team[{index}]", definitions, config["schema_version"]) for index, actor in enumerate(team)]
    ids = [actor["id"] for actor in config["team"]]
    if len(ids) != len(set(ids)):
        raise ValueError("Actor IDs must be unique")
    integration = _object(config["integration"], {"mode", "coordinator"}, "integration")
    _choice(integration["mode"], definitions["integration_instructions"], "integration mode")
    coordinator = _choice(integration["coordinator"], ids, "integration coordinator")
    if not next(actor for actor in team if actor["id"] == coordinator)["available"]:
        raise ValueError("The coordinator must be available")


def _participation(config: dict, definitions: dict) -> None:
    value = _object(config["participation"], {"mode", "individual", "allocation"}, "participation")
    _choice(value["mode"], ("team", "individual"), "participation mode")
    _choice(value["allocation"], ("matched_slots",), "participation allocation")
    value["individual"] = _actor(value["individual"], "individual", definitions, 2)
    if value["individual"]["id"] in {actor["id"] for actor in config["team"]}:
        raise ValueError("Individual ID must be distinct from reference-team actor IDs")
    if value["mode"] == "individual" and not value["individual"]["available"]:
        raise ValueError("The selected individual must be available")


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
        fields = {"id", "stage", "description"}
        if config["schema_version"] == 2 and isinstance(item, dict) and "simulation_effects" in item:
            fields.add("simulation_effects")
        _object(item, fields, "challenge")
        ids.append(_identifier(item["id"], "challenge ID"))
        _choice(item["stage"], STAGES, "challenge stage")
        item["description"] = _text(item["description"], "challenge description", 3000)
        if "simulation_effects" in item:
            from experiment_outcomes import validate_effects

            item["simulation_effects"] = validate_effects(item["simulation_effects"])
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
    if not isinstance(config, dict) or type(config.get("schema_version")) is not int or config["schema_version"] not in (1, 2):
        raise ValueError("Unsupported experiment schema_version")
    fields = CONFIG_FIELDS | ({"participation", "outcomes"} if config["schema_version"] == 2 else set())
    if config["schema_version"] == 2 and "framework" in config:
        fields.add("framework")
    value = copy.deepcopy(_object(config, fields, "experiment configuration"))
    value["id"] = _identifier(value["id"], "experiment ID")
    value["name"] = _text(value["name"], "experiment name", 200)
    seed = _object(value["seed"], SEED_FIELDS, "seed")
    for field in SEED_FIELDS:
        seed[field] = _text(seed[field], "seed " + field)
    definitions = catalog()
    if "framework" in value:
        _choice(value["framework"], (FRAMEWORK_ID,), "framework identity")
    modules = [item["id"] for item in definitions["competencies"]]
    value["omit_competencies"] = _selection(value["omit_competencies"], modules, "omitted competencies")
    _team(value, definitions)
    if value["schema_version"] == 2:
        from experiment_outcomes import validate_outcomes

        _participation(value, definitions)
        value["outcomes"] = validate_outcomes(value["outcomes"])
    _environment(value, definitions)
    _challenges(value)
    _execution(value)
    if value["schema_version"] == 2 and is_flower_config(value, definitions):
        value["framework"] = FRAMEWORK_ID
    return value


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


def _default_individual(definitions: dict) -> dict:
    persona = next(item for item in definitions["personas"] if item["id"] == "generalist")
    return {"id": "individual", "name": "Individual contributor", "role": "Project contributor",
            "competencies": list(persona["competencies"]), "stages": list(STAGES),
            "behavior": copy.deepcopy(persona["behavior"]), "authority": "decision", "available": True,
            "persona_ref": {"id": persona["id"], "version": persona["version"]}}


def upgrade_config(config: dict) -> dict:
    """Explicitly upgrade a legacy configuration without changing version-one validation or hashes."""
    value = validate_config(config)
    if value["schema_version"] == 2:
        return value
    from experiment_outcomes import default_outcomes

    value["schema_version"] = 2
    for actor in value["team"]:
        actor["persona_ref"] = None
    value["participation"] = {"mode": "team", "individual": _default_individual(catalog()), "allocation": "matched_slots"}
    value["outcomes"] = default_outcomes()
    return validate_config(value)


def apply_persona(config: dict, actor_id: str, persona_id: str) -> dict:
    """Materialize a named preset while preserving the actor's identity and scheduled opportunities."""
    value = upgrade_config(config)
    personas = {item["id"]: item for item in catalog()["personas"]}
    _choice(persona_id, personas, "persona preset")
    individual = value["participation"]["individual"]
    actors = [individual] if actor_id == individual["id"] else [actor for actor in value["team"] if actor["id"] == actor_id]
    if not actors:
        raise ValueError("Persona target must be an existing team member or the individual")
    persona = personas[persona_id]
    actors[0].update(competencies=list(persona["competencies"]), behavior=copy.deepcopy(persona["behavior"]),
                     persona_ref={"id": persona["id"], "version": persona["version"]})
    return validate_config(value)


def apply_study_preset(config: dict, mode: str, competency: str = "measurement", persona_id: str | None = None) -> dict:
    """Apply a study arrangement while retaining the case, conditions, budget, and outcome model."""
    value = upgrade_config(config)
    flower = is_flower_config(value, catalog())
    persona_id = persona_id or ("flower-generalist" if flower else "generalist")
    _choice(mode, ("default", "ablation", "individual"), "study mode")
    if mode == "default":
        baseline = default_config() if flower else legacy_config()
        for key in ("team", "integration", "omit_competencies", "participation"):
            value[key] = copy.deepcopy(baseline[key])
    elif mode == "ablation":
        _choice(competency, [item["id"] for item in catalog()["competencies"]], "ablation competency")
        value["participation"]["mode"] = "team"
        if competency not in value["omit_competencies"]:
            value["omit_competencies"].append(competency)
    else:
        value["participation"]["mode"] = "individual"
        value = apply_persona(value, value["participation"]["individual"]["id"], persona_id)
    return validate_config(value)


def resolve_config(config: dict) -> dict:
    """Compile assigned instructions, coverage, and the fixed schedule without legacy role inheritance."""
    value = validate_config(config)
    definitions = catalog()
    if not is_flower_config(value, definitions):
        definitions = json.loads(CATALOG.read_text())
    assignment = compile_assignment(value, definitions, json.loads(FRAMEWORK.read_text()))
    warnings = _warnings(value, assignment["coverage"])
    signature = assignment["comparison_signature"]
    if signature["individual_filtered_competencies"]:
        warnings.append("The selected individual filters source-slot competency instructions while preserving contribution opportunities: " + ", ".join(signature["individual_filtered_competencies"]))
    if signature["individual_behavior_changed_slots"]:
        warnings.append("The selected individual's behavior differs from source actors in some slots; this comparison changes behavior as well as actor allocation.")
    from experiment_contract import standardize_contract

    contract = standardize_contract(assignment["role_contract"], value, assignment["execution_plan"])
    signature["agent_contract_hash"] = contract["agent_contract_hash"]
    signature["outcome_model_hash"] = None
    if value["schema_version"] == 2:
        from experiment_outcomes import outcome_catalog

        contract["outcome_model_hash"] = _hash(outcome_catalog())
        signature["outcome_model_hash"] = contract["outcome_model_hash"]
    return {
        "config": value, "config_hash": _hash(value), "catalog_hash": _hash(definitions),
        **assignment, **contract, "warnings": warnings,
    }
