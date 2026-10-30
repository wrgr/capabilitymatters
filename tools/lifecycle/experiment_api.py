"""Serve local experiment configuration, execution, and saved-record endpoints to the GUI."""
from __future__ import annotations

import json
import os
import re
import shutil
import threading
import traceback
from pathlib import Path
from types import ModuleType
from typing import Any

from experiment_config import catalog, default_config, resolve_config, validate_config, apply_study_preset
from experiment_contract import agent_contract
from experiment_outcomes import outcome_catalog
from experiment_runtime import create_experiment, execute_experiment, ExperimentRunError

SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,159}\Z")


def capabilities() -> dict:
    """Report execution availability without inspecting or exposing authentication material."""
    return {"codex_installed": shutil.which("codex") is not None,
            "live_enabled": os.environ.get("CAPABILITY_MATTERS_LIVE") == "1"}


def _identifier(value: str) -> str:
    if not SAFE_ID.fullmatch(value):
        raise ValueError("Invalid saved-record identifier")
    return value


def _body(handler: Any) -> dict:
    length = int(handler.headers.get("Content-Length", "0"))
    if not 0 < length <= 300000 or not handler.headers.get("Content-Type", "").startswith("application/json"):
        raise ValueError("A bounded JSON request is required")
    body = json.loads(handler.rfile.read(length))
    if not isinstance(body, dict):
        raise ValueError("Request must contain a JSON object")
    return body


def _list_runs(root: Path) -> list[dict]:
    result = []
    for path in sorted(root.glob("*/run.json"), reverse=True):
        try:
            run = json.loads(path.read_text())
            experiment = run.get("experiment")
            if experiment:
                last = run["events"][-1]
                status = last["payload"].get("status", last["kind"])
                result.append({"id": run["id"], "name": experiment["config"]["name"], "created_at": run["created_at"],
                               "mode": run["mode"], "status": status, "event_count": len(run["events"]),
                               "config_hash": experiment["config_hash"]})
        except (OSError, ValueError, KeyError, TypeError) as error:
            result.append({"id": path.parent.name, "status": "unreadable", "error": str(error)})
        if len(result) >= 100:
            break
    return result


def handle_get(handler: Any, root: Path) -> bool:
    """Return whether an experiment route was handled, preserving explicit read errors."""
    if not handler.path.startswith("/api/experiments/"):
        return False
    try:
        if handler.path == "/api/experiments/catalog":
            handler.send_json({"catalog": catalog(), "default_config": default_config(),
                               "outcome_catalog": outcome_catalog(), "agent_contract": agent_contract()})
        elif handler.path == "/api/experiments/runs":
            handler.send_json({"runs": _list_runs(root)})
        elif handler.path.startswith("/api/experiments/batches/"):
            batch_id = _identifier(handler.path.removeprefix("/api/experiments/batches/"))
            path = root / "batches" / batch_id / "manifest.json"
            if not path.exists():
                handler.send_json({"error": "Batch not found"}, 404)
            else:
                batch = json.loads(path.read_text())
                handler.send_json({**batch, "runs": batch["plans"]})
        else:
            handler.send_json({"error": "Unknown experiment operation"}, 404)
    except (ValueError, TypeError, KeyError) as error:
        handler.send_json({"error": str(error)}, 400)
    except OSError as error:
        handler.send_json({"error": str(error)}, 500)
    return True


def _check_provider(config: dict) -> None:
    if config["execution"]["provider"] == "codex":
        available = capabilities()
        if not available["codex_installed"]:
            raise ValueError("Codex CLI is not installed on this runner. Dry-run mode remains available.")
        if not available["live_enabled"]:
            raise ValueError("Start the local runner with CAPABILITY_MATTERS_LIVE=1 for live model execution.")


def _background(state: ModuleType, target: Any) -> None:
    try:
        target()
    except ExperimentRunError:
        # The runtime has already preserved the rejected response and failure in its journal.
        return
    except Exception:
        # Batch-level failures are checkpointed by execute_batch; retain the host traceback too.
        traceback.print_exc()
    finally:
        with state.LOCK:
            state.ACTIVE = None


def _cancel(handler: Any, state: ModuleType, body: dict) -> None:
    if set(body) != {"id"}:
        raise ValueError("Cancellation requires one saved run or batch id")
    run_id = _identifier(body["id"])
    with state.LOCK:
        if state.ACTIVE != run_id:
            return handler.send_json({"error": "That run or batch is not active"}, 409)
        batch = state.RUNS / "batches" / run_id
        folder = batch if batch.is_dir() else state.RUNS / run_id
        if not folder.is_dir():
            return handler.send_json({"error": "Active record is not yet available"}, 409)
        (folder / "cancel.requested").write_text("Requested through the local experiment GUI.\n")
    boundary = "after the current run" if batch.is_dir() else "between model calls"
    handler.send_json({"id": run_id, "status": "cancellation_requested", "boundary": boundary}, 202)


def _start_run(handler: Any, state: ModuleType, config: dict) -> None:
    with state.LOCK:
        if state.ACTIVE:
            handler.send_json({"error": "A run or batch is already active", "run_id": state.ACTIVE}, 409)
            return
        journal = create_experiment(config, state.RUNS)
        state.ACTIVE = journal.run["id"]
    threading.Thread(target=_background, args=(state, lambda: execute_experiment(journal)), daemon=True).start()
    handler.send_json({"run_id": journal.run["id"]}, 202)


def _start_batch(handler: Any, state: ModuleType, config: dict, matrix: bool, comparison: dict | None = None) -> None:
    from experiment_batch import prepare_batch, execute_batch
    with state.LOCK:
        if state.ACTIVE:
            handler.send_json({"error": "A run or batch is already active", "run_id": state.ACTIVE}, 409)
            return
        batch = prepare_batch(config, state.RUNS, matrix=matrix, comparison=comparison)
        state.ACTIVE = batch["batch_id"]
    threading.Thread(target=_background, args=(state, lambda: execute_batch(batch, state.RUNS)), daemon=True).start()
    handler.send_json({"batch_id": batch["batch_id"]}, 202)


def _preset(handler: Any, body: dict) -> None:
    if not {"config", "mode"} <= set(body) or set(body) - {"config", "mode", "competency", "persona_id"}:
        raise ValueError("A study preset requires config and mode with optional competency and persona_id")
    config = apply_study_preset(body["config"], body["mode"], body.get("competency", "measurement"),
                                body.get("persona_id", "generalist"))
    handler.send_json({"config": config, "resolved": resolve_config(config)})


def handle_post(handler: Any, state: ModuleType) -> None:
    """Process same-origin experiment requests after the host enforces its origin boundary."""
    try:
        body = _body(handler)
        if handler.path == "/api/experiments/cancel":
            return _cancel(handler, state, body)
        if handler.path == "/api/experiments/presets":
            return _preset(handler, body)
        if handler.path == "/api/experiments/resolve":
            if set(body) != {"config"}:
                raise ValueError("Resolve requires only a config object")
            return handler.send_json(resolve_config(body["config"]))
        if handler.path not in ("/api/experiments/runs", "/api/experiments/batches"):
            return handler.send_json({"error": "Unknown experiment operation"}, 404)
        allowed = {"config", "matrix", "comparison"} if handler.path.endswith("/batches") else {"config"}
        if "config" not in body or set(body) - allowed:
            raise ValueError("Unexpected experiment request fields")
        if "comparison" in body and ("matrix" in body or not isinstance(body["comparison"], dict)):
            raise ValueError("Use one comparison object or the legacy matrix flag, not both")
        config = validate_config(body["config"])
        _check_provider(config)
        if handler.path.endswith("/runs"):
            return _start_run(handler, state, config)
        matrix = body.get("matrix", True)
        if type(matrix) is not bool:
            raise ValueError("matrix must be true or false")
        _start_batch(handler, state, config, matrix, body.get("comparison"))
    except (ValueError, TypeError, KeyError, RuntimeError) as error:
        handler.send_json({"error": str(error)}, 400)
    except OSError as error:
        handler.send_json({"error": str(error)}, 500)
