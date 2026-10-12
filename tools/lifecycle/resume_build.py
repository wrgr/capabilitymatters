"""Continue a retained failed Build without replaying or replacing accepted role turns."""
import argparse
import json
from pathlib import Path
from engine import CodexProvider, Journal, record_turn, snapshot, execute
from product import write_product

def continue_build(journal, provider, through="refine"):
    failure = journal.events[-1]
    if failure["kind"] != "failure" or failure["stage"] != "build":
        raise ValueError("Continuation requires a retained failed Build")
    if snapshot(journal.run, len(journal.events))["artifacts"].get("build"):
        raise ValueError("Use an explicit revision review when an executable Build already exists")
    finding = journal.append("verification", "build", "implementation", {
        "status": "build_delivery_incomplete", "failure_seq": failure["seq"],
        "message": "The previous Build attempt did not return a contribution within its delivery deadline. Its request and failure remain recorded. The accepted Design/Map records already supply the complete brief. Produce a concise eight-heading implementation receipt referencing those records and use the output budget for the executable candidate. No candidate, technical behavior, human approval or field outcome is inferred from the failed attempt."})
    record_turn(journal, provider, "orchestrator", "build", finding["seq"])
    journal.append("stage_completed", "build", "orchestrator", {"status": "rehearsed", "continuation_of_failure": failure["seq"]})
    if through == "build":
        journal.append("completed", "build", "orchestrator", {"status": "partial_rehearsal", "through": "build", "claim": "Executable candidate ready for scoped technical and measurement review. No human approval or field outcome is established."})
        return journal.run
    return execute(journal, provider, start="instrument")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("run", type=Path)
    parser.add_argument("--export", type=Path, required=True)
    parser.add_argument("--through", choices=["build", "refine"], default="refine")
    args = parser.parse_args()
    journal = Journal.reopen(args.run)
    run = continue_build(journal, CodexProvider(), args.through)
    write_product(run, journal.path / "product")
    args.export.write_text(json.dumps(run, indent=2, ensure_ascii=False))
    print(json.dumps({"run_directory": str(journal.path), "events": len(journal.events), "status": journal.events[-1]["payload"]["status"]}))
