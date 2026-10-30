"""Run fresh, matched experiment repetitions while preserving every outcome for human comparison."""
from __future__ import annotations

import argparse
import copy
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote
import uuid

from experiment_config import default_config, resolve_config, validate_config
from experiment_review import review_template

CONDITIONS = (
    ("A", False, "explicit"),
    ("B", True, "explicit"),
    ("C", False, "handoff"),
    ("D", True, "handoff"),
)


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
        "planned_calls": resolved["planned_calls"],
        "status": "pending",
    }


def plan_matrix(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Plan the measurement-support by integration comparison with fresh repetitions."""
    base = validate_config(config)
    repeats = base["execution"]["repetitions"]
    baseline = copy.deepcopy(base)
    baseline["omit_competencies"] = [x for x in base["omit_competencies"] if x != "measurement"]
    coverage = resolve_config(baseline)["coverage"]["measurement"]
    coordinator = baseline["integration"]["coordinator"]
    if not coverage["scheduled_actors"] and coordinator not in coverage["available_to"]:
        raise ValueError("Assign measurement support to an available scheduled actor or coordinator before comparing it")
    plans = []
    for condition, omitted, integration in CONDITIONS:
        configured = copy.deepcopy(baseline)
        if omitted:
            configured["omit_competencies"].append("measurement")
        configured["integration"]["mode"] = integration
        configured["execution"]["repetitions"] = 1
        for replicate in range(1, repeats + 1):
            plans.append(_item(condition, replicate, copy.deepcopy(configured)))
    return plans


def plan_repetitions(config: dict[str, Any]) -> list[dict[str, Any]]:
    """Plan repeated executions of one configuration without changing its factors."""
    base = validate_config(config)
    repeats = base["execution"]["repetitions"]
    base["execution"]["repetitions"] = 1
    return [_item("custom", number, copy.deepcopy(base)) for number in range(1, repeats + 1)]


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
    expectations: list[str] | None = None,
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
    plans = plan_matrix(base) if matrix else plan_repetitions(base)
    batch_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-batch-" + uuid.uuid4().hex[:8]
    folder = Path(output_root) / "batches" / batch_id
    folder.mkdir(parents=True, exist_ok=False)
    dry = base["execution"]["provider"] == "dry-run"
    batch = {
        "schema_version": 1, "id": batch_id, "batch_id": batch_id,
        "created_at": _now(), "status": "prepared",
        "design": "measurement-by-integration-2x2" if matrix else "configured-repetitions",
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
        "artifacts": artifacts,
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
        if resolved["config_hash"] != item["config_hash"] or resolved["catalog_hash"] != item["catalog_hash"]:
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
) -> dict[str, Any]:
    """Prepare and execute a new batch with review expectations kept outside agent input."""
    return execute_batch(prepare_batch(config, output_root, matrix, expectations), output_root, provider_factory)


def main() -> None:
    """Run or inspect a finite experiment plan from the command line."""
    from engine import RUNS

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path, help="Configuration exported by the GUI; defaults to its example")
    parser.add_argument("--output-root", type=Path, default=RUNS)
    parser.add_argument("--single", action="store_true", help="Repeat one configuration instead of the four conditions")
    parser.add_argument("--plan", action="store_true", help="Print resolved plans without creating a batch or calling a provider")
    parser.add_argument("--expectations", type=Path, help="Separate JSON array of expected observations, never passed to agents")
    args = parser.parse_args()
    try:
        config = json.loads(args.config.read_text()) if args.config else default_config()
        if args.plan:
            print(json.dumps(plan_repetitions(config) if args.single else plan_matrix(config), indent=2))
            return
        expectations = json.loads(args.expectations.read_text()) if args.expectations else None
        batch = run_batch(config, args.output_root, matrix=not args.single, expectations=expectations)
        print(json.dumps({"batch_id": batch["id"], "status": batch["status"],
                          "result_kind": batch["result_kind"], "directory": str(args.output_root / "batches" / batch["id"])}))
        if batch["status"] != "completed":
            parser.exit(1)
    except (ValueError, OSError) as error:
        parser.error(str(error))


if __name__ == "__main__":
    main()
