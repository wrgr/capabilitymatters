"""Freeze blind evidence scorecards before assignment reveal and summarize scenario-stratified comparisons."""
from __future__ import annotations

import copy
import hashlib
from pathlib import Path
import statistics
import uuid
from typing import Any

from scorecard_blind import build_blind_packet, blind_review_prompt, review_template, validate_packet, validate_review
from scorecard_contract import AXES, CRITERIA, default_settings, exact_fields, number, scorecard_catalog, stable_hash, text, validate_settings
from scorecard_sampling import conditional_samples, paired_difference, summarize_samples


def settings_for_packet(packet: dict) -> dict:
    """Use the scenario's declared targets unless the operator explicitly pins other settings."""
    p = validate_packet(packet)
    settings = default_settings()
    settings["thresholds"] = copy.deepcopy(p["scenario"]["axis_targets"])
    return settings


def _model_hash() -> str:
    root = Path(__file__).parent
    names = ("scorecard_contract.py", "scorecard_blind.py", "scorecard_sampling.py", "experiment_scorecard.py")
    return stable_hash({"catalog": scorecard_catalog(), "sources": {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in names}})


def assess_packet(packet: dict, review: dict, settings: dict | None = None) -> dict:
    """Assess a blinded evidence profile under pinned hypothetical conditions, without assignment inputs."""
    p = validate_packet(packet)
    r = validate_review(review, p)
    s = validate_settings(settings_for_packet(p) if settings is None else settings)
    missing = [key for key in CRITERIA if r["ratings"][key]["score"] is None]
    result = {"schema_version": 1, "model_id": "blind-scorecard-v1", "model_hash": _model_hash(),
              "packet_id": p["id"], "packet_hash": p["packet_hash"], "review_hash": stable_hash(r),
              "settings_hash": stable_hash(s), "scenario": copy.deepcopy(p["scenario"]),
              "status": "incomplete" if missing else "complete", "missing_criteria": missing,
              "axes": None, "joint": None, "samples": None, "calibration": s["calibration"],
              "basis": "Blind evidence ratings propagated through an explicit, uncalibrated rubric-index sensitivity model.",
              "human_outcomes_observed": False, "independent_empirical_sample_size": 0,
              "modeled_draws": s["draws"], "modeled_cohort_size": s["cohort_size"],
              "interval_meaning": "Modeled 5th–95th percentile interval; not a confidence interval for human outcomes.",
              "variance_sources": scorecard_catalog()["variance_sources"],
              "blinding": copy.deepcopy(p["blinding"]), "reviewer_kind": r["reviewer"]["kind"]}
    if not missing:
        samples = conditional_samples(p, r, s)
        result["axes"], result["joint"] = summarize_samples(samples, r, s)
        result["samples"] = samples
    return result


def freeze_review(packet: dict, review: dict, settings: dict | None = None) -> dict:
    """Freeze an evidence profile and its conditional assessment for a store-enforced blind workflow."""
    p = validate_packet(packet)
    r = validate_review(review, p)
    s = validate_settings(settings_for_packet(p) if settings is None else settings)
    record = {"schema_version": 1, "id": "scorecard-" + uuid.uuid4().hex[:16],
              "packet_id": p["id"], "packet_hash": p["packet_hash"], "review_hash": stable_hash(r),
              "settings_hash": stable_hash(s), "packet": p, "review": r, "settings": s,
              "assessment": assess_packet(p, r, s), "locked_before_unblinding": True}
    record["record_hash"] = stable_hash(record)
    return record


def _check_samples(assessment: dict, settings: dict) -> None:
    samples = exact_fields(assessment["samples"], {"axes", "gates", "person_pass", "joint", "person_joint"}, "conditional samples")
    for group in ("axes", "gates", "person_pass"):
        exact_fields(samples[group], set(AXES), "sample axes")
        for values in samples[group].values():
            if not isinstance(values, list) or len(values) != settings["draws"]:
                raise ValueError("Conditional sample count differs from pinned settings")
            for value in values:
                if group == "gates":
                    if type(value) is not bool:
                        raise ValueError("Criterion gates must be booleans")
                else:
                    number(value, 0, 100 if group == "axes" else 1, "sample value")
    for group in ("joint", "person_joint"):
        values = samples[group]
        if not isinstance(values, list) or len(values) != settings["draws"]:
            raise ValueError("Joint sample count differs from pinned settings")
        for value in values:
            if group == "joint" and type(value) is not bool:
                raise ValueError("Joint pass samples must be booleans")
            if group == "person_joint":
                number(value, 0, 1, "person joint sample")


def validate_frozen(value: Any, packet: dict | None = None) -> dict:
    """Validate provenance and exactly replay an embedded packet under its frozen settings."""
    fields = {"schema_version", "id", "packet_id", "packet_hash", "review_hash", "settings_hash", "packet", "review", "settings", "assessment", "locked_before_unblinding", "record_hash"}
    r = exact_fields(value, fields, "frozen scorecard")
    if type(r["schema_version"]) is not int or r["schema_version"] != 1 or r["locked_before_unblinding"] is not True:
        raise ValueError("Unsupported or unfrozen scorecard")
    if r["record_hash"] != stable_hash({key: item for key, item in r.items() if key != "record_hash"}):
        raise ValueError("Frozen scorecard hash mismatch")
    text(r["id"], 100, "scorecard id")
    p = validate_packet(r["packet"])
    if packet is not None and validate_packet(packet) != p:
        raise ValueError("Supplied packet differs from the frozen packet")
    if r["packet_id"] != p["id"] or r["packet_hash"] != p["packet_hash"]:
        raise ValueError("Frozen packet identity or hash mismatch")
    s = validate_settings(r["settings"])
    review = validate_review(r["review"], p)
    if review != r["review"] or r["review_hash"] != stable_hash(review) or r["settings_hash"] != stable_hash(s):
        raise ValueError("Frozen review or settings hash mismatch")
    assessment = r["assessment"]
    for key in ("packet_id", "packet_hash", "review_hash", "settings_hash"):
        if assessment.get(key) != r[key]:
            raise ValueError("Assessment provenance differs from frozen record")
    if assessment.get("status") == "complete":
        _check_samples(assessment, s)
        axes, joint = summarize_samples(assessment["samples"], r["review"], s)
        if assessment["axes"] != axes or assessment["joint"] != joint:
            raise ValueError("Frozen summaries differ from retained conditional samples")
    elif assessment.get("status") != "incomplete" or any(assessment.get(k) is not None for k in ("axes", "joint", "samples")):
        raise ValueError("Incomplete scorecards cannot contain fabricated probabilities")
    if assessment != assess_packet(p, review, s):
        raise ValueError("Frozen assessment differs from deterministic replay or this model version")
    return r


def compare_frozen(baseline: dict, target: dict) -> dict:
    """Compare only identically configured scorecards within one scenario stratum."""
    before, after = validate_frozen(baseline), validate_frozen(target)
    if before["settings_hash"] != after["settings_hash"]:
        raise ValueError("Paired comparison requires identical thresholds, floors, and simulation assumptions")
    a, b = before["assessment"], after["assessment"]
    if a["model_hash"] != b["model_hash"] or a["scenario"] != b["scenario"] or before["review"]["rubric_hash"] != after["review"]["rubric_hash"]:
        raise ValueError("Paired comparison requires the same scenario, rubric, and model version")
    if before["packet"]["task"] != after["packet"]["task"]:
        raise ValueError("Paired comparison requires identical task and environmental constraints")
    result = {"schema_version": 1, "baseline_id": before["id"], "target_id": after["id"],
              "scenario_id": a["scenario"]["id"], "status": "incomplete", "axes": None,
              "pairing": "Person and context draws shared; evidence-rating uncertainty and optional residual team sensitivity independently sampled.",
              "interpretation": "Conditional model contrast, not a causal human effect or an independent-sample statistical test."}
    if a["status"] == b["status"] == "complete":
        result.update(status="complete", **paired_difference(a, b, before["settings"]))
    return result


def _group_summary(rows: list[dict]) -> dict:
    complete = [row for row in rows if row["assessment"]["status"] == "complete"]
    # Multiple reviews of one generated artifact do not create additional team replications.
    candidates: dict[tuple, list] = {}
    for row in complete:
        key = (row["run_id"], row["artifact_hash"])
        candidates.setdefault(key, []).append(row["assessment"])
    axes = {}
    for axis in AXES:
        means = [statistics.fmean(a["axes"][axis]["mean"] for a in values) for values in candidates.values()]
        axes[axis] = {"candidate_mean": round(statistics.fmean(means), 6) if means else None,
                      "between_candidate_sd": round(statistics.stdev(means), 6) if len(means) > 1 else None,
                      "minimum_candidate_mean": min(means) if means else None, "maximum_candidate_mean": max(means) if means else None}
    return {"frozen_review_count": len(rows), "complete_review_count": len(complete), "distinct_generated_candidates": len(candidates),
            "axes": axes, "interpretation": "Descriptive spread across distinct generated candidates; not fitted human/team population variance."}


def _stratum(record: dict, mapping: dict) -> dict:
    return {"scenario_id": mapping["scenario_id"], "scenario_hash": stable_hash(record["packet"]["scenario"]),
            "task_hash": stable_hash(record["packet"]["task"]), "settings_hash": record["settings_hash"],
            "rubric_hash": record["review"]["rubric_hash"], "model_hash": record["assessment"]["model_hash"],
            "condition": mapping["condition"], "iteration": mapping["iteration"]}


def unblind_scorecards(frozen_records: list[dict], mappings: list[dict]) -> dict:
    """Join separately held assignments only after all supplied packet reviews are frozen."""
    if not isinstance(frozen_records, list) or not isinstance(mappings, list) or not 1 <= len(frozen_records) <= 64 or len(frozen_records) != len(mappings):
        raise ValueError("Reveal requires exactly one frozen record for every mapped packet")
    checked = [validate_frozen(r) for r in frozen_records]
    records = {r["packet_id"]: r for r in checked}
    if any(not isinstance(mapping, dict) for mapping in mappings):
        raise ValueError("Each assignment map must be an object")
    if len(records) != len(frozen_records) or len({m.get("packet_id") for m in mappings}) != len(mappings):
        raise ValueError("Reveal packets and records must be unique")
    rows, groups = [], {}
    for mapping in mappings:
        for field in ("packet_id", "packet_hash", "run_id", "artifact_hash", "scenario_id", "condition", "iteration"):
            text(mapping.get(field), 200, "assignment " + field)
        record = records.get(mapping.get("packet_id"))
        if record is None or record["packet_hash"] != mapping.get("packet_hash"):
            raise ValueError("Assignment map differs from a frozen packet")
        if record["assessment"]["scenario"]["id"] != mapping.get("scenario_id"):
            raise ValueError("Assignment scenario differs from the scored task")
        if "source_sha256" in mapping and mapping["source_sha256"] != record["packet"]["evidence"][0]["sha256"]:
            raise ValueError("Assignment source hash differs from scored evidence")
        stratum = _stratum(record, mapping)
        row = {**copy.deepcopy(mapping), **stratum, "scorecard_id": record["id"], "record_hash": record["record_hash"],
               "assessment": {key: value for key, value in record["assessment"].items() if key != "samples"}}
        rows.append(row)
        group = groups.setdefault(stable_hash(stratum), {"stratum": stratum, "rows": []})
        group["rows"].append(row)
    return {"schema_version": 1, "status": "unblinded", "rows": rows,
            "strata": [{**group["stratum"], **_group_summary(group["rows"])} for group in groups.values()],
            "aggregation": "Scenario, task, assumptions, model, and iteration strata remain separate; distinct candidates, not simulation draws, supply replication."}
