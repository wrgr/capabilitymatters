"""Define evidence-anchored scorecard contracts so simulation assumptions remain explicit."""
from __future__ import annotations

import copy
import hashlib
import json
import math
from decimal import Decimal
from typing import Any

AXES = ("human_flourishing", "system_performance", "learning")
CRITERIA = {
    "agency_dignity": ("human_flourishing", "Agency and dignity", "Inspect meaningful choice, respectful framing, freedom from coercion, and appropriate control of personal information."),
    "access_inclusion": ("human_flourishing", "Access and inclusion", "Inspect participation barriers and supported alternatives for the stated population and circumstances."),
    "burden_wellbeing": ("human_flourishing", "Burden and wellbeing", "Inspect effort, demands, support, and foreseeable burdens relative to the task's purpose and constraints."),
    "functional_correctness": ("system_performance", "Functional correctness", "Inspect whether the actual artifact implements required input-output behavior; distinguish executed checks from source inspection."),
    "reliability_recovery": ("system_performance", "Reliability and recovery", "Inspect correction, clearing, failure recovery, and behavior under the task's stated operating conditions."),
    "feasibility": ("system_performance", "Feasibility", "Inspect implementation and delivery requirements against available time, resources, and support; declarations alone do not verify them."),
    "alignment": ("learning", "Capability alignment", "Inspect whether the activity exercises the intended capability and makes success criteria relevant to the stated task."),
    "practice_feedback": ("learning", "Practice feedback and revision", "Inspect consequential practice choices, feedback contingent on those choices, and opportunities to revise; do not reward mere terminology."),
    "transfer_evidence": ("learning", "Learning evidence design", "Inspect what could establish independent capability or use on a changed task, and whether claims respect absent evidence; supported completion is not measured learning."),
}


def stable_hash(value: Any) -> str:
    """Hash canonical finite JSON for immutable provenance links."""
    raw = canonical_json(value)
    return hashlib.sha256(raw.encode()).hexdigest()


def canonical_json(value: Any) -> str:
    """Serialize finite bounded values with plain decimals to match browser JSON number encoding."""
    if value is None or type(value) in (str, bool):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if type(value) in (int, float):
        if not math.isfinite(value):
            raise ValueError("Hash input must be finite")
        rendered = format(Decimal(str(value)), "f")
        rendered = rendered.rstrip("0").rstrip(".") if "." in rendered else rendered
        return "0" if rendered in ("-0", "") else rendered
    if isinstance(value, list):
        return "[" + ",".join(canonical_json(item) for item in value) + "]"
    if isinstance(value, dict) and all(isinstance(key, str) for key in value):
        return "{" + ",".join(json.dumps(key, ensure_ascii=False) + ":" + canonical_json(value[key]) for key in sorted(value)) + "}"
    raise ValueError("Hash input must be JSON-compatible")


def exact_fields(value: Any, fields: set[str], label: str) -> dict:
    """Reject missing or unrecognized fields rather than silently using hidden inputs."""
    if not isinstance(value, dict) or set(value) != fields:
        raise ValueError(f"{label} requires exactly {', '.join(sorted(fields))}")
    return copy.deepcopy(value)


def number(value: Any, low: float, high: float, label: str, integer: bool = False) -> float | int:
    """Require bounded finite numeric values while rejecting booleans."""
    valid = type(value) is int if integer else type(value) in (int, float)
    if not valid or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f"{label} must be a finite {'integer' if integer else 'number'} in [{low}, {high}]")
    if type(value) is float and Decimal(str(value)).as_tuple().exponent < -6:
        raise ValueError(label + " permits at most six decimal places")
    return value


def text(value: Any, limit: int, label: str, empty: bool = False) -> str:
    """Require bounded text for inspectable records and safe import limits."""
    if not isinstance(value, str) or len(value) > limit or (not empty and not value.strip()):
        raise ValueError(f"{label} must be {'nonempty ' if not empty else ''}text of at most {limit} characters")
    return value


def axis_values(value: Any, low: float, high: float, label: str) -> dict:
    """Validate one explicitly named value for each of the three outcome axes."""
    result = exact_fields(value, set(AXES), label)
    for axis, item in result.items():
        number(item, low, high, label + "." + axis)
    return result


def rubric() -> dict:
    """Return the fixed rubric with separate task-level axes and no cross-axis total."""
    names = {"human_flourishing": "Human flourishing", "system_performance": "System performance", "learning": "Learning"}
    return {
        "id": "blind-evidence-rubric", "version": "1.0.0",
        "axes": {axis: {"label": names[axis], "criteria": [key for key, item in CRITERIA.items() if item[0] == axis]} for axis in AXES},
        "criteria": {key: {"axis": item[0], "label": item[1], "description": item[2]} for key, item in CRITERIA.items()},
        "anchors": {"0": "Clear contradiction, observed failure, or absent essential provision in the inspected scope.",
                    "1": "Major supported gap; relevant intent is largely unimplemented.",
                    "2": "Partially supported; consequential gaps or unverified requirements remain.",
                    "3": "Adequately supported by the cited artifact and checks within the inspected scope.",
                    "4": "Strong, coherent support across relevant evidence, with material limitations accurately stated."},
        "unknown": "Use null when evidence is insufficient to rate; missing evidence is not automatically zero.",
        "aggregation": "Equal criterion weights within each axis; no weighted total across axes.",
        "scope": "Task-level evidence indices. Human flourishing means support conditions here, not a whole-life flourishing measure. Learning is design/evidence quality, not an observed learning gain.",
    }


def default_settings() -> dict:
    """Return editable, uncalibrated simulation assumptions without treatment information."""
    floors = {key: (2 if key in ("agency_dignity", "access_inclusion", "burden_wellbeing", "functional_correctness", "alignment", "practice_feedback") else 0) for key in CRITERIA}
    return {"schema_version": 1, "seed": 2026, "draws": 1000, "cohort_size": 100,
            "meaningful_difference": 5, "thresholds": dict.fromkeys(AXES, 60),
            "criterion_floors": floors,
            "variability": {"team_sd": dict.fromkeys(AXES, 0), "scenario_sd": dict.fromkeys(AXES, 3),
                            "shared_correlation": 0.5, "person_sd_scale": 1, "profile_shift_scale": 1},
            "calibration": "uncalibrated_illustrative"}


def validate_settings(value: Any) -> dict:
    """Validate bounded simulation settings and make assumed variance distinct from estimates."""
    fields = {"schema_version", "seed", "draws", "cohort_size", "meaningful_difference", "thresholds", "criterion_floors", "variability", "calibration"}
    result = exact_fields(value, fields, "scorecard settings")
    if type(result["schema_version"]) is not int or result["schema_version"] != 1:
        raise ValueError("Unsupported scorecard settings version")
    number(result["seed"], 0, 2**32 - 1, "seed", True)
    number(result["draws"], 100, 5000, "draws", True)
    number(result["cohort_size"], 1, 1000, "cohort_size", True)
    if result["draws"] * result["cohort_size"] > 500000:
        raise ValueError("Use at most 500,000 conditional person draws per assessment")
    number(result["meaningful_difference"], 0, 100, "meaningful_difference")
    result["thresholds"] = axis_values(result["thresholds"], 0, 100, "thresholds")
    floors = exact_fields(result["criterion_floors"], set(CRITERIA), "criterion floors")
    for key, value in floors.items():
        number(value, 0, 4, "criterion floor " + key)
    result["criterion_floors"] = floors
    variation = exact_fields(result["variability"], {"team_sd", "scenario_sd", "shared_correlation", "person_sd_scale", "profile_shift_scale"}, "variability")
    for key in ("team_sd", "scenario_sd"):
        variation[key] = axis_values(variation[key], 0, 30, key)
    number(variation["shared_correlation"], 0, 1, "shared_correlation")
    number(variation["person_sd_scale"], 0, 3, "person_sd_scale")
    number(variation["profile_shift_scale"], 0, 2, "profile_shift_scale")
    result["variability"] = variation
    if result["calibration"] != "uncalibrated_illustrative":
        raise ValueError("This model has no validated calibration; use uncalibrated_illustrative")
    return result


def validate_population(profiles: Any) -> list[dict]:
    """Validate explicit hypothetical population mixtures used by the conditional sampler."""
    if not isinstance(profiles, list) or not 1 <= len(profiles) <= 8:
        raise ValueError("Provide one to eight hypothetical population profiles")
    result, ids = [], set()
    fields = {"id", "label", "weight", "axis_shift", "axis_sd", "rationale"}
    for raw in profiles:
        p = exact_fields(raw, fields, "population profile")
        text(p["id"], 80, "profile id")
        text(p["label"], 160, "profile label")
        text(p["rationale"], 2000, "profile rationale")
        if p["id"] in ids:
            raise ValueError("Population profile IDs must be unique")
        ids.add(p["id"])
        number(p["weight"], 0, 1, "profile weight")
        p["axis_shift"] = axis_values(p["axis_shift"], -50, 50, "axis_shift")
        p["axis_sd"] = axis_values(p["axis_sd"], 0, 30, "axis_sd")
        result.append(p)
    if abs(sum(p["weight"] for p in result) - 1) > 1e-8:
        raise ValueError("Population mixture weights must sum to one")
    return result


def scorecard_catalog() -> dict:
    """Expose the rubric, defaults, and probability interpretation to both GUI and API."""
    return {"schema_version": 1, "model_id": "blind-scorecard-v1", "rubric": rubric(), "defaults": default_settings(),
            "axes": list(AXES), "probability_meaning": "Conditional probability that a simulated cohort's rubric index meets the stated scenario threshold.",
            "interval_meaning": "5th–95th percentile modeled interval, not a confidence interval for human outcomes.",
            "variance_sources": {"review": "Triangular uncertainty over evidence ratings, independently sampled across candidate reviews.",
                                 "person": "Declared population-mixture shifts and dispersions with explicit sensitivity multipliers; hypothetical, not fitted to humans.",
                                 "scenario": "Explicit contextual sensitivity shared in matched comparisons.",
                                 "team": "Optional residual sensitivity, zero by default; observed candidate spread is reported separately."},
            "limits": ["Draw count is computational precision, not independent empirical sample size.",
                       "Scenario strata remain separate; no unlabeled pooled generalization.",
                       "Unknown evidence remains incomplete rather than being assigned a failure or success."]}
