"""Validate editable dynamic Flower configurations without modifying historical experiments."""
from __future__ import annotations

import copy
import hashlib
import json
import math
import re
from pathlib import Path
from typing import Any

VERSION = "dynamic-flower-1"
PHASES = ("design_develop", "deploy_test")
KINDS = ("specialist", "generalist", "facilitator", "evaluator")
CATALOG = Path(__file__).resolve().parents[2] / "src/data/lifecycle/dynamic-flower.json"
ACTIONS = {"scenario", "fill", "click", "press"}
CHECKS = {"text_contains", "nonempty", "editable", "value_equals"}
KEYS = {"Enter", "Space", "Tab", "Escape", "ArrowDown", "ArrowUp"}


def canonical(value: Any) -> str:
    """Serialize portable JSON deterministically with integer-only numeric wire values."""
    return json.dumps(_portable_numbers(value), ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)


def _portable_numbers(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _portable_numbers(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_portable_numbers(item) for item in value]
    if type(value) is float:
        require(math.isfinite(value) and value.is_integer(), "Dynamic JSON numeric values must be integers")
        value = int(value)
    if type(value) is int:
        require(abs(value) <= 9007199254740991, "Dynamic JSON integer exceeds portable range")
    return value


def digest(value: Any) -> str:
    """Hash canonical JSON rather than a presentation-specific file encoding."""
    return hashlib.sha256(canonical(value).encode("utf-8")).hexdigest()


def text_hash(value: str) -> str:
    """Hash the exact UTF-8 bytes of a prompt or artifact."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def require(condition: bool, message: str) -> None:
    """Reject a malformed or semantically invalid contract explicitly."""
    if not condition:
        raise ValueError(message)


def text(value: Any, label: str, limit: int = 100000) -> str:
    """Validate nonempty bounded text without changing its contents."""
    require(isinstance(value, str) and bool(value.strip()) and len(value) <= limit, f"Invalid {label}")
    return value


def identifier(value: Any, label: str = "id") -> str:
    """Require an identifier safe for references and local artifact names."""
    require(isinstance(value, str) and re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,100}", value) is not None,
            f"Invalid {label}")
    return value


def indexed(items: Any, label: str) -> dict[str, dict]:
    """Index an object array while refusing duplicate identifiers."""
    require(isinstance(items, list), f"{label} must be an array")
    result = {}
    for item in items:
        require(isinstance(item, dict), f"Invalid object in {label}")
        key = identifier(item.get("id"), label)
        require(key not in result, f"Duplicate {label} id {key}")
        result[key] = item
    return result


def string_list(value: Any, label: str) -> list[str]:
    """Validate an array of nonempty strings, preserving order."""
    require(isinstance(value, list), f"{label} must be an array")
    for entry in value:
        text(entry, label)
    return value


def validate_agent(agent: dict, domains: set[str]) -> None:
    """Enforce separate expertise and procedural capabilities for each actor."""
    text(agent.get("label"), "agent label")
    require(agent.get("kind") in KINDS, "Unknown agent kind")
    assigned = string_list(agent.get("domains"), "agent domains")
    require(len(set(assigned)) == len(assigned) and set(assigned) <= domains, "Unknown or repeated agent domain")
    text(agent.get("brief"), "agent brief")
    string_list(agent.get("limits"), "agent limits")
    capabilities = string_list(agent.get("capabilities", []), "agent capabilities")
    allowed = {"specialist": {"implement"}, "generalist": {"implement"},
               "facilitator": {"facilitate"}, "evaluator": {"evaluate"}}
    require(set(capabilities) <= allowed[agent["kind"]], "Capability exceeds agent role")
    if agent["kind"] != "specialist":
        require(not assigned, "Only specialists receive specialist domains")


def validate_scenario(scenario: dict, case_id: str) -> None:
    """Validate declarative browser tests without accepting executable test code."""
    require(scenario.get("case_id") == case_id, "Scenario belongs to another case")
    require(scenario.get("difficulty") in {"easy", "medium", "hard"}, "Unknown scenario difficulty")
    text(scenario.get("title"), "scenario title")
    text(scenario.get("brief"), "scenario brief")
    conditions = scenario.get("conditions", {})
    require(isinstance(conditions, dict), "Scenario conditions must be an object")
    if "offline" in conditions:
        require(type(conditions["offline"]) is bool, "Scenario offline condition must be boolean")
    if "viewport" in conditions:
        viewport = conditions["viewport"]
        require(isinstance(viewport, dict) and all(type(viewport.get(key)) is int and 240 <= viewport[key] <= 3840
                for key in ("width", "height")), "Scenario viewport dimensions must be integers from 240 to 3840")
    actions = indexed(scenario.get("actions"), "scenario actions")
    checks = indexed(scenario.get("checks"), "scenario checks")
    require(bool(checks), "A test scenario needs observable checks")
    for action in actions.values():
        require(action.get("type") in ACTIONS, "Unsupported scenario action")
        _selector(action.get("selector"))
        if action["type"] == "fill":
            require(isinstance(action.get("value"), str), "Action needs a literal value")
        if action["type"] == "press":
            require(action.get("key") in KEYS, "Unsupported key action")
        if action["type"] == "scenario":
            _selector(action.get("trigger"))
            require(isinstance(action.get("value"), dict), "Scenario action needs a data object")
    for check in checks.values():
        require(check.get("type") in CHECKS, "Unsupported scenario check")
        _selector(check.get("selector"))
        require(check.get("after_action") in actions, "Check must name its exact preceding action")
        if check["type"] in {"text_contains", "value_equals"}:
            require(isinstance(check.get("expected"), str), "Check needs a declared text expectation")


def _selector(value: Any) -> None:
    require(isinstance(value, str) and re.fullmatch(r"#[A-Za-z][A-Za-z0-9_-]{0,79}", value) is not None,
            "Scenario selectors must be simple declared control IDs")


def validate_catalog(catalog: dict) -> dict:
    """Check catalog references and evaluation dimensions before resolving a run."""
    require(catalog.get("schema_version") == VERSION, "Unsupported dynamic catalog")
    domains = indexed(catalog.get("domains"), "domains")
    agents = indexed(catalog.get("agents"), "agents")
    cases = indexed(catalog.get("cases"), "cases")
    conditions = indexed(catalog.get("conditions"), "conditions")
    for agent in agents.values():
        validate_agent(agent, set(domains))
    for condition in conditions.values():
        refs = condition.get("agent_ids", []) + [condition.get("facilitator_id"), condition.get("evaluator_id")]
        require(all(ref in agents for ref in refs), "Condition references an unknown actor")
    for scenario in indexed(catalog.get("scenarios"), "scenarios").values():
        require(scenario.get("case_id") in cases, "Unknown scenario case")
        validate_scenario(scenario, scenario["case_id"])
    rubric = catalog.get("rubric", {})
    for scope in ("process", "result"):
        require(bool(indexed(rubric.get(scope), f"{scope} rubric")), "Empty evaluation rubric")
    require(type(rubric.get("score_min")) is int and type(rubric.get("score_max")) is int
            and rubric["score_min"] < rubric["score_max"], "Invalid score bounds")
    return catalog


def validate_config(config: dict, catalog: dict) -> dict:
    """Validate the exact editable run inputs, including copied test scenarios."""
    validate_catalog(catalog)
    require(config.get("schema_version") == VERSION, "Unsupported dynamic configuration")
    identifier(config.get("id"), "configuration id")
    require(config.get("case_id") in indexed(catalog["cases"], "cases"), "Unknown case")
    require(config.get("condition_id") in indexed(catalog["conditions"], "conditions"), "Unknown condition")
    case = config.get("case", {})
    text(case.get("title"), "case title")
    text(case.get("brief"), "case brief")
    string_list(case.get("constraints"), "case constraints")
    agents = indexed(config.get("agents"), "run agents")
    for agent in agents.values():
        validate_agent(agent, set(indexed(catalog["domains"], "domains")))
    for key, kind in (("facilitator_id", "facilitator"), ("evaluator_id", "evaluator")):
        require(config.get(key) in agents and agents[config[key]]["kind"] == kind, f"Invalid {key}")
    require(any(a["kind"] in {"specialist", "generalist"} for a in agents.values()), "No authoring actors")
    require(any("implement" in a.get("capabilities", []) for a in agents.values()), "No implementation authority")
    _validate_budgets_updates(config)
    scenarios = indexed(config.get("scenarios"), "run scenarios")
    refs = string_list(config.get("scenario_ids"), "scenario_ids")
    require(bool(refs) and len(refs) == len(set(refs)) and set(refs) == set(scenarios), "Scenario copies must match scenario_ids exactly")
    for scenario in scenarios.values():
        validate_scenario(scenario, config["case_id"])
    return config


def _validate_budgets_updates(config: dict) -> None:
    budgets = config.get("budgets", {})
    for phase in PHASES:
        require(type(budgets.get(phase)) is int and 1 <= budgets[phase] <= 200, "Phase budget must be 1–200 calls")
    require(type(budgets.get("max_context_chars")) is int and 2000 <= budgets["max_context_chars"] <= 2000000,
            "Context budget must be 2000–2000000 characters")
    for update in indexed(config.get("updates", []), "updates").values():
        require(update.get("phase") in PHASES, "Unknown update phase")
        require(type(update.get("after_turn")) is int and 0 <= update["after_turn"] < budgets[update["phase"]],
                "Update must occur before the phase call limit")
        text(update.get("message"), "user update")


def make_config(catalog: dict, case_id: str, condition_id: str) -> dict:
    """Resolve one catalog condition into a standalone, editable configuration."""
    validate_catalog(catalog)
    case = indexed(catalog["cases"], "cases")[case_id]
    condition = indexed(catalog["conditions"], "conditions")[condition_id]
    agents = indexed(catalog["agents"], "agents")
    refs = list(dict.fromkeys(condition["agent_ids"] + [condition["facilitator_id"], condition["evaluator_id"]]))
    roster = [copy.deepcopy(agents[key]) for key in refs]
    for actor in roster:
        if actor["id"] in condition.get("domain_overrides", {}):
            actor["domains"] = copy.deepcopy(condition["domain_overrides"][actor["id"]])
        if actor["id"] in condition.get("brief_overrides", {}):
            actor["brief"] = condition["brief_overrides"][actor["id"]]
        if actor["kind"] == "specialist" and not actor["domains"]:
            actor["brief"] = "No specialist expertise is assigned in this condition. Ask an assigned colleague for substantive expertise; retain uncertainty and do not issue specialist signoff."
    scenarios = [copy.deepcopy(s) for s in catalog["scenarios"] if s["case_id"] == case_id]
    config = {"schema_version": VERSION, "id": f"{case_id}-{condition_id}-v1", "case_id": case_id,
              "condition_id": condition_id, "case": copy.deepcopy(case), "agents": roster,
              "facilitator_id": condition["facilitator_id"], "evaluator_id": condition["evaluator_id"],
              "scenario_ids": [s["id"] for s in scenarios], "scenarios": scenarios,
              "budgets": {"design_develop": 24, "deploy_test": 12, "max_context_chars": 180000}, "updates": []}
    return validate_config(config, catalog)


def load_catalog(path: Path = CATALOG) -> dict:
    """Read the current catalog for creating a new, separately pinned run."""
    return validate_catalog(json.loads(path.read_text(encoding="utf-8")))
