"""Assess declared designs with a transparent synthetic cohort model independent of agent identities."""
from __future__ import annotations

import copy
from decimal import Decimal
import hashlib
import json
import math
from pathlib import Path
import random
from typing import Any

MODEL_ID = "declared-design-v1"
MODEL_VERSION = "1.0.0"
CATALOG = Path(__file__).resolve().parents[2] / "src/data/lifecycle/outcome-model.json"
OUTCOME_FIELDS = {"enabled", "model_id", "seed", "cohort_size", "conditions", "assumptions", "criteria"}
DESIGN_FIELDS = {"practice_minutes", "feedback", "revision_opportunity", "support_minutes_per_learner",
                 "offline_fallback", "choice_preserved", "personal_data", "model_applicability", "scope_rationale"}


def _hash(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return hashlib.sha256(encoded.encode()).hexdigest()


def _object(value: Any, fields: set[str], label: str, partial: bool = False) -> dict:
    if not isinstance(value, dict) or (not set(value) <= fields if partial else set(value) != fields):
        raise ValueError(f"{label} must contain {'only' if partial else 'exactly'}: {', '.join(sorted(fields))}")
    return copy.deepcopy(value)


def _number(value: Any, minimum: float, maximum: float, label: str, integer: bool = False) -> int | float:
    valid_type = type(value) is int if integer else type(value) in (int, float)
    if not valid_type or not minimum <= value <= maximum or not math.isfinite(value):
        kind = "integer" if integer else "finite number"
        raise ValueError(f"{label} must be a {kind} from {minimum} to {maximum}")
    if type(value) is float:
        if Decimal(str(value)).as_tuple().exponent < -4:
            raise ValueError(label + " must use at most four decimal places")
        return int(value) if value.is_integer() else value
    return value


def _reported(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _reported(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_reported(item) for item in value]
    if type(value) is float:
        rounded = round(value, 4)
        return int(rounded) if rounded.is_integer() else rounded
    return value


def outcome_catalog() -> dict:
    """Return fresh model definitions, editable parameter bounds, presets, and interpretation limits."""
    value = json.loads(CATALOG.read_text())
    if value.get("schema_version") != 1 or value.get("model_id") != MODEL_ID or value.get("version") != MODEL_VERSION:
        raise ValueError("Unsupported outcome-model catalog version")
    return value


def _parameters(value: Any, group: str, partial: bool = False) -> dict:
    fields = outcome_catalog()["fields"][group]
    result = _object(value, {item["id"] for item in fields}, "outcome " + group, partial)
    for item in fields:
        if item["id"] in result:
            result[item["id"]] = _number(result[item["id"]], item["minimum"], item["maximum"], item["id"])
    return result


def default_outcomes() -> dict:
    """Return an independent, validated copy of the illustrative outcome-model defaults."""
    return validate_outcomes(outcome_catalog()["defaults"])


def validate_outcomes(value: Any) -> dict:
    """Reject missing, extra, nonfinite, or unbounded outcome settings and return a fresh object."""
    result = _object(value, OUTCOME_FIELDS, "outcome settings")
    if type(result["enabled"]) is not bool:
        raise ValueError("Outcome enabled must be true or false")
    if result["model_id"] != MODEL_ID:
        raise ValueError("Unsupported outcome model_id")
    _number(result["seed"], 0, 2**32 - 1, "outcome seed", integer=True)
    _number(result["cohort_size"], 1, 10000, "cohort_size", integer=True)
    for group in ("conditions", "assumptions", "criteria"):
        result[group] = _parameters(result[group], group)
    return result


def validate_effects(value: Any) -> dict:
    """Validate a challenge's partial replacement of the three simulation conditions."""
    return _parameters(value, "conditions", partial=True)


def design_schema() -> dict:
    """Describe the bounded Build-design declarations consumed by the illustrative simulator."""
    return {"type": "object", "additionalProperties": False, "properties": {
        "practice_minutes": {"type": "integer", "minimum": 0, "maximum": 120},
        "feedback": {"type": "string", "enum": ["none", "generic", "specific"]},
        "revision_opportunity": {"type": "boolean"},
        "support_minutes_per_learner": {"type": "number", "minimum": 0, "maximum": 120, "multipleOf": 0.0001},
        "offline_fallback": {"type": "boolean"},
        "choice_preserved": {"type": "boolean"},
        "personal_data": {"type": "string", "enum": ["none", "anonymous", "identified"]},
        "model_applicability": {"type": "string", "enum": ["within_scope", "outside_scope"]},
        "scope_rationale": {"type": "string", "maxLength": 2000,
                            "description": "Explain why this design is outside the practice-and-feedback model when outside_scope is selected; this remains an agent claim for human review."},
    }, "required": sorted(DESIGN_FIELDS)}


def validate_design(value: Any) -> dict:
    """Return a complete typed declaration without inferring missing design choices from prose."""
    result = _object(value, DESIGN_FIELDS, "declared design")
    result["practice_minutes"] = _number(result["practice_minutes"], 0, 120, "practice_minutes", integer=True)
    result["support_minutes_per_learner"] = _number(result["support_minutes_per_learner"], 0, 120, "support_minutes_per_learner")
    for key in ("revision_opportunity", "offline_fallback", "choice_preserved"):
        if type(result[key]) is not bool:
            raise ValueError(key + " must be true or false")
    for key, options in (("feedback", ("none", "generic", "specific")), ("personal_data", ("none", "anonymous", "identified")),
                         ("model_applicability", ("within_scope", "outside_scope"))):
        if result[key] not in options:
            raise ValueError("Invalid declared design " + key)
    rationale = result["scope_rationale"]
    if not isinstance(rationale, str) or len(rationale) > 2000:
        raise ValueError("scope_rationale must be text of at most 2000 characters")
    if result["model_applicability"] == "outside_scope" and not rationale.strip():
        raise ValueError("An outside_scope design requires a nonempty scope_rationale")
    return result


def _arrived_effects(events: list[dict]) -> list[tuple[dict, dict]]:
    if not isinstance(events, list):
        raise ValueError("Visible events must be an ordered list")
    return [(event, validate_effects(event["payload"]["simulation_effects"])) for event in events
            if event.get("kind") == "challenge" and "simulation_effects" in event.get("payload", {})]


def visible_conditions(config: dict, events: list[dict]) -> dict:
    """Apply only arrived challenge effects, in event order, to the initial simulation conditions."""
    settings = validate_outcomes(config.get("outcomes"))
    conditions = copy.deepcopy(settings["conditions"])
    for _, effects in _arrived_effects(events):
        conditions.update(effects)
    return conditions


def _evidence(event: dict) -> dict:
    reference = {"event_seq": event["seq"], "event_hash": event["hash"], "kind": event["kind"]}
    if event["kind"] == "artifact":
        reference["artifact_hash"] = event["payload"]["content_hash"]
    return reference


def _design_source(events: list[dict]) -> tuple[dict | None, list[dict]]:
    decisions = [event for event in events if event.get("kind") == "decision" and event.get("stage") == "build"]
    if not decisions or decisions[-1].get("payload", {}).get("response", {}).get("design") is None:
        return None, []
    decision = decisions[-1]
    design = validate_design(decision["payload"]["response"]["design"])
    artifacts = [event for event in events if event.get("kind") == "artifact" and event.get("stage") == "build"
                 and event.get("payload", {}).get("trigger_seq") == decision["seq"]]
    artifact = artifacts[-1] if artifacts else None
    source = {"decision_seq": decision["seq"], "decision_hash": decision["hash"], "design": design,
              "artifact_seq": artifact["seq"] if artifact else None,
              "artifact_hash": artifact["payload"]["content_hash"] if artifact else None,
              "technical_fixture": decision["payload"].get("technical_fixture", False)}
    return source, [_evidence(event) for event in ([decision, artifact] if artifact else [decision])]


def _probabilities(settings: dict, conditions: dict, design: dict) -> dict:
    assumptions = settings["assumptions"]
    practice = min(design["practice_minutes"], conditions["available_minutes"])
    feedback_factor = {"none": 0, "generic": 0.5, "specific": 1}[design["feedback"]]
    success = (assumptions["baseline_success"] + practice * assumptions["practice_gain_per_minute"]
               + feedback_factor * assumptions["feedback_gain"]
               + int(design["revision_opportunity"]) * assumptions["revision_gain"] - assumptions["transfer_penalty"])
    coverage = conditions["digital_access"]
    if design["offline_fallback"]:
        coverage += (1 - coverage) * assumptions["offline_recovery"]
    support = settings["cohort_size"] * design["support_minutes_per_learner"]
    capacity = min(1, conditions["support_capacity_minutes"] / support) if support else 1
    return {"effective_practice_minutes": practice, "conditional_success_probability": max(0, min(1, success)),
            "coverage_fraction": coverage, "support_capacity_fraction": capacity,
            "support_minutes_requested_total": support, "completion_probability": coverage * capacity}


def _sample(settings: dict, probabilities: dict) -> dict:
    rng = random.Random(settings["seed"])
    completed, successful = 0, 0
    for _ in range(settings["cohort_size"]):
        # Consume both paired draws even for non-completers, preserving comparable random streams.
        completion_draw, success_draw = rng.random(), rng.random()
        complete = completion_draw < probabilities["completion_probability"]
        completed += int(complete)
        successful += int(complete and success_draw < probabilities["conditional_success_probability"])
    return _reported({"cohort_size": settings["cohort_size"], "completion_count": completed, "learner_success_count": successful,
            "completion_fraction": completed / settings["cohort_size"],
            "learner_success_fraction": successful / settings["cohort_size"]})


def _dimension(passed: bool, metrics: dict, criteria: dict, reason: str, evidence: list[dict]) -> dict:
    return {"status": "success" if passed else "failure", "metrics": metrics, "criteria": criteria,
            "reason": reason, "evidence_refs": copy.deepcopy(evidence)}


def _dimensions(settings: dict, conditions: dict, design: dict, probabilities: dict, sample: dict, evidence: list[dict]) -> dict:
    criteria = settings["criteria"]
    expected_success = probabilities["completion_probability"] * probabilities["conditional_success_probability"]
    learner_metrics = {"cohort_size": sample["cohort_size"], "success_count": sample["learner_success_count"],
                       "sampled_success_fraction": sample["learner_success_fraction"], "expected_success_fraction": expected_success,
                       "conditional_success_probability": probabilities["conditional_success_probability"],
                       "effective_practice_minutes": probabilities["effective_practice_minutes"]}
    burden = _reported(design["practice_minutes"] + design["support_minutes_per_learner"])
    human_checks = {"practice_fits_available_time": design["practice_minutes"] <= conditions["available_minutes"],
                    "effort_within_limit": burden <= criteria["max_burden_minutes"], "choice_preserved": design["choice_preserved"],
                    "no_identified_personal_data": design["personal_data"] != "identified"}
    human_metrics = {"requested_practice_minutes": design["practice_minutes"], "effort_minutes_per_learner": burden,
                     "support_minutes_per_learner": design["support_minutes_per_learner"], "checks": human_checks}
    system_metrics = {"cohort_size": sample["cohort_size"], "completion_count": sample["completion_count"],
                      "sampled_completion_fraction": sample["completion_fraction"],
                      "expected_completion_fraction": probabilities["completion_probability"],
                      "coverage_fraction": probabilities["coverage_fraction"], "support_capacity_fraction": probabilities["support_capacity_fraction"],
                      "support_minutes_requested_total": probabilities["support_minutes_requested_total"]}
    return {
        "learner": _dimension(sample["learner_success_fraction"] >= criteria["learner_success_min"], learner_metrics,
                              {"learner_success_min": criteria["learner_success_min"]},
                              "Compare sampled successes across the full synthetic cohort with the required fraction.", evidence),
        "human": _dimension(all(human_checks.values()), human_metrics, {"max_burden_minutes": criteria["max_burden_minutes"],
                            "practice_must_fit": True, "choice_required": True, "identified_data_allowed": False},
                            "All four declared time, effort, choice, and personal-data checks must pass.", evidence),
        "system": _dimension(sample["completion_fraction"] >= criteria["system_completion_min"], system_metrics,
                             {"system_completion_min": criteria["system_completion_min"]},
                             "Compare sampled completion with the required fraction under access and support constraints.", evidence),
    }


def _assessment_base(settings: dict, conditions: dict, events: list[dict]) -> dict:
    definitions = outcome_catalog()
    effects = _arrived_effects(events)
    return {"schema_version": 1, "evaluator": {"id": "declared-design-outcomes", "version": MODEL_VERSION, "model_id": MODEL_ID},
            "model_hash": _hash(definitions), "assumption_hash": _hash(settings["assumptions"]),
            "parameter_hash": _hash({"settings": settings, "effective_conditions": conditions}),
            "scope": "illustrative_declared_design_simulation", "human_outcomes_observed": False,
            "evidence_kind": "illustrative_simulation", "numeric_precision": definitions["numeric_precision"],
            "candidate_implementation_verified": False, "conditions": conditions, "assumptions": settings["assumptions"],
            "criteria": settings["criteria"], "seed": settings["seed"], "cohort_size": settings["cohort_size"],
            "sampler": {"algorithm": "Python random.Random (MT19937)", "draws_per_person": 2},
            "applied_challenge_effects": [{"effects": effect, "evidence_ref": _evidence(event)} for event, effect in effects],
            "formulas": definitions["formulas"], "limitations": definitions["limitations"]}


def assess_outcome(config: dict, events: list[dict]) -> dict:
    """Simulate the latest declared Build design using only outcome settings and the supplied event prefix."""
    settings = validate_outcomes(config.get("outcomes"))
    conditions = visible_conditions(config, events)
    result = _assessment_base(settings, conditions, events)
    source, evidence = _design_source(events) if settings["enabled"] else (None, [])
    origin = "authored_fixture" if source and source["technical_fixture"] else "recorded_design" if source else "unavailable"
    result.update(design_source=source, input_origin=origin)
    if not settings["enabled"] or source is None:
        reason = "Outcome simulation is disabled." if not settings["enabled"] else "No complete declared Build design is visible; no result was inferred from prose."
        result.update(status="indeterminate", reason=reason,
                      dimensions={key: {"status": "indeterminate", "metrics": {}, "criteria": {}, "reason": reason, "evidence_refs": []}
                                  for key in ("learner", "human", "system")})
        return _reported(result)
    evidence.extend(_evidence(event) for event, _ in _arrived_effects(events))
    if source["design"]["model_applicability"] == "outside_scope":
        rationale = source["design"]["scope_rationale"]
        reason = "This declared design is outside the practice-and-feedback model. Agent claim awaiting human review: " + rationale
        result.update(status="indeterminate", reason=reason,
                      applicability_review={"status": "awaiting_human_review", "origin": "agent_claim",
                                            "declared_applicability": "outside_scope", "scope_rationale": rationale,
                                            "eligibility_verified": False},
                      dimensions={key: {"status": "indeterminate", "metrics": {}, "criteria": {}, "reason": reason,
                                        "evidence_refs": copy.deepcopy(evidence)} for key in ("learner", "human", "system")})
        return _reported(result)
    probabilities = _probabilities(settings, conditions, source["design"])
    sample = _sample(settings, probabilities)
    dimensions = _dimensions(settings, conditions, source["design"], probabilities, sample, evidence)
    passed = sum(dimension["status"] == "success" for dimension in dimensions.values())
    result.update(status="success" if passed == 3 else "failure" if passed == 0 else "partial", dimensions=dimensions,
                  reason=f"{passed} of 3 declared-design criteria pass under the recorded illustrative assumptions.")
    return _reported(result)
