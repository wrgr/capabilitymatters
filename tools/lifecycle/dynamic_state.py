"""Derive addressed conversation state and choose speakers from unresolved work."""
from __future__ import annotations

from dynamic_contract import PHASES, indexed


def messages(run: dict) -> list[dict]:
    """Return the complete accepted public conversation in journal order."""
    return [e for e in run["events"] if e["kind"] == "message"]


def message_map(run: dict) -> dict[str, dict]:
    """Index accepted messages by their stable public identifiers."""
    return {e["payload"]["message_id"]: e for e in messages(run)}


def phase(run: dict) -> str:
    """Read the current phase from the latest artifact boundary."""
    return "deploy_test" if any(e["kind"] == "frozen" for e in run["events"]) else "design_develop"


def turns(run: dict, current_phase: str) -> int:
    """Count attempted calls, including failed responses, against the hard cap."""
    return sum(e["kind"] == "request" and e["phase"] == current_phase for e in run["events"])


def current_artifact(run: dict) -> dict | None:
    """Return the newest implemented artifact, whether frozen yet or not."""
    artifacts = [e["payload"] for e in run["events"] if e["kind"] == "artifact"]
    return artifacts[-1] if artifacts else None


def frozen_artifacts(run: dict) -> dict[int, dict]:
    """Index immutable phase-boundary records by implemented version."""
    return {e["payload"]["artifact_version"]: e["payload"] for e in run["events"] if e["kind"] == "frozen"}


def outstanding(run: dict) -> tuple[list[dict], list[dict]]:
    """Keep unanswered requests and unwithdrawn objections distinct from missing reviews."""
    public = messages(run)
    questions, objections = [], []
    for event in public:
        response, key = event["payload"]["response"], event["payload"]["message_id"]
        replies = [e for e in public if key in e["payload"]["response"]["reply_to"]]
        if response["kind"] == "question":
            answered = {e["actor"] for e in replies if e["payload"]["response"]["kind"] in {"answer", "implementation", "approval", "objection"}}
            pending = [actor for actor in response["to"] if actor not in answered]
            if pending:
                questions.append({"id": key, "actor": event["actor"], "pending": pending, "content": response["content"]})
        if response["kind"] == "objection":
            resolved = any(e["actor"] == event["actor"] and e["payload"]["response"]["kind"] == "resolve"
                           and e["payload"]["response"]["issue_id"] == key for e in replies)
            if not resolved:
                objections.append({"id": key, "actor": event["actor"], "to": response["to"],
                                   "content": response["content"], "replies": [e["actor"] for e in replies]})
    return questions, objections


def review_status(run: dict, version: int) -> dict[str, str]:
    """Report actual domain approvals for one version without inventing absent expertise."""
    status = {d["id"]: "not_reviewed" for d in run["catalog"]["domains"]}
    latest_update = max((e["seq"] for e in run["events"] if e["kind"] == "user_update"), default=0)
    for event in messages(run):
        response = event["payload"]["response"]
        if response["kind"] == "approval" and response["artifact_version"] == version and event["seq"] > latest_update:
            for domain in response["domains"]:
                status[domain] = "approved"
    return status


def pending_request(run: dict) -> dict | None:
    """Find a retained request that has no accepted or failed response yet."""
    ended = {e["payload"]["request_seq"] for e in run["events"] if e["kind"] in {"message", "evaluation", "turn_failed"}}
    candidates = [e for e in run["events"] if e["kind"] == "request" and e["seq"] not in ended]
    return candidates[-1] if candidates else None


def select_speaker(run: dict) -> tuple[str | None, str]:
    """Route the next turn by addressed requests and unresolved objections, never round robin."""
    current = phase(run)
    if turns(run, current) >= run["config"]["budgets"][current]:
        return None, "call_budget_exhausted"
    questions, objections = outstanding(run)
    frozen = frozen_artifacts(run)
    artifact = current_artifact(run)
    accepted = set(frozen.get(artifact["version"], {}).get("accepted_risks", [])) if artifact else set()
    questions = [item for item in questions if item["id"] not in accepted]
    objections = [item for item in objections if item["id"] not in accepted]
    # New subquestions precede their parent request, allowing genuine cross-role replies.
    if questions:
        return questions[-1]["pending"][0], f"answer:{questions[-1]['id']}"
    if objections:
        issue = objections[-1]
        target = next((a for a in issue["to"] if a not in issue["replies"]), issue["actor"])
        return target, f"resolve:{issue['id']}"
    actors = indexed(run["config"]["agents"], "agents")
    recent = messages(run)
    facilitator = run["config"]["facilitator_id"]
    if not recent or run["events"][-1]["kind"] in {"user_update", "observation"}:
        return facilitator, "route_new_work"
    last = recent[-1]
    response = last["payload"]["response"]
    if response["kind"] == "ready":
        return None, "awaiting_explicit_freeze_or_test"
    if last["actor"] != facilitator:
        return facilitator, f"integrate_procedurally:{last['payload']['message_id']}"
    targets = [a for a in response["to"] if a != facilitator and actors[a]["kind"] != "evaluator"]
    if targets:
        return targets[0], f"addressed:{last['payload']['message_id']}"
    return None, "no_addressed_next_action"


def snapshot(run: dict) -> dict:
    """Provide a replay-friendly state derived solely from accepted journal events."""
    questions, objections = outstanding(run)
    artifact = current_artifact(run)
    speaker, reason = select_speaker(run)
    return {"phase": phase(run), "status": completion_status(run), "turns": {p: turns(run, p) for p in PHASES},
            "next_actor": speaker, "next_reason": reason, "open_questions": questions,
            "open_objections": objections, "current_artifact": artifact,
            "frozen": list(frozen_artifacts(run).values()),
            "review_status": review_status(run, artifact["version"]) if artifact else {},
            "decisions": [e for e in run["events"] if e["kind"] == "message"
                          and e["payload"]["response"]["kind"] == "decision"],
            "evaluations": [e["payload"] for e in run["events"] if e["kind"] == "evaluation"]}


def completion_status(run: dict) -> str:
    """Distinguish complete evidence coverage from pauses and exhausted conversations."""
    artifact = current_artifact(run)
    if artifact and artifact["version"] in frozen_artifacts(run):
        reviews = [e["payload"] for e in run["events"] if e["kind"] == "evaluation"
                   and e["payload"]["artifact_version"] == artifact["version"]]
        results = {r["scenario_id"] for r in reviews if r["scope"] == "result"}
        if any(r["scope"] == "process" for r in reviews) and results == set(run["config"]["scenario_ids"]):
            return "reviewed_fixture" if run["mode"] == "fixture" else "reviewed"
    current = phase(run)
    if turns(run, current) >= run["config"]["budgets"][current]:
        return "incomplete_budget_exhausted"
    stopped = [e for e in run["events"] if e["kind"] == "stopped"]
    if stopped and stopped[-1]["payload"]["reason"].startswith("context_limit"):
        return "incomplete_context_limit"
    return "awaiting_tests_or_review" if phase(run) == "deploy_test" else "design_in_progress"
