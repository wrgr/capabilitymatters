"""Apply versioned fictional task strata without altering experimental team or model settings."""
from __future__ import annotations

import copy
import hashlib
import json
import math
from pathlib import Path
from typing import Any

from experiment_config import IDENTIFIER, default_config, upgrade_config, validate_config

CATALOG_PATH = Path(__file__).resolve().parents[2] / "public/agentic-le/experiments/scenario-catalog.json"
AXES = {"human_flourishing", "system_performance", "learning"}
SCENARIO_FIELDS = {"id", "version", "name", "description", "seed", "environment", "challenges",
                   "legacy_outcome_conditions", "learner_target", "affected_person_constraints",
                   "system_task", "axis_targets", "axis_definitions", "evidence_anchors", "population_profiles"}
PROFILE_FIELDS = {"id", "label", "weight", "axis_shift", "axis_sd", "rationale"}


def _hash(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(encoded.encode()).hexdigest()


def _object(value: Any, fields: set[str], label: str) -> dict:
    if not isinstance(value, dict) or set(value) != fields:
        raise ValueError(f"{label} must contain exactly: {', '.join(sorted(fields))}")
    return value


def _text(value: Any, label: str) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 6000:
        raise ValueError(label + " must be nonempty text of at most 6000 characters")
    return value


def _identifier(value: Any, label: str) -> str:
    if not isinstance(value, str) or not IDENTIFIER.fullmatch(value):
        raise ValueError(label + " must be a safe lowercase identifier")
    return value


def _number(value: Any, low: float, high: float, label: str) -> float:
    if type(value) not in (int, float) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{label} must be a finite number from {low} to {high}")
    return value


def _texts(value: Any, label: str) -> list[str]:
    if not isinstance(value, list) or not 1 <= len(value) <= 20:
        raise ValueError(label + " must be a nonempty list of at most 20 text items")
    return [_text(item, label) for item in value]


def _axis_numbers(value: Any, low: float, high: float, label: str) -> None:
    for key, item in _object(value, AXES, label).items():
        _number(item, low, high, label + "." + key)


def _profiles(value: Any) -> None:
    if not isinstance(value, list) or not 1 <= len(value) <= 8:
        raise ValueError("population_profiles must contain 1 to 8 profiles")
    ids = []
    for item in value:
        _object(item, PROFILE_FIELDS, "population profile")
        ids.append(_identifier(item["id"], "profile id"))
        for field in ("label", "rationale"):
            _text(item[field], "profile " + field)
        _number(item["weight"], 0, 1, "profile weight")
        _axis_numbers(item["axis_shift"], -50, 50, "profile axis_shift")
        _axis_numbers(item["axis_sd"], 0, 30, "profile axis_sd")
    if len(ids) != len(set(ids)):
        raise ValueError("Population profile ids must be unique within a scenario")
    if not math.isclose(sum(item["weight"] for item in value), 1, rel_tol=0, abs_tol=1e-9):
        raise ValueError("Population profile weights must sum to one")


def _replace_case(config: dict, scenario: dict) -> dict:
    result = copy.deepcopy(config)
    result["id"] = scenario["id"] + "-study"
    result["name"] = scenario["name"]
    for field in ("seed", "environment", "challenges"):
        result[field] = copy.deepcopy(scenario[field])
    result["outcomes"]["conditions"] = copy.deepcopy(scenario["legacy_outcome_conditions"])
    return validate_config(result)


def _scenario(value: Any, baseline: dict) -> dict:
    _object(value, SCENARIO_FIELDS, "scenario")
    _identifier(value["id"], "scenario id")
    for field in ("version", "name", "description", "learner_target", "system_task"):
        _text(value[field], "scenario " + field)
    _texts(value["affected_person_constraints"], "affected_person_constraints")
    _axis_numbers(value["axis_targets"], 0, 100, "axis_targets")
    for key, item in _object(value["axis_definitions"], AXES, "axis_definitions").items():
        _text(item, "axis definition " + key)
    for key, item in _object(value["evidence_anchors"], AXES, "evidence_anchors").items():
        _texts(item, "evidence anchors " + key)
    _profiles(value["population_profiles"])
    _replace_case(baseline, value)
    return value


def scenario_catalog() -> dict:
    """Return a fresh, validated catalog of fixed cases and explicit sensitivity assumptions."""
    value = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    _object(value, {"schema_version", "version", "description", "interpretation_limits", "scenarios"}, "scenario catalog")
    if type(value["schema_version"]) is not int or value["schema_version"] != 1:
        raise ValueError("Unsupported scenario catalog schema_version")
    _text(value["version"], "catalog version")
    _text(value["description"], "catalog description")
    _texts(value["interpretation_limits"], "interpretation_limits")
    if not isinstance(value["scenarios"], list) or not 1 <= len(value["scenarios"]) <= 20:
        raise ValueError("Scenario catalog must contain 1 to 20 scenarios")
    baseline = upgrade_config(default_config())
    ids = [_scenario(item, baseline)["id"] for item in value["scenarios"]]
    if len(ids) != len(set(ids)):
        raise ValueError("Scenario ids must be unique")
    return value


def get_scenario(scenario_id: str) -> dict:
    """Return an independent scenario by safe identifier or reject an unknown case."""
    _identifier(scenario_id, "scenario id")
    for scenario in scenario_catalog()["scenarios"]:
        if scenario["id"] == scenario_id:
            return scenario
    raise ValueError("Unknown scenario: " + scenario_id)


def apply_scenario(config: dict, scenario_id: str) -> dict:
    """Replace case inputs while preserving team, schedule, provider, and outcome coefficients."""
    _identifier(scenario_id, "scenario id")
    catalog = scenario_catalog()
    scenario = next((item for item in catalog["scenarios"] if item["id"] == scenario_id), None)
    if scenario is None:
        raise ValueError("Unknown scenario: " + scenario_id)
    result = _replace_case(upgrade_config(config), scenario)
    reference = {"schema_version": 1, "scenario_id": scenario["id"], "scenario_version": scenario["version"],
                 "catalog_version": catalog["version"], "scenario_hash": _hash(scenario)}
    return {"config": result, "scenario_reference": reference}
