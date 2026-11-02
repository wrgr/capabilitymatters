"""Expose integrated design records as generated plans without treating them as executed repairs."""
from __future__ import annotations

import copy
import hashlib
import json

from scorecard_contract import text

STAGES = ("understand", "model", "design", "build", "instrument", "deploy", "evaluate", "refine")
LABELS = dict(zip(STAGES, ("Understand", "Map", "Design", "Build", "Instrument", "Experiment", "Evaluate", "Refine")))
PLAN_FIELDS = ("artifact_title", "artifact_body", "decision", "advantages", "drawbacks", "tradeoffs",
               "risks", "human_capabilities", "system_capabilities", "flourishing", "objections",
               "revisit_stage", "challenged_assumption", "design")
PLAN_BOUNDARY = ("Generated design record, not an observation of implementation or people. "
                 "E1 is the retained executable Build. Proposed repairs and later plans receive no implementation credit "
                 "unless supported by that executable artifact or separately supplied observations.")


def packet_scope(packet: dict) -> str:
    """Read scope from a validated packet while interpreting legacy packets as artifact-only."""
    return packet.get("evaluation_scope", "artifact")


def _integrated_record(run: dict, artifact: dict) -> dict:
    """Join the artifact body with its integrated decision, excluding conversation and identity fields."""
    payload = artifact["payload"]
    content = payload["content"]
    decision = next((event for event in run["events"]
                     if event.get("seq") == payload.get("trigger_seq")
                     and event["kind"] == "decision" and event["stage"] == artifact["stage"]), None)
    response = decision["payload"]["response"] if decision else {}
    record = {key: copy.deepcopy(response[key]) for key in PLAN_FIELDS if key in response}
    # Journal artifacts use title/body; these retained values are authoritative.
    for source, target in (("title", "artifact_title"), ("body", "artifact_body")):
        if source in content:
            record[target] = copy.deepcopy(content[source])
    return record


def solution_evidence(run: dict, first_index: int) -> list[dict]:
    """Take only the latest integrated artifact per stage, excluding member transcripts and identities."""
    latest = {event["stage"]: event for event in run["events"] if event["kind"] == "artifact" and event["stage"] in STAGES}
    evidence = []
    for stage in STAGES:
        if stage not in latest:
            continue
        # Source sequence numbers, profile metadata, and raw contributions stay outside blind packets.
        record = _integrated_record(run, latest[stage])
        value = json.dumps({"stage": LABELS[stage], "evidence_boundary": PLAN_BOUNDARY,
                            "integrated_record": record}, ensure_ascii=False, indent=2)
        text(value, 100000, "generated design record")
        evidence.append({"id": f"E{first_index + len(evidence)}", "kind": "generated_plan", "text": value,
                         "sha256": hashlib.sha256(value.encode()).hexdigest()})
    return evidence


def validate_evidence_kinds(packet: dict) -> None:
    """Keep artifact-only evidence and full-solution generated plans in explicit versioned scopes."""
    evidence = packet["evidence"]
    allowed = {"observation", "generated_plan"} if packet_scope(packet) == "full_solution" else {"observation"}
    if evidence[0].get("kind") != "artifact" or any(item.get("kind") not in allowed for item in evidence[1:]):
        raise ValueError("Packet evidence must start with one artifact followed by evidence allowed in its scope")
    plans = [item for item in evidence if item.get("kind") == "generated_plan"]
    if packet_scope(packet) == "full_solution" and not 1 <= len(plans) <= len(STAGES):
        raise ValueError("Full-solution packets require one to eight integrated stage records")
