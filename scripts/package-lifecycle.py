"""Build the public role contract and exemplar product from versioned source."""
import json
from pathlib import Path
import sys

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "tools/lifecycle"))
from engine import WEB
from package_exemplar import package
from product import write_product
from role_profiles import load_contract, resolve_profile, REGISTRY, FRAMEWORK

contract = load_contract()
registry, framework = json.loads(REGISTRY.read_text()), json.loads(FRAMEWORK.read_text())
contract["available_domain_profiles"] = {key: resolve_profile(registry, framework, key) for key, value in registry["profiles"].items() if value.get("category") == "domain"}
text = json.dumps(contract, indent=2, ensure_ascii=False) + "\n"
(REPO / "src/data/lifecycle/resolved-roles.json").write_text(text)
(WEB.parent / "roles.json").write_text(text)
for name in ("exemplar.json", "live-exemplar.json"):
    package(WEB / name)
run = json.loads((WEB / "live-exemplar.json").read_text())
write_product(run, WEB.parent / "product")
print("Lifecycle role contract, saved candidates and portable product packaged.")

# The paper describes this preserved journal, not any later substitute run.
import hashlib
from collections import Counter
assert run["id"] == "20261001T224130Z-live-codex-d6a562", "Review the paper before replacing its evidence source"
counts = dict(Counter(event["kind"] for event in run["events"]))
assert (len(run["events"]), counts["request"], counts["artifact"], counts["scenario"]) == (99, 29, 14, 2)
episodes = {
    "interruption_privacy": {"scenario": 27, "decision": 29, "artifact": 30, "revision_link": 31},
    "reviewer_conflict": {"scenario": 62, "decision": 67, "artifact": 68},
    "implementation_correction": {"original_artifact": 38, "finding": 81, "failure": 83, "accepted_decision": 86, "accepted_artifact": 87, "claim_revision": 94, "retained_rejection": 97, "technical_verification": 98, "completion": 99},
}
facts = {}
for episode in episodes.values():
    for number in episode.values():
        event = run["events"][number - 1]
        fact = {key: event[key] for key in ("seq", "kind", "stage", "agent", "hash")}
        if event["kind"] == "artifact":
            fact.update({key: event["payload"][key] for key in ("id", "revision", "trigger_seq", "content_hash")})
            fact["executable_source_supplied"] = bool(event["payload"]["content"].get("prototype_html", "").strip())
        facts[str(number)] = fact
assert facts["27"]["kind"] == facts["62"]["kind"] == "scenario"
assert facts["30"]["trigger_seq"] == 29 and facts["68"]["trigger_seq"] == 67
assert not facts["38"]["executable_source_supplied"] and facts["87"]["executable_source_supplied"]
assert facts["83"]["kind"] == "failure" and facts["98"]["kind"] == "verification"
paper_dir = WEB.parent / "paper"
paper_dir.mkdir(parents=True, exist_ok=True)
source = REPO / "src/papers/learning-engineering-teams.md"
(paper_dir / "manuscript.md").write_bytes(source.read_bytes())
audit = {"schema_version": 1, "paper_status": "AI-assisted working draft for coauthor review", "run_id": run["id"],
         "journal_file_sha256": hashlib.sha256((WEB / "live-exemplar.json").read_bytes()).hexdigest(),
         "journal_head_hash": run["events"][-1]["hash"], "events": len(run["events"]), "event_kind_counts": counts,
         "requested_roles": sorted({event["agent"] for event in run["events"] if event["kind"] == "request"}),
         "model_version": "Not identified in the public metadata; configured default recorded", "episodes": episodes,
         "event_facts": facts, "manuscript_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
         "scope": "Retrospective episode selection; not a human-team study, independent coding, model equivalence test or learning-effect study",
         "future_role_profiles": "Added after this live run; not retrospectively assigned", "human_pilot": "pending"}
(paper_dir / "evidence.json").write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n")
print("Agentic LE manuscript and source-grounded episode audit packaged.")

# Diverse cases retain their own journal, pinned roles, candidate and handoff.
case_inventory = []
for case in json.loads((REPO / "src/data/lifecycle/cases.json").read_text()):
    source = WEB / case["journal"]
    case_run = json.loads(source.read_text())
    package(source)
    if case["id"] != "workforce":
        assert case_run["mode"] == "live-codex"
        assert case_run["role_profiles"]["roles"]["domain"]["profile_id"] == case["domain_profile"]
        assert case_run["events"][-1]["kind"] == "completed"
        write_product(case_run, REPO / "public" / case["product"].lstrip("/"), replay_url="/agentic-le/replay/?case=" + case["id"])
    case_inventory.append({**case, "title": case_run["seed"]["title"], "run_id": case_run["id"],
        "mode": case_run["mode"], "events": len(case_run["events"]),
        "counts": dict(Counter(e["kind"] for e in case_run["events"])),
        "journal_sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "head_hash": case_run["events"][-1]["hash"],
        "registry_version": case_run.get("role_profiles", {}).get("registry_version", "legacy fixed prompts"),
        "human_pilot": "pending", "field_outcomes": "unknown"})
(WEB.parent / "cases.json").write_text(json.dumps({"schema_version": 1, "cases": case_inventory}, indent=2, ensure_ascii=False) + "\n")
print("Diverse live-agent cases and their handoffs packaged.")
