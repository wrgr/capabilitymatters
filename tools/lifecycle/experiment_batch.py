"""Run fresh, matched experiment repetitions while preserving every outcome for human comparison."""
from __future__ import annotations

import argparse
import copy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote
import uuid

from experiment_config import catalog, default_config, resolve_config, upgrade_config, validate_config
from experiment_review import review_template
from experiment_flower import (DEFAULT_DOMAIN, annotate_flower_plans, flower_conditions,
                               is_flower_config, validate_flower_comparison)

def _hash(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def _now() -> str:
    """Return an explicit UTC timestamp for persisted batch transitions."""
    return datetime.now(timezone.utc).isoformat()


def _item(condition: str, replicate: int, config: dict[str, Any]) -> dict[str, Any]:
    """Bind a planned execution to its resolved configuration before any calls."""
    resolved = resolve_config(config)
    return {
        "item_id": f"{condition}-r{replicate:02d}",
        "condition": condition,
        "replicate": replicate,
        "config": resolved["config"],
        "config_hash": resolved["config_hash"],
        "catalog_hash": resolved["catalog_hash"],
        "execution_plan_hash": resolved["execution_plan_hash"],
        "agent_contract_hash": resolved["agent_contract_hash"],
        "agent_specs_hash": resolved["agent_specs_hash"],
        "outcome_model_hash": resolved.get("outcome_model_hash"),
        "comparison_signature": resolved["comparison_signature"],
        "planned_calls": resolved["planned_calls"],
        "status": "pending",
    }


def validate_comparison(spec: dict[str, Any]) -> dict[str, Any]:
    """Validate a bounded comparison selector without accepting predictions as agent settings."""
    if isinstance(spec, dict) and (spec.get("schema_version") == 2 or spec.get("kind") == "flower"):
        return validate_flower_comparison(spec, catalog())
    fields = {"schema_version", "kind", "competency", "integration_modes"}
    if not isinstance(spec, dict) or set(spec) != fields:
        raise ValueError("Comparison requires schema_version, kind, competency, and integration_modes")
    if type(spec["schema_version"]) is not int or spec["schema_version"] != 1:
        raise ValueError("Unsupported comparison schema_version")
    if spec["kind"] not in ("configured", "ablation", "competency_emphasis", "team_individual"):
        raise ValueError("Unknown comparison kind")
    modes = spec["integration_modes"]
    if not isinstance(modes, list) or not 1 <= len(modes) <= 2 or any(mode not in ("explicit", "handoff") for mode in modes) or len(set(modes)) != len(modes):
        raise ValueError("Comparison requires one or two distinct integration modes")
    competency = spec["competency"]
    if spec["kind"] in ("ablation", "competency_emphasis"):
        if not isinstance(competency, str) or competency not in [item["id"] for item in catalog()["competencies"]]:
            raise ValueError("A competency comparison requires a catalog competency")
    elif competency is not None:
        raise ValueError("Only an ablation or emphasis comparison selects a competency")
    return copy.deepcopy(spec)


def _emphasis_coordinator(base: dict, competency: str) -> dict:
    """Require an additional coordinator exposure without silently changing actor allocation."""
    if base.get("participation", {}).get("mode") == "individual":
        raise ValueError("Coordinator reinforcement requires team participation; select the team arrangement first")
    actor = next(item for item in base["team"] if item["id"] == base["integration"]["coordinator"])
    if competency in actor["competencies"]:
        raise ValueError("The coordinator already has this competency; reinforcement would not create a new exposure")
    return actor


def _conditions(base: dict, spec: dict) -> list[tuple[str, dict]]:
    if spec["kind"] == "flower":
        return flower_conditions(base, spec)
    if spec["kind"] == "team_individual":
        base = upgrade_config(base)
    if spec["kind"] in ("ablation", "competency_emphasis"):
        key = spec["competency"]
        base["omit_competencies"] = [value for value in base["omit_competencies"] if value != key]
        if not resolve_config(base)["coverage"][key]["scheduled_actors"]:
            raise ValueError(f"Assign {key} support to an available scheduled actor or coordinator before comparing it")
    if spec["kind"] == "competency_emphasis":
        _emphasis_coordinator(base, spec["competency"])
    variants = {"configured": ("configured",), "ablation": ("retained", "omitted"),
                "competency_emphasis": ("retained", "omitted", "reinforced"), "team_individual": ("team", "individual")}
    result = []
    for integration in spec["integration_modes"]:
        for condition in variants[spec["kind"]]:
            configured = copy.deepcopy(base)
            configured["integration"]["mode"] = integration
            configured["execution"]["repetitions"] = 1
            if condition == "omitted":
                configured["omit_competencies"].append(spec["competency"])
            if condition == "reinforced":
                coordinator = _emphasis_coordinator(configured, spec["competency"])
                coordinator["competencies"].append(spec["competency"])
                if "persona_ref" in coordinator:
                    coordinator["persona_ref"] = None  # The edited bundle is no longer an unchanged named preset.
            if spec["kind"] == "team_individual":
                configured["participation"]["mode"] = condition
            result.append((condition + "-" + integration, configured))
    return result


def _matching_audit(plans: list[dict]) -> None:
    reference = plans[0]
    fields = ("opportunities", "competency_exposure", "behavior", "authority", "model_profiles", "case", "environment",
              "challenges", "outcomes", "execution", "integration", "actor_identity", "agent_contract", "outcome_model")
    for ordinal, item in enumerate(plans, 1):
        item["execution_order"] = ordinal
        item["matching"] = {"reference_item_id": reference["item_id"],
                            "matches": {key: item["comparison_signature"][key + "_hash"] == reference["comparison_signature"][key + "_hash"] for key in fields},
                            "notes": copy.deepcopy(item["comparison_signature"]["notes"])}


def plan_comparison(config: dict[str, Any], spec: dict[str, Any]) -> list[dict[str, Any]]:
    """Interleave fresh repetitions of configured, competency-support, or actor-allocation conditions."""
    base, selection = validate_config(config), validate_comparison(spec)
    conditions = _conditions(copy.deepcopy(base), selection)
    plans = [_item(condition, repetition, configured) for repetition in range(1, base["execution"]["repetitions"] + 1)
             for condition, configured in conditions]
    _matching_audit(plans)
    if selection["kind"] == "flower":
        annotate_flower_plans(plans, selection)
    if selection["kind"] == "competency_emphasis":
        for item in plans:
            slots = resolve_config(item["config"])["execution_plan"]
            carrying = [slot["slot_id"] for slot in slots if selection["competency"] in slot["competency_ids"]]
            item["instruction_intervention"] = {"competency": selection["competency"], "carrying_slots": carrying,
                                                "carrying_slot_count": len(carrying)}
            item["matching"]["notes"].append("Coordinator reinforcement changes module placement and exposure, not evaluator weights. Tokens are not matched; assigned emphasis is not proficiency evidence.")
    return plans


def default_comparison(config: dict, matrix: bool = True) -> dict:
    """Select the flower comparison for current configurations and retain legacy matrix semantics."""
    if matrix and is_flower_config(config, catalog()):
        domain = DEFAULT_DOMAIN
        actor = next((item for item in config["team"] if domain in item["competencies"] and item["available"] and item["id"] != config["integration"]["coordinator"]), None)
        if actor is None:
            raise ValueError("The default flower comparison requires an available assessment contributor; choose an explicit comparison target")
        return {"schema_version": 2, "kind": "flower", "competency": domain, "actor_id": actor["id"],
                "integration_modes": [config["integration"]["mode"]]}
    return {"schema_version": 1, "kind": "ablation" if matrix else "configured",
            "competency": "measurement" if matrix else None,
            "integration_modes": ["explicit", "handoff"] if matrix else [config["integration"]["mode"]]}


def plan_matrix(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Preserve the measurement-by-integration matrix with interleaved fresh repetitions."""
    spec = {"schema_version": 1, "kind": "ablation", "competency": "measurement", "integration_modes": ["explicit", "handoff"]}
    plans = plan_comparison(config, spec)
    labels = {"retained-explicit": "A", "omitted-explicit": "B", "retained-handoff": "C", "omitted-handoff": "D"}
    for item in plans:
        item["condition"] = labels[item["condition"]]
        item["item_id"] = f"{item['condition']}-r{item['replicate']:02d}"
    _matching_audit(plans)
    return plans


def plan_repetitions(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Plan repeated executions of one configuration without changing its factors."""
    base = validate_config(config)
    repeats = base["execution"]["repetitions"]
    base["execution"]["repetitions"] = 1
    plans = [_item("custom", number, copy.deepcopy(base)) for number in range(1, repeats + 1)]
    _matching_audit(plans)
    return plans


def _write_json(path: Path, value: Any) -> None:
    """Atomically replace a local snapshot while leaving its previous version readable."""
    temporary = path.with_suffix(path.suffix + ".next")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


def _comparison(batch: dict[str, Any]) -> dict[str, Any]:
    """Expose observed execution records without manufacturing efficacy or quality scores."""
    excluded = {"config"}
    return {
        "schema_version": 1,
        "batch_id": batch["id"],
        "status": batch["status"],
        "design": batch["design"],
        "result_kind": batch["result_kind"],
        "interpretation": batch["interpretation"],
        "comparison_spec": batch["comparison_spec"], "comparison_spec_hash": batch["comparison_spec_hash"],
        "execution_order": batch["execution_order"], "execution_order_policy": batch["execution_order_policy"],
        "planned_runs": len(batch["plans"]),
        "completed_runs": sum(item["status"] == "completed" for item in batch["plans"]),
        "failed_runs": sum(item["status"] == "failed" for item in batch["plans"]),
        "cancelled_runs": sum(item["status"] == "cancelled" for item in batch["plans"]),
        "skipped_runs": sum(item["status"] == "skipped" for item in batch["plans"]),
        "pending_runs": sum(item["status"] == "pending" for item in batch["plans"]),
        "running_runs": sum(item["status"] == "running" for item in batch["plans"]),
        "rows": [{key: value for key, value in item.items() if key not in excluded} for item in batch["plans"]],
        "human_review": "review.json",
    }


def _persist(batch: dict[str, Any], output_root: Path) -> None:
    """Checkpoint manifest and comparison after each visible state change."""
    folder = output_root / "batches" / batch["id"]
    _write_json(folder / "manifest.json", batch)
    _write_json(folder / "comparison.json", _comparison(batch))


def prepare_batch(
    config: dict[str, Any], output_root: Path, matrix: bool = True,
    expectations: list[str] | None = None, *, comparison: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Persist the complete plan and separate human expectations before execution starts."""
    if type(matrix) is not bool:
        raise ValueError("matrix must be true or false")
    base = validate_config(config)
    expectations = [] if expectations is None else expectations
    if not isinstance(expectations, list) or len(expectations) > 50 or any(
        not isinstance(value, str) or not value.strip() or len(value) > 3000 for value in expectations
    ):
        raise ValueError("Expected observations must be at most 50 nonempty bounded statements")
    selection = validate_comparison(comparison) if comparison is not None else default_comparison(base, matrix)
    explicit = comparison is not None or selection["kind"] == "flower"
    plans = plan_comparison(base, selection) if explicit else (plan_matrix(base) if matrix else plan_repetitions(base))
    batch_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-batch-" + uuid.uuid4().hex[:8]
    folder = Path(output_root) / "batches" / batch_id
    folder.mkdir(parents=True, exist_ok=False)
    dry = base["execution"]["provider"] == "dry-run"
    batch = {
        "schema_version": 1, "id": batch_id, "batch_id": batch_id,
        "created_at": _now(), "status": "prepared",
        "design": selection["kind"] if explicit else ("measurement-by-integration-2x2" if matrix else "configured-repetitions"),
        "comparison_spec": selection, "comparison_spec_hash": _hash(selection),
        "execution_order": [item["item_id"] for item in plans],
        "execution_order_policy": "Replicate-major, declared-condition order; interleaved deterministically, not randomized.",
        "source_config": base, "source_config_hash": resolve_config(base)["config_hash"],
        "repetitions_per_condition": base["execution"]["repetitions"],
        "planned_total_calls": sum(item["planned_calls"] for item in plans),
        "result_kind": "pipeline_check" if dry else "model_experiment",
        "interpretation": (
            "Dry-run checks execution, trace, and replay only. It supplies no competency-ablation findings."
            if dry else "Model-generated artifacts require human assessment; no human-team or learning outcomes are established."
        ),
        "expected_observations": copy.deepcopy(expectations),
        "failure_policy": "Continue after a recorded run failure; retain failed and successful records.",
        "cancellation_policy": "Stop before the next run; the current run may finish unless separately cancelled.",
        "plans": plans,
    }
    _persist(batch, Path(output_root))
    _write_json(folder / "review.json", review_template(batch))
    return batch


def _summarize_journal(journal: Any) -> dict[str, Any]:
    """Link observed counts and artifact revisions to a verified retained journal."""
    from engine import verify

    run = journal.run
    verify(run)
    events = run["events"]
    replay = "/agentic-le/experiments/?run=" + quote(run["id"], safe="")
    artifacts = [
        {"stage": event["stage"], "revision": event["payload"]["revision"],
         "event_seq": event["seq"], "event_hash": event["hash"],
         "artifact_hash": event["payload"]["content_hash"],
         "title": event["payload"]["content"]["title"],
         "replay_url": replay + "&event=" + str(event["seq"])}
        for event in events if event["kind"] == "artifact"
    ]
    assessments = [event for event in events if event["kind"] == "outcome_assessment"]
    outcome = ({key: copy.deepcopy(assessments[-1]["payload"].get(key)) for key in ("status", "dimensions", "evaluator", "evidence_kind")}
               if assessments else None)
    return {
        "run_id": run["id"], "run_path": f"../../{run['id']}/run.json",
        "run_head_hash": events[-1]["hash"], "mode": run["mode"],
        "replay_url": replay, "journal_verified": True, "trace_status": "retained",
        "observed": {"events": len(events), "requests": sum(e["kind"] == "request" for e in events),
                     "contributions": sum(e["kind"] == "contribution" for e in events),
                     "decisions": sum(e["kind"] == "decision" for e in events),
                     "challenges": sum(e["kind"] == "challenge" for e in events),
                     "artifacts": len(artifacts)},
        "terminal_kind": events[-1]["kind"], "terminal_status": events[-1]["payload"].get("status"),
        "artifacts": artifacts, "outcome": outcome,
    }


def _pin_created_run(item: dict[str, Any], journal: Any, checkpoint: Callable[[], None] | None) -> None:
    """Expose the actual new journal before any provider calls so its live trace is reachable."""
    run = journal.run
    item.update(run_id=run["id"], run_path=f"../../{run['id']}/run.json", mode=run["mode"],
                replay_url="/agentic-le/experiments/?run=" + quote(run["id"], safe=""),
                created_event_hash=run["events"][0]["hash"], trace_status="recording")
    if checkpoint is not None:
        checkpoint()


def _execute_item(
    item: dict[str, Any], output_root: Path, provider_factory: Callable | None,
    checkpoint: Callable[[], None] | None = None,
) -> None:
    """Execute one fresh run and retain failure provenance instead of dropping the condition."""
    from experiment_runtime import run_experiment

    item["started_at"] = _now()
    journal = None
    try:
        configured = copy.deepcopy(item["config"])
        resolved = resolve_config(configured)
        pinned = ("config_hash", "catalog_hash", "execution_plan_hash", "agent_contract_hash", "agent_specs_hash", "outcome_model_hash")
        if any(resolved.get(key) != item[key] for key in pinned):
            raise ValueError("Prepared configuration or instruction catalog changed before execution")
        provider = provider_factory(copy.deepcopy(configured)) if provider_factory else None
        journal = run_experiment(configured, output_root, provider=provider,
                                 on_created=lambda created: _pin_created_run(item, created, checkpoint))
        item.update(_summarize_journal(journal))
        item["status"] = item["terminal_kind"] if item["terminal_kind"] in ("completed", "cancelled") else "failed"
        if item["status"] == "failed":
            item["error"] = {"type": "IncompleteRun", "message": "Execution returned without a completed record"}
    except Exception as error:
        item["status"] = "failed"
        item["error"] = {"type": type(error).__name__, "message": str(error)}
        journal = getattr(error, "journal", journal)
        if journal is not None:
            try:
                item.update(_summarize_journal(journal))
                if item["terminal_kind"] == "cancelled":
                    item["status"] = "cancelled"
                    item["cancellation"] = item.pop("error")["message"]
            except (ValueError, KeyError, TypeError) as integrity_error:
                item["journal_verified"] = False
                item["integrity_error"] = str(integrity_error)
        else:
            item["failure_phase"] = "before_retained_journal"
    item["finished_at"] = _now()


def _skip_pending(batch: dict[str, Any], reason: str) -> None:
    """Mark unscheduled repetitions explicitly without inventing run identities or evidence."""
    for item in batch["plans"]:
        if item["status"] == "pending":
            item.update(status="skipped", skip_reason=reason, finished_at=_now())


def _cancel_batch(batch: dict[str, Any], reason: str) -> None:
    """Retain completed observations and mark the remaining plan as cancelled before execution."""
    batch.update(status="cancelled", cancellation=reason, cancelled_at=_now())
    _skip_pending(batch, "batch_cancelled_before_run")


def _fail_batch(batch: dict[str, Any], output_root: Path, error: Exception) -> None:
    """Persist an unexpected orchestration failure without dropping the original execution plan."""
    detail = {"type": type(error).__name__, "message": str(error), "phase": "batch_orchestration"}
    batch.update(status="failed", error=detail, finished_at=_now())
    for item in batch["plans"]:
        if item["status"] == "running":
            item.update(status="failed", error=dict(detail), finished_at=_now())
    _skip_pending(batch, "batch_failed_before_run")
    try:
        _persist(batch, output_root)
    except OSError as persistence_error:
        error.add_note("Could not persist terminal batch failure: " + str(persistence_error))


def execute_batch(
    batch: dict[str, Any], output_root: Path, provider_factory: Callable | None = None,
) -> dict[str, Any]:
    """Run a prepared batch once, stopping at cancellation boundaries and retaining failures."""
    output_root = Path(output_root)
    persisted = json.loads((output_root / "batches" / batch["id"] / "manifest.json").read_text())
    if batch != persisted or batch["status"] != "prepared":
        raise ValueError("Only the unchanged prepared batch can be executed; start a new batch to repeat")
    try:
        batch.update(status="running", started_at=_now())
        _persist(batch, output_root)
        for item in batch["plans"]:
            if (output_root / "batches" / batch["id"] / "cancel.requested").is_file():
                _cancel_batch(batch, "Cancellation observed before the next run; earlier records retained.")
                break
            item["status"] = "running"
            _persist(batch, output_root)
            _execute_item(item, output_root, provider_factory, lambda: _persist(batch, output_root))
            _persist(batch, output_root)
            if item["status"] == "cancelled":
                _cancel_batch(batch, "The active run was cancelled; remaining runs were not started.")
                break
        if batch["status"] != "cancelled":
            batch["status"] = "completed_with_failures" if any(p["status"] == "failed" for p in batch["plans"]) else "completed"
        batch["finished_at"] = _now()
        _persist(batch, output_root)
    except Exception as error:
        _fail_batch(batch, output_root, error)
        raise
    return batch


def run_batch(
    config: dict[str, Any], output_root: Path, matrix: bool = True,
    provider_factory: Callable | None = None, expectations: list[str] | None = None,
    *, comparison: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Prepare and execute a new batch with review expectations kept outside agent input."""
    return execute_batch(prepare_batch(config, output_root, matrix, expectations, comparison=comparison), output_root, provider_factory)


def main() -> None:
    """Run or inspect a finite experiment plan from the command line."""
    from engine import RUNS

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, help="Configuration exported by the GUI; defaults to its example")
    parser.add_argument("--output-root", type=Path, default=RUNS)
    choices = parser.add_mutually_exclusive_group()
    choices.add_argument("--single", action="store_true", help="Repeat one configuration instead of the four conditions")
    choices.add_argument("--comparison", choices=("configured", "ablation", "competency_emphasis", "team_individual", "flower"), help="Select a generalized comparison; the flower default uses five conditions")
    parser.add_argument("--competency", help="Catalog domain selected for a responsibility comparison")
    parser.add_argument("--actor-id", default="member-4", help="Target member for flower withdrawal and removal")
    parser.add_argument("--integration-mode", action="append", choices=("explicit", "handoff"), help="Integration condition; may be repeated")
    parser.add_argument("--plan", action="store_true", help="Print resolved plans without creating a batch or calling a provider")
    parser.add_argument("--expectations", type=Path, help="Separate JSON array of expected observations, never passed to agents")
    args = parser.parse_args()
    try:
        config = json.loads(args.config.read_text()) if args.config else default_config()
        domain = args.competency or (DEFAULT_DOMAIN if is_flower_config(config, catalog()) else "measurement")
        comparison = ({"schema_version": 1, "kind": args.comparison,
                       "competency": domain if args.comparison in ("ablation", "competency_emphasis", "flower") else None,
                       "integration_modes": args.integration_mode or [config["integration"]["mode"]]} if args.comparison else None)
        if args.comparison == "flower":
            comparison.update(schema_version=2, actor_id=args.actor_id)
        elif comparison is None and not args.single and is_flower_config(config, catalog()):
            comparison = default_comparison(config)
        if args.integration_mode and comparison is None:
            raise ValueError("--integration-mode requires --comparison")
        if args.plan:
            plans = plan_comparison(config, comparison) if comparison else (plan_repetitions(config) if args.single else plan_matrix(config))
            print(json.dumps(plans, indent=2))
            return
        expectations = json.loads(args.expectations.read_text()) if args.expectations else None
        batch = run_batch(config, args.output_root, matrix=not args.single, expectations=expectations, comparison=comparison)
        print(json.dumps({"batch_id": batch["id"], "status": batch["status"],
                          "result_kind": batch["result_kind"], "directory": str(args.output_root / "batches" / batch["id"])}))
        if batch["status"] != "completed":
            parser.exit(1)
    except (ValueError, OSError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
