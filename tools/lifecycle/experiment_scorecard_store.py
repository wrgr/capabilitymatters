"""Persist assignment-masked packets and freeze reviews before revealing their private mappings."""
from __future__ import annotations

from pathlib import Path
import secrets
import threading
from typing import Any

from experiment_records import hash_value, identifier, read_record, write_immutable

LOCK = threading.RLock()


def _folder(root: Path) -> Path:
    return root / "scorecards"


def _source_key(mapping: dict) -> str:
    return hash_value({key: mapping[key] for key in ("run_id", "artifact_hash")})


def _existing_bundle(root: Path, mappings: list[dict], settings: dict) -> dict | None:
    if any((_folder(root) / "source_reveals" / (_source_key(item) + ".json")).exists() for item in mappings):
        raise ValueError("These candidate artifacts have been revealed; generate fresh candidates in a new iteration")
    bindings = [_folder(root) / "source_sets" / (_source_key(item) + ".json") for item in mappings]
    if not any(path.exists() for path in bindings):
        return None
    if not all(path.exists() for path in bindings):
        raise ValueError("A candidate already belongs to a fixed assessment set; prepare new candidates separately")
    manifests = {read_record(path)["manifest_hash"] for path in bindings}
    if len(manifests) != 1:
        raise ValueError("These candidates belong to different fixed assessment sets")
    key = _private_key(read_record(_folder(root) / "manifests" / (manifests.pop() + ".json")))
    if {_source_key(item) for item in key["mappings"]} != {_source_key(item) for item in mappings}:
        raise ValueError("Retain every candidate in the original assessment set")
    packets = []
    for item in key["mappings"]:
        if (_folder(root) / "source_reveals" / (_source_key(item) + ".json")).exists():
            raise ValueError("These candidate artifacts have been revealed; generate fresh candidates in a new iteration")
        pinned = read_record(_folder(root) / "assumptions" / (item["packet_id"] + ".json"))
        if pinned["settings"] != settings or pinned["settings_hash"] != hash_value(settings):
            raise ValueError("Assessment assumptions are already pinned; use a new prospective iteration")
        packets.append(read_record(_folder(root) / "packets" / (item["packet_id"] + ".json")))
    secrets.SystemRandom().shuffle(packets)
    return {"packets": packets, "private_mapping": key, "settings": settings, "settings_hash": hash_value(settings)}


def _save_bundle(root: Path, packets: list[dict], mappings: list[dict], settings: dict) -> dict:
    existing = _existing_bundle(root, mappings, settings)
    if existing:
        return existing
    secrets.SystemRandom().shuffle(packets)
    key = {"schema_version": 1, "mappings": sorted(mappings, key=lambda item: item["packet_id"])}
    key["manifest_hash"] = hash_value(key)
    write_immutable(_folder(root) / "manifests" / (key["manifest_hash"] + ".json"), key)
    for packet, mapping in zip(sorted(packets, key=lambda p: p["id"]), key["mappings"]):
        write_immutable(_folder(root) / "packets" / (packet["id"] + ".json"), packet)
        write_immutable(_folder(root) / "mappings" / (packet["id"] + ".json"), mapping)
        write_immutable(_folder(root) / "assumptions" / (packet["id"] + ".json"),
                        {"settings": settings, "settings_hash": hash_value(settings)})
        write_immutable(_folder(root) / "source_sets" / (_source_key(mapping) + ".json"),
                        {"manifest_hash": key["manifest_hash"], "packet_id": packet["id"]})
    return {"packets": packets, "private_mapping": key, "settings": settings, "settings_hash": hash_value(settings)}


def _bound_run(root: Path, run_id: str) -> tuple[dict, dict | None]:
    run = read_record(root / identifier(run_id) / "run.json")
    if run.get("id") != run_id:
        raise ValueError("Run identity differs from its saved path")
    for path in sorted((root / "batches").glob("*/manifest.json"), reverse=True):
        batch = read_record(path)
        for item in batch.get("plans", []):
            if item.get("run_id") == run_id:
                if item.get("config_hash") != run.get("experiment", {}).get("config_hash"):
                    raise ValueError("Batch plan and run configuration hashes differ")
                return run, {"condition": item["condition"], "batch_id": batch["id"]}
    return run, None


def _execution_iteration(root: Path, execution_id: str) -> dict | None:
    path = root / "iterations" / "executions" / (identifier(execution_id) + ".json")
    if not path.exists():
        return None
    value = read_record(path)
    if value.get("content_hash") != hash_value({k: v for k, v in value.items() if k != "content_hash"}):
        raise ValueError("Execution iteration link hash differs")
    from experiment_iteration import read_iteration
    iteration = read_iteration(root, value["iteration_id"])
    if iteration["content_hash"] != value["iteration_hash"]:
        raise ValueError("Execution iteration parent hash differs")
    return iteration


def _packet_inputs(root: Path, run_id: str, body: dict, scenario: dict) -> tuple[dict, dict, dict]:
    from experiment_scorecard import build_blind_packet, scorecard_catalog, validate_settings
    from experiment_scenarios import apply_scenario
    run, batch = _bound_run(root, run_id)
    if run["events"][-1]["kind"] not in ("completed", "failure", "cancelled"):
        raise ValueError("Freeze a packet only after its run has stopped")
    iteration = _execution_iteration(root, batch["batch_id"] if batch else run_id)
    if body.get("iteration_id") and (not iteration or iteration["iteration_id"] != body["iteration_id"]):
        raise ValueError("The run was not executed under the requested iteration")
    if iteration and iteration["scenario_reference"]:
        reference = apply_scenario(run["experiment"]["config"], scenario["id"])["scenario_reference"]
        if iteration["scenario_reference"] != reference:
            raise ValueError("Score the run within the scenario version recorded in its iteration")
    elif any(run.get("experiment", {}).get("config", {}).get(key) != scenario[key]
             for key in ("seed", "environment", "challenges")):
        raise ValueError("This unlinked run does not match the chosen case; apply a scenario and save an iteration before fresh execution")
    defaults = scorecard_catalog()["defaults"]
    defaults["thresholds"] = scenario["axis_targets"]
    settings = validate_settings(body.get("settings", iteration["scorecard_assumptions"] if iteration else defaults))
    if iteration and settings != iteration["scorecard_assumptions"]:
        raise ValueError("Scoring assumptions changed after execution; retain the prospectively saved iteration settings")
    packet, mapping = build_blind_packet(run, scenario)
    mapping["condition"] = batch["condition"] if batch else "configured"
    mapping["iteration"] = iteration["iteration_id"] if iteration else "unlinked"
    return packet, mapping, settings


def create_packets(root: Path, body: dict) -> dict:
    """Extract verified artifacts, shuffle opaque packets, and retain a separate assignment key."""
    from experiment_scenarios import get_scenario
    if not {"run_ids", "scenario_id"} <= set(body) or set(body) - {"run_ids", "scenario_id", "iteration_id", "settings"}:
        raise ValueError("Packets require run_ids and scenario_id with optional iteration_id and settings")
    ids = body["run_ids"]
    if not isinstance(ids, list) or not 1 <= len(ids) <= 64 or len(ids) != len(set(ids)):
        raise ValueError("Select one to sixty-four distinct completed or stopped runs")
    scenario, packets, mappings, settings = get_scenario(body["scenario_id"]), [], [], None
    for run_id in ids:
        packet, mapping, current = _packet_inputs(root, run_id, body, scenario)
        if settings is not None and settings != current:
            raise ValueError("A packet bundle must use the same frozen scoring assumptions")
        settings = current
        packets.append(packet)
        mappings.append(mapping)
    with LOCK:
        return _save_bundle(root, packets, mappings, settings)


def freeze_stored_review(root: Path, packet: dict, review: dict, settings: dict | None) -> dict:
    """Keep the first frozen review immutable and prohibit revisions after assignment reveal."""
    from experiment_scorecard import freeze_review, validate_packet, validate_review
    packet = validate_packet(packet)
    review = validate_review(review, packet)
    packet_id = identifier(packet["id"])
    with LOCK:
        if (_folder(root) / "reveals" / (packet_id + ".json")).exists():
            raise ValueError("This candidate has been unblinded; start a new prospective iteration")
        mapping_path = _folder(root) / "mappings" / (packet_id + ".json")
        if mapping_path.exists() and (_folder(root) / "source_reveals" / (_source_key(read_record(mapping_path)) + ".json")).exists():
            raise ValueError("The source artifact has already been revealed; generate a fresh candidate")
        pin = _folder(root) / "assumptions" / (packet_id + ".json")
        if pin.exists():
            pinned = read_record(pin)
            if hash_value(pinned["settings"]) != pinned["settings_hash"]:
                raise ValueError("Pinned assumption hash differs")
            if settings is not None and settings != pinned["settings"]:
                raise ValueError("Use the assumptions pinned before this evidence packet was reviewed")
            settings = pinned["settings"]
        write_immutable(_folder(root) / "packets" / (packet_id + ".json"), packet)
        path = _folder(root) / "frozen" / (packet_id + ".json")
        if path.exists():
            saved = read_record(path)
            if saved["review"] == review and (settings is None or saved["settings"] == settings):
                return saved
            raise ValueError("This candidate already has an immutable frozen review")
        frozen = freeze_review(packet, review, settings)
        write_immutable(path, frozen)
    return frozen


def list_stored_reviews(root: Path) -> list[dict]:
    """Return recent frozen scorecards without joining their private assignment maps."""
    result = []
    paths = sorted((_folder(root) / "frozen").glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)[:64]
    for path in paths:
        value = read_record(path)
        if value.get("record_hash") != hash_value({k: v for k, v in value.items() if k != "record_hash"}):
            raise ValueError("A frozen review record has a mismatching content hash")
        result.append(value)
    return result


def _private_key(value: Any) -> dict:
    if not isinstance(value, dict) or set(value) != {"schema_version", "mappings", "manifest_hash"} or value["schema_version"] != 1:
        raise ValueError("Choose the separate private assignment-key manifest")
    if value["manifest_hash"] != hash_value({k: v for k, v in value.items() if k != "manifest_hash"}):
        raise ValueError("Private mapping manifest hash does not match")
    if not isinstance(value["mappings"], list) or not 1 <= len(value["mappings"]) <= 64:
        raise ValueError("Private mapping must contain one to sixty-four candidates")
    return value


def frozen_from_references(root: Path, references: list) -> list[dict]:
    """Resolve bounded local record references so large assessment sets need not be posted twice."""
    if not isinstance(references, list) or not 1 <= len(references) <= 64:
        raise ValueError("Provide one to sixty-four frozen record references")
    result = []
    for ref in references:
        if not isinstance(ref, dict) or set(ref) != {"packet_id", "record_hash"}:
            raise ValueError("A frozen record reference requires packet_id and record_hash")
        value = read_record(_folder(root) / "frozen" / (identifier(ref["packet_id"]) + ".json"))
        if value["record_hash"] != ref["record_hash"]:
            raise ValueError("Imported scorecard hash differs from the local frozen record")
        result.append(value)
    return result


def _check_original_set(root: Path, key: dict) -> None:
    for item in key["mappings"]:
        path = _folder(root) / "mappings" / (identifier(item["packet_id"]) + ".json")
        if path.exists() and read_record(path) != item:
            raise ValueError("The private mapping differs from the originally saved key")
        revealed = _folder(root) / "source_reveals" / (_source_key(item) + ".json")
        if revealed.exists() and read_record(revealed)["manifest_hash"] != key["manifest_hash"]:
            raise ValueError("The underlying source artifact was already revealed in a different assessment set")
        binding_path = _folder(root) / "source_sets" / (_source_key(item) + ".json")
        if not binding_path.exists():
            continue
        binding = read_record(binding_path)
        if binding["manifest_hash"] != key["manifest_hash"]:
            raise ValueError("Reveal requires the complete original assessment-set manifest")
        original = read_record(_folder(root) / "manifests" / (binding["manifest_hash"] + ".json"))
        if original != key:
            raise ValueError("The assignment set differs from the originally preserved manifest")


def reveal_stored_reviews(root: Path, records: list, mapping: dict) -> dict:
    """Reveal only the exact mapped set of locally frozen reviews and record the reveal boundary."""
    from experiment_scorecard import unblind_scorecards, validate_frozen
    key = _private_key(mapping)
    if not isinstance(records, list) or not 1 <= len(records) <= 64:
        raise ValueError("Provide one to sixty-four frozen scorecards")
    with LOCK:
        for record in records:
            checked = validate_frozen(record)
            packet_id = identifier(checked["packet_id"])
            saved = read_record(_folder(root) / "frozen" / (packet_id + ".json"))
            if saved != record:
                raise ValueError("The scorecard differs from the local frozen record")
        _check_original_set(root, key)
        result = unblind_scorecards(records, key["mappings"])
        boundary = {"schema_version": 1, "manifest_hash": key["manifest_hash"],
                    "record_hashes": sorted(record["record_hash"] for record in records)}
        boundary["content_hash"] = hash_value(boundary)
        for item in key["mappings"]:
            write_immutable(_folder(root) / "reveals" / (identifier(item["packet_id"]) + ".json"), boundary)
            write_immutable(_folder(root) / "source_reveals" / (_source_key(item) + ".json"), boundary)
        result["reveal"] = boundary
        result["mapping_provenance"] = "Hash-linked assignment key; hashes establish consistency, not independent verification of an imported key."
    return result
