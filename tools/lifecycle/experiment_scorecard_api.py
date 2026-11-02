"""Expose scenario, iteration, and blind scorecard operations through the existing local runner."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from experiment_iteration import create_iteration, list_iterations, read_iteration
from experiment_scenarios import apply_scenario, scenario_catalog

PREFIX = "/api/experiments/"


def handle_get(handler: Any, root: Path) -> bool:
    """Serve catalogs and immutable iteration records without exposing assignment keys to reviewers."""
    from experiment_scorecard import scorecard_catalog
    path = handler.path.removeprefix(PREFIX)
    if path == "scorecards/catalog":
        handler.send_json(scorecard_catalog())
    elif path == "scorecards":
        from experiment_scorecard_store import list_stored_reviews
        handler.send_json({"records": list_stored_reviews(root)})
    elif path == "scenarios":
        handler.send_json(scenario_catalog())
    elif path == "iterations":
        handler.send_json({"iterations": list_iterations(root)})
    elif path.startswith("iterations/"):
        handler.send_json(read_iteration(root, path.removeprefix("iterations/")))
    else:
        return False
    return True


def _fields(body: dict, required: set[str], optional: set[str] | None = None) -> None:
    if not required <= set(body) or set(body) - required - (optional or set()):
        raise ValueError("Unexpected or missing fields for this operation")


def handle_post(handler: Any, root: Path, body: dict) -> bool:
    """Dispatch validated local operations while preserving scoring and reveal as separate actions."""
    from experiment_scorecard import assess_packet, compare_frozen, review_template
    from experiment_scorecard_store import create_packets, freeze_stored_review, reveal_stored_reviews, frozen_from_references
    path = handler.path.removeprefix(PREFIX)
    if path == "scenarios/apply":
        _fields(body, {"config", "scenario_id"})
        value = apply_scenario(body["config"], body["scenario_id"])
    elif path == "iterations":
        value = create_iteration(root, body)
    elif path == "scorecards/packets":
        value = create_packets(root, body)
    elif path == "scorecards/template":
        _fields(body, {"packet"})
        value = review_template(body["packet"])
    elif path in ("scorecards/freeze", "scorecards/assess"):
        _fields(body, {"packet", "review"}, {"settings"})
        if path.endswith("freeze"):
            value = freeze_stored_review(root, body["packet"], body["review"], body.get("settings"))
        else:
            value = assess_packet(body["packet"], body["review"], body.get("settings"))
            value["assessment_mode"] = "exploratory_preview_not_frozen"
    elif path == "scorecards/compare":
        _fields(body, {"baseline", "target"})
        value = compare_frozen(body["baseline"], body["target"])
    elif path == "scorecards/unblind":
        field = "record_refs" if "record_refs" in body else "records"
        _fields(body, {field, "mapping"})
        records = frozen_from_references(root, body[field]) if field == "record_refs" else body[field]
        value = reveal_stored_reviews(root, records, body["mapping"])
    else:
        return False
    handler.send_json(value)
    return True
