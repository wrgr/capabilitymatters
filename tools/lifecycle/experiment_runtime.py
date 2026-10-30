"""Execute a fixed experiment schedule while preserving its complete configuration and evidence trail."""
from __future__ import annotations

import argparse
import hashlib
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable

from engine import Journal, CodexProvider, STAGES, RUNS, canonical, validate_response, verify
from experiment_config import catalog, default_config, resolve_config
from experiment_fixture import DryRunProvider
from experiment_prompts import CONTEXT_POLICY, PROMPT_VERSION, experiment_prompt

EXECUTOR_VERSION = "fixed-experiment-1"


class ExperimentRunError(RuntimeError):
    """Expose the retained journal when an experiment stops after its manifest is pinned."""

    def __init__(self, message: str, journal: Journal) -> None:
        super().__init__(message)
        self.journal = journal


def create_experiment(config: dict, output_root: Path = RUNS, parent: dict | None = None) -> Journal:
    """Pin a validated experiment and resolved instruction contract in a fresh journal."""
    resolved = resolve_config(config)
    manifest = {key: value for key, value in resolved.items() if key != "role_contract"}
    manifest.update(prompt_version=PROMPT_VERSION, executor_version=EXECUTOR_VERSION,
                    context_policy=CONTEXT_POLICY, fresh_context=True, response_reuse=False,
                    claim="Instruction manipulations in a model; no verified human competency or outcome.",
                    budget_semantics="Hard call-count bound; accepted JSON character bound, not provider token/cost cap.")
    pressure = manifest["config"]["environment"]["time_pressure"]
    manifest["environment_instruction"] = catalog()["time_pressure_options"][pressure]
    mode = "experimental-dry-run" if manifest["config"]["execution"]["provider"] == "dry-run" else "experimental-codex"
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + mode + "-" + uuid.uuid4().hex[:8]
    return Journal(Path(output_root) / run_id, manifest["config"]["seed"], mode, parent,
                   role_profiles=resolved["role_contract"], experiment=manifest)


def _provider(journal: Journal) -> Any:
    execution = journal.run["experiment"]["config"]["execution"]
    return DryRunProvider() if execution["provider"] == "dry-run" else CodexProvider(execution["model"])


def _record_turn(journal: Journal, provider: Any, actor: str, stage: str) -> dict:
    if (journal.path / "cancel.requested").exists():
        journal.append("cancelled", stage, actor, {"status": "cancelled", "note": "Stopped between calls at the user's request; earlier records retained."})
        raise RuntimeError("Experiment cancelled between calls")
    execution = journal.run["experiment"]["config"]["execution"]
    ordinal = sum(event["kind"] == "request" for event in journal.events) + 1
    if ordinal > execution["max_calls"]:
        raise ValueError("The configured call budget has been exhausted")
    prompt = experiment_prompt(journal, actor, stage)
    prompt_path = journal.path / f"prompt-{ordinal:03d}.txt"
    prompt_path.write_text(prompt)
    request = journal.append("request", stage, actor, {"prompt": prompt, "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest(),
                             "prompt_version": PROMPT_VERSION, "ordinal": ordinal, "prompt_file": prompt_path.name})
    response, metadata = None, None
    try:
        response, metadata = provider.call(actor, stage, prompt, journal.path, ordinal)
        (journal.path / f"experiment-response-{ordinal:03d}.json").write_text(json.dumps({"response": response, "provider": metadata}, indent=2))
        validate_response(response, len(journal.events))
        if len(canonical(response)) > execution["max_output_chars"]:
            raise ValueError("Response exceeds the configured accepted-output character limit")
        if actor == "orchestrator" and stage == "build" and not response["prototype_html"].strip():
            raise ValueError("Build record requires candidate HTML source; empty source is retained as failure")
        if (actor != "orchestrator" or stage != "build") and response["prototype_html"].strip():
            raise ValueError("Executable source belongs only to the coordinator's Build record")
        kind = "decision" if actor == "orchestrator" else "contribution"
        event = journal.append(kind, stage, actor, {"response": response, "provider": metadata, "request_seq": request["seq"],
                               "actor_id": journal.run["role_profiles"]["roles"][actor]["actor_id"], "technical_fixture": execution["provider"] == "dry-run"})
        if actor == "orchestrator":
            journal.artifact(stage, response, event["seq"])
        _record_iteration_request(journal, event)
        return event
    except Exception as error:
        journal.append("failure", stage, actor, {"message": str(error), "error_type": type(error).__name__,
                       "request_seq": request["seq"], "rejected_response": response, "provider": metadata})
        raise


def _record_iteration_request(journal: Journal, event: dict) -> None:
    target = event["payload"]["response"]["revisit_stage"]
    if target:
        journal.append("iteration_requested", event["stage"], event["agent"], {"target_stage": target,
                       "source_seq": event["seq"], "status": "recorded_not_executed",
                       "reason": "The matched schedule does not add unplanned calls. Use a separate configuration for another iteration."})


def _stage(journal: Journal, provider: Any, stage: str) -> None:
    manifest = journal.run["experiment"]
    journal.append("stage_started", stage, "orchestrator", {"status": "experimental_rehearsal", "human_approval": "not supplied"})
    for index, challenge in enumerate(manifest["config"]["challenges"]):
        if challenge["stage"] == stage:
            journal.append("challenge", stage, "scenario", {**challenge, "schedule_index": index,
                           "hypothetical": True, "source": "fixed experiment configuration", "timing": "before stage contributions"})
    for actor in manifest["schedule"][stage]:
        _record_turn(journal, provider, actor, stage)
    _record_turn(journal, provider, "orchestrator", stage)
    if stage == "deploy":
        journal.append("human_gate", stage, "human", {"status": "pending", "note": "No real participants, deployment, or authorization are represented by this rehearsal."})
    journal.append("stage_completed", stage, "orchestrator", {"status": "rehearsed"})


def execute_experiment(journal: Journal, provider: Any = None) -> Journal:
    """Run each planned contribution once and retain failures without fabricating completion."""
    # A replay or stopped record is immutable here; rejection must not append to it.
    verify(journal.run)
    if len(journal.events) != 1:
        raise ExperimentRunError("An experiment executes only from its fresh manifest; replay never resumes agents", journal)
    try:
        provider = provider if provider is not None else _provider(journal)
        execution = journal.run["experiment"]["config"]["execution"]
        for stage in STAGES[:STAGES.index(execution["through"]) + 1]:
            _stage(journal, provider, stage)
        status = "dry_run_completed" if execution["provider"] == "dry-run" else "awaiting_human_review"
        journal.append("completed", execution["through"], "orchestrator", {"status": status,
                       "through": execution["through"], "model_generated": execution["provider"] != "dry-run",
                       "evidence_status": "pipeline_check" if status == "dry_run_completed" else "unreviewed_model_records",
                       "human_outcomes_observed": False,
                       "claim": "Offline pipeline verification only." if status == "dry_run_completed" else "Model-generated artifacts await independent review; human outcomes remain unobserved."})
        verify(journal.run)
        return journal
    except Exception as error:
        if journal.events[-1]["kind"] not in ("failure", "cancelled"):
            journal.append("failure", journal.events[-1]["stage"], "orchestrator", {"message": str(error), "error_type": type(error).__name__})
        raise ExperimentRunError(str(error), journal) from error


def run_experiment(config: dict, output_root: Path = RUNS, provider: Any = None, parent: dict | None = None,
                   on_created: Callable[[Journal], None] | None = None) -> Journal:
    """Create and execute one independent configuration with an inspectable retained journal."""
    journal = create_experiment(config, output_root, parent)
    if on_created is not None:
        try:
            on_created(journal)
        except Exception as error:
            journal.append("failure", "understand", "orchestrator", {"message": str(error), "error_type": type(error).__name__, "phase": "created_record_callback"})
            raise ExperimentRunError(str(error), journal) from error
    return execute_experiment(journal, provider)


def main() -> None:
    """Run a supplied experiment file or the explicitly offline default from the command line."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", type=Path)
    parser.add_argument("--output-root", type=Path, default=RUNS)
    parser.add_argument("--export", type=Path)
    args = parser.parse_args()
    config = json.loads(args.config.read_text()) if args.config else default_config()
    try:
        journal = run_experiment(config, args.output_root)
    except ExperimentRunError as error:
        parser.exit(1, f"Experiment stopped; preserved at {error.journal.path}: {error}\n")
    if args.export:
        args.export.write_text(json.dumps(journal.run, indent=2, ensure_ascii=False))
    print(json.dumps({"run_id": journal.run["id"], "path": str(journal.path), "status": journal.events[-1]["payload"]["status"]}))


if __name__ == "__main__":
    main()
