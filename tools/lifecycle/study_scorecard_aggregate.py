"""Summarize frozen raw evidence ratings and reviewer disagreement without generating modeled probabilities."""
from __future__ import annotations

import csv
import io
from pathlib import Path
import statistics

from experiment_records import identifier, read_record, write_immutable
from scorecard_contract import AXES, CRITERIA, stable_hash
from study_reviewer import read_review_result


def _axis(review: dict, axis: str) -> float | None:
    scores = [review["ratings"][key]["score"] for key, spec in CRITERIA.items() if spec[0] == axis]
    return round(25 * statistics.fmean(scores), 6) if all(score is not None for score in scores) else None


def _spread(values: list) -> dict:
    known = [value for value in values if value is not None]
    return {"expected_count": len(values), "observed_count": len(known), "unknown_count": len(values) - len(known),
            "mean": round(statistics.fmean(known), 6) if known else None,
            "sd": round(statistics.stdev(known), 6) if len(known) > 1 else None,
            "minimum": min(known) if known else None, "maximum": max(known) if known else None}


def _unknown_review(reviewer_id: str, model: str) -> dict:
    return {"status": "failed_attempt_unknown", "reviewer": {"id": reviewer_id, "kind": "model", "model": model},
            "ratings": {key: {"score": None, "lower": None, "upper": None, "evidence_refs": []} for key in CRITERIA},
            "origin": "Explicit missing-value marker after an invalid model response; not a model-authored rating."}


def _freeze_reviews(output: Path, protocol: dict) -> tuple[dict, dict]:
    reviews, records = {}, []
    for job in protocol["jobs"]:
        packet_id = identifier(job["packet_id"])
        packet = read_record(output / "packets" / (packet_id + ".json"))
        result = read_review_result(output / "reviews" / identifier(job["job_id"]), packet,
                                    job["reviewer_id"], protocol["model"])
        if result["job_id"] != job["job_id"] or result["reasoning_effort"] != protocol["reasoning_effort"]:
            raise ValueError("Reviewer effort differs from the pinned protocol")
        review = result["review"] if result["status"] == "accepted" else _unknown_review(job["reviewer_id"], protocol["model"])
        reviews.setdefault(packet_id, []).append(review)
        records.append({"job_id": job["job_id"], "result_hash": result["content_hash"],
                        "review_hash": stable_hash(result["review"]), "status": result["status"], "packet_hash": packet["packet_hash"]})
    if any(len(value) != 2 or {review["reviewer"]["id"] for review in value} != {"reviewer-1", "reviewer-2"}
           for value in reviews.values()):
        raise ValueError("Every candidate requires its two distinct retained review attempts before reveal")
    boundary = {"schema_version": 1, "protocol_hash": protocol["protocol_hash"],
                "private_manifest_hash": protocol["private_manifest_hash"], "records": records,
                "simulated_probabilities": False}
    boundary["freeze_hash"] = stable_hash(boundary)
    # The complete review set is fixed before the private condition mapping is read.
    write_immutable(output / "freeze.json", boundary)
    return reviews, boundary


def _candidate(packet: dict, mapping: dict, reviews: list[dict]) -> dict:
    reviews = sorted(reviews, key=lambda review: review["reviewer"]["id"])
    ratings, disagreement = {}, {}
    for key in CRITERIA:
        scores = [review["ratings"][key]["score"] for review in reviews]
        ratings[key] = {"reviewer_scores": scores, "mean_rating": statistics.fmean(scores) if None not in scores else None,
                        "unknown_reviews": sum(score is None for score in scores)}
        disagreement[key] = abs(scores[0] - scores[1]) if None not in scores else None
    axes = {}
    for axis in AXES:
        values = [_axis(review, axis) for review in reviews]
        axes[axis] = {"reviewer_indices": values,
                      "mean_index": round(statistics.fmean(values), 6) if None not in values else None,
                      "absolute_reviewer_difference": round(abs(values[0] - values[1]), 6) if None not in values else None}
    stratum = {"scenario_id": packet["scenario"]["id"], "scenario_hash": stable_hash(packet["scenario"]),
               "task_hash": stable_hash(packet["task"]), "rubric_hash": stable_hash(packet["rubric"]),
               "evaluation_scope": packet["evaluation_scope"]}
    return {**mapping, "stratum": stratum, "ratings": ratings, "axes": axes,
            "absolute_criterion_disagreement": disagreement,
            "review_statuses": [review["status"] for review in reviews],
            "exact_quote_count": sum(len(rating["evidence_refs"]) for review in reviews for rating in review["ratings"].values())}


def _groups(candidates: list[dict]) -> list[dict]:
    groups = {}
    for candidate in candidates:
        group_key = {**candidate["stratum"], "condition": candidate["condition"]}
        group = groups.setdefault(stable_hash(group_key), {**group_key, "candidates": []})
        group["candidates"].append(candidate)
    result = []
    for group in groups.values():
        rows = group.pop("candidates")
        result.append({**group, "candidate_count": len(rows),
                       "axes": {axis: _spread([row["axes"][axis]["mean_index"] for row in rows]) for axis in AXES}})
    return result


def _contrasts(groups: list[dict]) -> list[dict]:
    result = []
    for baseline in groups:
        if not baseline["condition"].startswith("full-team-"):
            continue
        for target in groups:
            matching = ("scenario_hash", "task_hash", "rubric_hash", "evaluation_scope")
            if target is baseline or any(target[key] != baseline[key] for key in matching):
                continue
            axes = {}
            for axis in AXES:
                a, b = baseline["axes"][axis], target["axes"][axis]
                axes[axis] = {"baseline_observed_candidates": a["observed_count"], "target_observed_candidates": b["observed_count"],
                              "mean_difference_target_minus_baseline": round(b["mean"] - a["mean"], 6)
                              if a["mean"] is not None and b["mean"] is not None else None}
            result.append({"baseline": baseline["condition"], "target": target["condition"], "axes": axes,
                           "interpretation": "Descriptive difference of raw rubric indices; no probability, causal human effect, or population inference."})
    return result


def _raw_csv(output: Path, candidates: list[dict], reviews: dict) -> None:
    stream = io.StringIO(newline="")
    writer = csv.writer(stream)
    writer.writerow(["packet_id", "run_id", "condition", "replicate", "reviewer_id", "review_status", "criterion", "score", "lower", "upper", "exact_quote_count"])
    for candidate in candidates:
        for review in sorted(reviews[candidate["packet_id"]], key=lambda item: item["reviewer"]["id"]):
            for key, rating in review["ratings"].items():
                writer.writerow([candidate["packet_id"], candidate["run_id"], candidate["condition"], candidate["replicate"],
                                 review["reviewer"]["id"], review["status"], key, rating["score"], rating["lower"], rating["upper"], len(rating["evidence_refs"])])
    path, value = output / "raw-ratings.csv", stream.getvalue()
    if path.exists() and path.read_text() != value.replace("\r\n", "\n"):
        raise ValueError("Raw rating export differs from the frozen result")
    if not path.exists():
        path.write_text(value, encoding="utf-8")


def aggregate_study(output: Path, protocol: dict) -> dict:
    """Freeze all review attempts, reveal assignments, and retain raw indices with explicit missingness."""
    reviews, boundary = _freeze_reviews(output, protocol)
    private = read_record(output / "private" / "assignment-key.json")
    actual = stable_hash({key: value for key, value in private.items() if key != "manifest_hash"})
    if actual != private["manifest_hash"] or actual != protocol["private_manifest_hash"]:
        raise ValueError("Assignment map differs from the prepared set")
    if {item["packet_id"] for item in private["mappings"]} != set(reviews):
        raise ValueError("Reveal must include the entire original candidate set")
    candidates = []
    for mapping in private["mappings"]:
        packet = read_record(output / "packets" / (identifier(mapping["packet_id"]) + ".json"))
        if packet["packet_hash"] != mapping["packet_hash"]:
            raise ValueError("Assignment mapping targets different evidence")
        candidates.append(_candidate(packet, mapping, reviews[packet["id"]]))
    groups = _groups(candidates)
    differences = [value for row in candidates for value in row["absolute_criterion_disagreement"].values()]
    summary = {"schema_version": 1, "status": "reviewed_and_revealed", "protocol_hash": protocol["protocol_hash"],
               "freeze_hash": boundary["freeze_hash"], "model": protocol["model"], "reasoning_effort": protocol["reasoning_effort"],
               "planned_candidates": protocol["planned_candidates"], "review_count": sum(map(len, reviews.values())),
               "accepted_review_count": sum(item["status"] == "accepted" for item in boundary["records"]),
               "failed_review_count": sum(item["status"] == "failed" for item in boundary["records"]),
               "candidates": candidates, "excluded_candidates": private["exclusions"], "condition_groups": groups,
               "contrasts": _contrasts(groups), "absolute_criterion_disagreement": _spread(differences),
               "simulated_probabilities": False, "human_outcomes_observed": False,
               "limits": ["Two independent calls to the same model are repeated model judgments, not independent human raters.",
                          "An axis remains unknown if either reviewer lacks any of its three criterion ratings.",
                          "Invalid review attempts remain retained and unknown; they are not silently retried or treated as zero scores.",
                          "An exact citation establishes traceability, not correctness of a judgment.",
                          "Executable observations concern the retained Build; generated plans and proposed repairs are not implemented behavior.",
                          "Replicate spread is descriptive; model calls, rubric criteria and repeated reviews are not additional generated candidates."]}
    summary["summary_hash"] = stable_hash(summary)
    write_immutable(output / "summary.json", summary)
    _raw_csv(output, candidates, reviews)
    return summary
