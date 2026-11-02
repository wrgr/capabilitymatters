"""Prepare and execute a fixed masked review study without invoking simulated outcome probabilities."""
from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from pathlib import Path
import random
import secrets

from engine import verify
from experiment_records import identifier, read_record, write_immutable
from experiment_scenarios import get_scenario
from scorecard_blind import build_blind_packet, validate_packet
from scorecard_contract import stable_hash
from study_reviewer import file_hash, run_model_review

SOURCE_FILES = ("study_scorecard.py", "study_reviewer.py", "study_scorecard_aggregate.py",
                "scorecard_blind.py", "scorecard_solution.py", "scorecard_contract.py")
STOPPED = {"completed", "failed", "cancelled", "skipped"}


def _source_hashes() -> dict:
    return {name: file_hash(Path(__file__).parent / name) for name in SOURCE_FILES}


def load_protocol(output: Path) -> dict:
    """Verify the prospective packet set and scoring source versions before any review action."""
    protocol = read_record(output / "protocol.json")
    if protocol["protocol_hash"] != stable_hash({k: v for k, v in protocol.items() if k != "protocol_hash"}):
        raise ValueError("Review protocol hash differs")
    if protocol["source_files"] != _source_hashes():
        raise ValueError("Scoring source changed after preparation; retain the pinned source version")
    if protocol["simulated_probabilities"] is not False or protocol["reviewers_per_candidate"] != 2:
        raise ValueError("This protocol requires two independent reviews and no probability simulation")
    if protocol["maximum_review_invocations"] != 30 or not 1 <= len(protocol["jobs"]) <= 30:
        raise ValueError("The study has a hard maximum of thirty review invocations")
    pairs = [(job["packet_id"], job["reviewer_id"]) for job in protocol["jobs"]]
    if len(pairs) != len(set(pairs)) or len({job["job_id"] for job in protocol["jobs"]}) != len(pairs):
        raise ValueError("Review jobs and candidate/reviewer pairs must be unique")
    for packet_id, digest in protocol["packet_hashes"].items():
        packet = validate_packet(read_record(output / "packets" / (identifier(packet_id) + ".json")))
        if packet["packet_hash"] != digest:
            raise ValueError("Prepared evidence packet changed")
    return protocol


def _observations(root: Path, run: dict, artifact: dict, condition: str) -> tuple[list, str]:
    path = root / identifier(run["id"]) / "observations.json"
    report = read_record(path)
    if report.get("run_id", run["id"]) != run["id"] or report.get("run_head_hash", run["events"][-1]["hash"]) != run["events"][-1]["hash"]:
        raise ValueError("Browser observation provenance refers to a different run or journal head")
    import hashlib
    source_hash = hashlib.sha256(artifact["payload"]["content"]["prototype_html"].encode()).hexdigest()
    if report.get("source_sha256") != source_hash or report.get("build_content_hash") != artifact["payload"]["content_hash"]:
        raise ValueError("Browser observations must bind to the exact retained Build and HTML bytes")
    observations = report.get("observations")
    if not isinstance(observations, list) or not 1 <= len(observations) <= 30:
        raise ValueError("Provide one to thirty actual observation records, including failed checks and limits")
    for item in observations:
        if not isinstance(item, dict) or set(item) != {"text"} or not isinstance(item["text"], str):
            raise ValueError("Each reviewer-facing observation must contain only text")
        if run["id"] in item["text"] or condition in item["text"]:
            raise ValueError("Reviewer-facing observations must omit run identities and treatment labels")
    return observations, file_hash(path)


def _candidate(root: Path, qa_root: Path, item: dict, scenario: dict) -> tuple[dict | None, dict]:
    if item["status"] != "completed":
        return None, {"item_id": item["item_id"], "condition": item["condition"], "run_id": item.get("run_id"),
                      "reason": "Generation did not complete; retained as a generation failure or cancellation, not given an invented artifact rating"}
    if not item.get("run_id"):
        return None, {"item_id": item["item_id"], "condition": item["condition"], "reason": "No executed run identity"}
    run = read_record(root / identifier(item["run_id"]) / "run.json")
    verify(run)
    if run["id"] != item["run_id"] or run["experiment"]["config_hash"] != item["config_hash"]:
        raise ValueError("Batch item and retained run differ")
    if item.get("run_head_hash") != run["events"][-1]["hash"]:
        raise ValueError("Batch head differs from the stopped run")
    config = run["experiment"]["config"]
    if config.get("outcomes", {}).get("enabled") or any(e["kind"] == "outcome_assessment" for e in run["events"]):
        raise ValueError("Evidence-only study runs must not contain enabled simulated outcomes")
    if any(config[key] != scenario[key] for key in ("seed", "environment", "challenges")):
        raise ValueError("Run does not match the declared scenario")
    artifacts = [e for e in run["events"] if e["kind"] == "artifact" and e["stage"] == "build"]
    if not artifacts:
        return None, {"item_id": item["item_id"], "run_id": run["id"], "condition": item["condition"],
                      "reason": "Run stopped without a retained executable Build; no artifact rating invented"}
    observations, report_hash = _observations(qa_root, run, artifacts[-1], item["condition"])
    packet, mapping = build_blind_packet(run, scenario, observations, evaluation_scope="full_solution")
    mapping.update(condition=item["condition"], replicate=item["replicate"], item_id=item["item_id"],
                   run_status=item["status"], run_mode=run["mode"], observation_report_sha256=report_hash)
    return packet, mapping


def prepare_study(runs_root: Path, batch_path: Path, observations_root: Path, output: Path,
                  scenario_id: str, model: str = "gpt-6.1-sol", effort: str = "low", order_seed: int | None = None) -> dict:
    """Pin every stopped candidate, its actual observations, and two shuffled opaque review jobs."""
    if output.exists() and any(output.iterdir()):
        raise ValueError("Prepare into a new directory so the evidence set cannot be silently replaced")
    batch, scenario = read_record(batch_path), get_scenario(scenario_id)
    if not batch.get("plans") or any(item["status"] not in STOPPED for item in batch["plans"]):
        raise ValueError("Every planned run must stop before preparing the complete review set")
    run_ids = [item["run_id"] for item in batch["plans"] if item.get("run_id")]
    if len(run_ids) != len(set(run_ids)):
        raise ValueError("Repeated references to one run cannot create additional generated candidates")
    packets, mappings, exclusions = [], [], []
    for item in batch["plans"]:
        packet, mapping = _candidate(runs_root, observations_root, item, scenario)
        if packet is None:
            exclusions.append(mapping)
        else:
            packets.append(packet)
            mappings.append(mapping)
    if not packets:
        raise ValueError("No retained Build artifacts are available for review; retain the batch failures")
    if len(packets) > 15:
        raise ValueError("Two reviews per candidate must fit the hard thirty-invocation study maximum")
    seed = secrets.randbits(32) if order_seed is None else order_seed
    jobs = [{"packet_id": p["id"], "reviewer_id": f"reviewer-{reviewer}"} for reviewer in (1, 2) for p in packets]
    random.Random(seed).shuffle(jobs)
    jobs = [{"job_id": f"review-{i:03d}", **job} for i, job in enumerate(jobs, 1)]
    private = {"schema_version": 1, "batch_id": batch["id"], "mappings": mappings, "exclusions": exclusions}
    private["manifest_hash"] = stable_hash(private)
    protocol = {"schema_version": 1, "evaluation_scope": "full_solution", "scenario_id": scenario_id,
                "batch_sha256": file_hash(batch_path), "source_files": _source_hashes(),
                "model": model, "reasoning_effort": effort, "reviewers_per_candidate": 2,
                "maximum_review_invocations": 30,
                "simulated_probabilities": False, "review_order_seed": seed, "jobs": jobs,
                "planned_candidates": len(batch["plans"]), "reviewable_candidates": len(packets),
                "excluded_candidates": len(exclusions), "private_manifest_hash": private["manifest_hash"],
                "packet_hashes": {p["id"]: p["packet_hash"] for p in packets},
                "retry_policy": "One attempt per review job; failures are retained, with no automatic rerating or selection.",
                "aggregation": "Raw 0–4 ratings; equal-weight axis indices; all unknowns retained; descriptive replicate spread and reviewer disagreement only."}
    protocol["protocol_hash"] = stable_hash(protocol)
    for packet in packets:
        write_immutable(output / "packets" / (packet["id"] + ".json"), packet)
    write_immutable(output / "private" / "assignment-key.json", private)
    write_immutable(output / "protocol.json", protocol)
    return protocol


def _review_job(output: Path, protocol: dict, job: dict, executable: str, timeout: int) -> dict:
    packet = read_record(output / "packets" / (identifier(job["packet_id"]) + ".json"))
    folder = output / "reviews" / identifier(job["job_id"])
    return run_model_review(packet, job, folder, protocol["model"], protocol["reasoning_effort"], executable, timeout)


def review_study(output: Path, executable: str, execute: bool = False, timeout: int = 240, workers: int = 5) -> dict:
    """Run the pinned review order only when execution is explicitly requested."""
    protocol = load_protocol(output)
    if type(workers) is not int or not 1 <= workers <= 5:
        raise ValueError("Use one to five concurrent reviewer workers")
    if not execute:
        return {"status": "prepared_not_executed", "jobs": len(protocol["jobs"]),
                "model": protocol["model"], "reasoning_effort": protocol["reasoning_effort"], "workers": workers}
    write_immutable(output / "dispatch.json", {"protocol_hash": protocol["protocol_hash"], "workers": workers,
                    "submitted_order": [job["job_id"] for job in protocol["jobs"]]})
    results = []
    with ThreadPoolExecutor(max_workers=workers) as executor:
        # Submission follows the prospectively shuffled order; completion order is recorded separately.
        futures = [executor.submit(_review_job, output, protocol, job, executable, timeout) for job in protocol["jobs"]]
        for future in as_completed(futures):
            result = future.result()
            results.append(result)
            print(json.dumps({"job_id": result["job_id"], "status": result["status"]}), flush=True)
    accepted = sum(result["status"] == "accepted" for result in results)
    return {"status": "reviews_complete" if accepted == len(results) else "reviews_incomplete",
            "accepted_reviews": accepted, "attempted_reviews": len(results), "simulated_probabilities": False}


def main() -> None:
    """Expose explicit preparation, restricted review execution, and raw-result aggregation commands."""
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="operation", required=True)
    prepare = sub.add_parser("prepare")
    for option in ("runs-root", "batch", "observations-root", "output"):
        prepare.add_argument("--" + option, type=Path, required=True)
    prepare.add_argument("--scenario", required=True)
    prepare.add_argument("--model", default="gpt-6.1-sol")
    prepare.add_argument("--reasoning-effort", choices=("low", "medium", "high"), default="low")
    prepare.add_argument("--order-seed", type=int)
    review = sub.add_parser("review")
    review.add_argument("--output", type=Path, required=True)
    review.add_argument("--codex-executable", default="codex")
    review.add_argument("--timeout", type=int, default=240)
    review.add_argument("--workers", type=int, choices=range(1, 6), default=5)
    review.add_argument("--execute", action="store_true")
    aggregate = sub.add_parser("aggregate")
    aggregate.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.operation == "prepare":
        value = prepare_study(args.runs_root, args.batch, args.observations_root, args.output,
                              args.scenario, args.model, args.reasoning_effort, args.order_seed)
        value = {"status": "prepared_not_executed", "candidates": value["reviewable_candidates"], "jobs": len(value["jobs"])}
    elif args.operation == "review":
        value = review_study(args.output, args.codex_executable, args.execute, args.timeout, args.workers)
    else:
        from study_scorecard_aggregate import aggregate_study
        value = aggregate_study(args.output, load_protocol(args.output))
        value = {"status": value["status"], "candidates": len(value["candidates"]), "simulated_probabilities": False}
    print(json.dumps(value, indent=2))


if __name__ == "__main__":
    main()
