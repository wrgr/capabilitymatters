"""Run additive dynamic Flower conversations through explicit local commands without a hosted service."""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from dynamic_contract import CATALOG, load_catalog, make_config, require
from dynamic_evaluator import accept_evaluation, request_evaluation
from dynamic_journal import atomic_json, create, load
from dynamic_provider import CodexProvider, ProviderAlreadyInvoked
from dynamic_runtime import accept_turn, fail_request, freeze, observe, request_turn
from dynamic_state import pending_request, snapshot


def _read(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def parser() -> argparse.ArgumentParser:
    """Expose configuration, dialogue, freezing, observations, and expert review as separate actions."""
    result = argparse.ArgumentParser(description=__doc__)
    sub = result.add_subparsers(dest="command", required=True)
    config = sub.add_parser("config", help="Export editable catalog defaults")
    config.add_argument("--catalog", type=Path, default=CATALOG)
    config.add_argument("--case", required=True)
    config.add_argument("--condition", required=True)
    config.add_argument("--output", type=Path, required=True)
    new = sub.add_parser("create", help="Pin exact inputs in a new directory")
    new.add_argument("--catalog", type=Path, default=CATALOG)
    new.add_argument("--config", type=Path, required=True)
    new.add_argument("--output", type=Path, required=True)
    new.add_argument("--mode", choices=["manual", "fixture", "live"], default="manual")
    for command in ("prompt", "advance", "run", "inspect", "freeze", "observe", "evaluate"):
        child = sub.add_parser(command)
        child.add_argument("--run", type=Path, required=True)
        if command in {"advance", "evaluate", "run"}:
            child.add_argument("--response", type=Path)
            child.add_argument("--provider", choices=["codex"])
            child.add_argument("--model")
            child.add_argument("--executable", default="codex")
            child.add_argument("--effort", choices=["low", "medium", "high", "xhigh"], default="low")
        if command == "run":
            child.add_argument("--max-calls", type=int, required=True)
        if command == "evaluate":
            child.add_argument("--scenario")
        if command == "freeze":
            child.add_argument("--accept-risk", action="append", default=[])
            child.add_argument("--reason", default="")
        if command == "observe":
            child.add_argument("--evidence", type=Path, required=True)
    return result


def _provider_response(args: argparse.Namespace, request: dict) -> tuple[dict, dict | None]:
    require(bool(args.response) != bool(args.provider), "Choose exactly one supplied response or live provider")
    if args.response:
        return _read(args.response), None
    run = load(args.run)
    require(run["mode"] == "live", "Live calls require a run explicitly created with --mode live")
    require(bool(args.model), "Specify --model for live execution")
    return CodexProvider(args.model, executable=args.executable, effort=args.effort).call(args.run, request)


def _advance(args: argparse.Namespace, evaluation: bool = False) -> dict:
    run = load(args.run)
    request = pending_request(run)
    if request is None:
        request = request_evaluation(args.run, args.scenario) if evaluation else request_turn(args.run)
    require(request["payload"]["purpose"] == ("evaluation" if evaluation else "conversation"), "Pending request has a different purpose")
    if evaluation:
        require(request["payload"]["scenario_id"] == args.scenario, "Pending expert request targets a different scenario")
    try:
        response, provenance = _provider_response(args, request)
    except ProviderAlreadyInvoked:
        raise
    except (ValueError, OSError, RuntimeError, subprocess.SubprocessError) as error:
        fail_request(args.run, str(error))
        raise
    return accept_evaluation(args.run, response, provenance) if evaluation else accept_turn(args.run, response, provenance)


def dispatch(args: argparse.Namespace) -> dict:
    """Execute only the explicitly selected operation and return its retained identity."""
    if args.command == "config":
        require(not args.output.exists(), "Refusing to overwrite an existing configuration")
        config = make_config(load_catalog(args.catalog), args.case, args.condition)
        atomic_json(args.output, config)
        return {"configuration": str(args.output), "id": config["id"]}
    if args.command == "create":
        run = create(args.output, _read(args.config), load_catalog(args.catalog), args.mode)
        return {"run": str(args.output), "id": run["id"], "config_sha256": run["config_sha256"]}
    if args.command == "inspect":
        return snapshot(load(args.run))
    if args.command == "prompt":
        request = request_turn(args.run)
        return {"request": request, "prompt": (args.run / request["payload"]["prompt_file"]).read_text(encoding="utf-8")}
    if args.command in {"advance", "evaluate"}:
        return _advance(args, args.command == "evaluate")
    if args.command == "freeze":
        return freeze(args.run, args.accept_risk, args.reason)
    if args.command == "observe":
        return observe(args.run, _read(args.evidence))
    require(args.provider and not args.response and 1 <= args.max_calls <= 400, "run requires --provider and a finite --max-calls (1–400)")
    events = []
    for _ in range(args.max_calls):
        try:
            events.append(_advance(args))
        except ValueError as error:
            return {"accepted_messages": len(events), "stopped": str(error), "state": snapshot(load(args.run))}
    return {"accepted_messages": len(events), "stopped": "explicit_dispatch_limit", "state": snapshot(load(args.run))}


def main() -> int:
    """Print one machine-readable outcome and fail explicitly on invalid local commands."""
    args = parser().parse_args()
    try:
        value = dispatch(args)
    except (ValueError, KeyError, OSError) as error:
        print(json.dumps({"error": str(error)}, ensure_ascii=False))
        return 1
    print(json.dumps(value, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
