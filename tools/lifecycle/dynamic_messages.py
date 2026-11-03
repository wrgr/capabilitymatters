"""Enforce addressed replies, scoped approvals, and implementation authority in dynamic dialogue."""
from __future__ import annotations

from dynamic_contract import indexed, require, string_list, text
from dynamic_state import current_artifact, message_map, outstanding

MESSAGE_KINDS = ["proposal", "question", "answer", "objection", "resolve", "approval", "decision", "implementation", "ready"]
STRING_ARRAY = {"type": "array", "items": {"type": "string"}}
ARTIFACT_SCHEMA = {"type": ["object", "null"], "additionalProperties": False,
                   "properties": {"html": {"type": "string"}, "change_summary": {"type": "string"},
                                  "parent_version": {"type": ["integer", "null"]}},
                   "required": ["html", "change_summary", "parent_version"]}
DECISION_SCHEMA = {"type": ["object", "null"], "additionalProperties": False,
                   "properties": {"action": {"type": "string", "enum": ["accept", "revise", "request_review"]},
                                  "subject": {"type": "string"}, "approval_refs": STRING_ARRAY},
                   "required": ["action", "subject", "approval_refs"]}
MESSAGE_SCHEMA = {"type": "object", "additionalProperties": False, "properties": {
    "kind": {"type": "string", "enum": MESSAGE_KINDS}, "to": STRING_ARRAY, "reply_to": STRING_ARRAY,
    "domains": STRING_ARRAY, "content": {"type": "string"}, "artifact_version": {"type": ["integer", "null"]},
    "issue_id": {"type": "string"}, "artifact": ARTIFACT_SCHEMA, "decision": DECISION_SCHEMA},
    "required": ["kind", "to", "reply_to", "domains", "content", "artifact_version", "issue_id", "artifact", "decision"]}


def validate_message(run: dict, actor_id: str, response: dict) -> dict:
    """Reject unsupported authority, fabricated references, and invalid artifact transitions."""
    require(isinstance(response, dict) and set(response) == set(MESSAGE_SCHEMA["required"]), "Response does not match message contract")
    actors = indexed(run["config"]["agents"], "agents")
    require(actor_id in actors and actors[actor_id]["kind"] != "evaluator", "Invalid conversation actor")
    actor = actors[actor_id]
    require(response["kind"] in MESSAGE_KINDS, "Unknown message kind")
    text(response["content"], "public message", 12000)
    for field in ("to", "reply_to", "domains"):
        values = string_list(response[field], field)
        require(len(values) == len(set(values)), f"Duplicate {field}")
    require(bool(response["to"]) and all(a in actors and a != actor_id and actors[a]["kind"] != "evaluator"
                                        for a in response["to"]), "Message needs valid non-self addressees")
    require(set(response["domains"]) <= set(actor["domains"]), "Claimed domain exceeds assigned expertise")
    prior = message_map(run)
    require(all(ref in prior for ref in response["reply_to"]), "Reply references an unknown message")
    require(all(prior[ref]["actor"] in response["to"] or prior[ref]["actor"] == actor_id for ref in response["reply_to"]),
            "A reply must address the original author")
    require(isinstance(response["issue_id"], str), "issue_id must be a string")
    current = current_artifact(run)
    version = response["artifact_version"]
    require(version is None or (type(version) is int and current is not None and 1 <= version <= current["version"]), "Unknown artifact version")
    _validate_kind(run, actor, response, prior)
    _validate_artifact(current, actor, response)
    _validate_decision(run, actor, response, prior, current)
    return response


def _validate_kind(run: dict, actor: dict, response: dict, prior: dict) -> None:
    kind = response["kind"]
    if kind in {"answer", "resolve"}:
        require(bool(response["reply_to"]), "Answer or resolution must identify its actual prior message")
    if kind == "approval":
        current = current_artifact(run)
        require(actor["kind"] == "specialist" and bool(response["domains"]), "Only an assigned specialist can approve its domains")
        require(current is not None and response["artifact_version"] == current["version"], "Approval must name the current implemented version")
    if kind == "resolve":
        issue = response["issue_id"]
        require(issue in prior and prior[issue]["actor"] == actor["id"]
                and prior[issue]["payload"]["response"]["kind"] == "objection", "Only the objector may withdraw an objection")
        require(issue in response["reply_to"] and issue in {i["id"] for i in outstanding(run)[1]}, "Resolution must name an open objection")
    else:
        require(response["issue_id"] == "", "Only resolution messages use issue_id")
    if kind in {"decision", "ready"}:
        require(actor["kind"] == "facilitator", "Only the procedural facilitator may declare a decision or ready state")
    if kind == "ready":
        require(current_artifact(run) is not None, "Ready requires an actual implemented artifact")


def _validate_artifact(current: dict | None, actor: dict, response: dict) -> None:
    artifact = response["artifact"]
    if response["kind"] != "implementation":
        require(artifact is None, "Only implementation messages may contain executable artifacts")
        return
    require("implement" in actor.get("capabilities", []), "Actor lacks implementation authority")
    require(isinstance(artifact, dict) and set(artifact) == set(ARTIFACT_SCHEMA["required"]), "Invalid artifact contract")
    html = text(artifact["html"], "complete HTML source", 200000)
    require("<html" in html.lower() and "</html>" in html.lower(), "Implementation must contain a complete HTML document")
    text(artifact["change_summary"], "artifact change summary", 6000)
    require(artifact["parent_version"] == (current["version"] if current else None), "Implementation must extend the current version")


def _validate_decision(run: dict, actor: dict, response: dict, prior: dict, current: dict | None) -> None:
    decision = response["decision"]
    if response["kind"] != "decision":
        require(decision is None, "Decision data belongs only to a decision message")
        return
    require(actor["kind"] == "facilitator", "Technical authors cannot declare team consensus")
    require(isinstance(decision, dict) and set(decision) == set(DECISION_SCHEMA["required"]), "Invalid decision data")
    require(decision["action"] in {"accept", "revise", "request_review"}, "Unknown decision action")
    text(decision["subject"], "decision subject", 6000)
    latest_update = max((e["seq"] for e in run["events"] if e["kind"] == "user_update"), default=0)
    for ref in string_list(decision["approval_refs"], "approval references"):
        require(ref in prior and prior[ref]["payload"]["response"]["kind"] == "approval", "Decision references a nonexistent approval")
        require(current is not None and prior[ref]["payload"]["response"]["artifact_version"] == current["version"],
                "Decision cannot reuse an approval for an earlier artifact")
        require(prior[ref]["seq"] > latest_update, "A changed case requires fresh approval before a decision can cite it")
