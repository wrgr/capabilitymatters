"""Keep human assessments separate from execution prompts so observations remain evidence-linked."""
from __future__ import annotations

import copy
from typing import Any, Mapping

DIMENSIONS = ("learner", "human", "system")
RUBRIC = {
    "0": "Absent, contradicted, or unsupported in the inspected work.",
    "1": "Recognized, with no defensible decision or requirement yet.",
    "2": "Carried into a justified decision or requirement with an evidence plan.",
    "3": "Carried into implemented behavior and checked, with limits stated.",
}


def review_template(batch: dict[str, Any]) -> dict[str, Any]:
    """Create an unscored human review record indexed by immutable planned runs."""
    return {
        "schema_version": 1,
        "batch_id": batch["id"],
        "status": "unreviewed",
        "scope": "Artifact quality and hypotheses; no observed human or learning outcomes.",
        "rubric": dict(RUBRIC),
        "expected_observations": copy.deepcopy(batch["expected_observations"]),
        "expectations_recorded_at": batch["created_at"],
        "expectations_recorded_before_execution": True,
        "reviews": [
            {
                "item_id": item["item_id"],
                "config_hash": item["config_hash"],
                "reviewer": "",
                "ratings": {
                    dimension: {"score": None, "rationale": "", "evidence": []}
                    for dimension in DIMENSIONS
                },
                "expected_gap_observations": [],
                "unexpected_observations": [],
                "compensating_contributions": [],
                "limitations": [],
            }
            for item in batch["plans"]
        ],
    }


def _check_evidence(reference: Any, run: dict[str, Any]) -> None:
    """Require each supplied citation to identify the retained event and artifact."""
    if not isinstance(reference, dict):
        raise ValueError("Review evidence must be an object")
    if set(reference) - {"run_id", "event_seq", "event_hash", "artifact_hash"}:
        raise ValueError("Unknown review evidence fields")
    if reference.get("run_id") != run["id"]:
        raise ValueError("Review evidence points to a different run")
    seq = reference.get("event_seq")
    if type(seq) is not int or not 1 <= seq <= len(run["events"]):
        raise ValueError("Review evidence requires a recorded event sequence")
    event = run["events"][seq - 1]
    if reference.get("event_hash") != event["hash"]:
        raise ValueError("Review event hash differs from the retained record")
    artifact_hash = reference.get("artifact_hash")
    if artifact_hash is not None and (
        event["kind"] != "artifact" or event["payload"]["content_hash"] != artifact_hash
    ):
        raise ValueError("Review artifact hash must match the cited artifact event")


def _check_rating(rating: Any, run: dict[str, Any] | None) -> None:
    """Validate a human rating without converting it into an automatic result."""
    if not isinstance(rating, dict) or set(rating) != {"score", "rationale", "evidence"}:
        raise ValueError("A rating requires score, rationale, and evidence")
    score = rating["score"]
    if score is not None and (type(score) is not int or score not in range(4)):
        raise ValueError("Human ratings must be null or an integer from 0 to 3")
    if not isinstance(rating["rationale"], str) or not isinstance(rating["evidence"], list):
        raise ValueError("Rating rationale must be text and evidence must be a list")
    if score is not None and (not rating["rationale"].strip() or not rating["evidence"]):
        raise ValueError("A scored rating needs rationale and recorded evidence")
    if rating["evidence"] and run is None:
        raise ValueError("A planned run cannot supply observation evidence")
    for reference in rating["evidence"]:
        _check_evidence(reference, run)


def validate_review(
    review: dict[str, Any], batch: dict[str, Any], runs: Mapping[str, dict[str, Any]]
) -> dict[str, Any]:
    """Check human ratings against the batch and verified journals without scoring them."""
    from engine import verify

    if not isinstance(review, dict) or review.get("schema_version") != 1:
        raise ValueError("Unsupported human review format")
    if review.get("batch_id") != batch["id"]:
        raise ValueError("Human review belongs to a different batch")
    if review.get("expected_observations") != batch["expected_observations"]:
        raise ValueError("Predeclared expectations differ; record later ideas as unexpected observations")
    items = {item["item_id"]: item for item in batch["plans"]}
    entries = review.get("reviews")
    if not isinstance(entries, list) or len(entries) != len(items):
        raise ValueError("Human review must contain each planned item exactly once")
    seen: set[str] = set()
    for entry in entries:
        if not isinstance(entry, dict) or entry.get("item_id") not in items:
            raise ValueError("Human review references an unknown planned item")
        key = entry["item_id"]
        item = items[key]
        if key in seen or entry.get("config_hash") != item["config_hash"]:
            raise ValueError("Duplicate review item or changed configuration hash")
        seen.add(key)
        run = runs.get(item.get("run_id", ""))
        if run is not None:
            verify(run)
            if run["events"][-1]["hash"] != item.get("run_head_hash"):
                raise ValueError("Reviewed journal differs from the batch's retained head")
        ratings = entry.get("ratings")
        if not isinstance(ratings, dict) or set(ratings) != set(DIMENSIONS):
            raise ValueError("Review learner, human, and system dimensions separately")
        for rating in ratings.values():
            _check_rating(rating, run)
        if any(rating["score"] is not None for rating in ratings.values()):
            if not isinstance(entry.get("reviewer"), str) or not entry["reviewer"].strip():
                raise ValueError("Scored ratings require a named human reviewer")
    return copy.deepcopy(review)
