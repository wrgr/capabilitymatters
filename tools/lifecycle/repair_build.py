"""Record a missing-build correction without replacing the original live discussion."""
import argparse
import json
from pathlib import Path
from engine import CodexProvider, Journal, record_turn, snapshot, verify

def repair(journal, provider):
    build = snapshot(journal.run, len(journal.events))["artifacts"].get("build")
    if not build or build["content"]["prototype_html"].strip():
        raise ValueError("Repair applies only to a saved Build artifact with missing executable source")
    finding = journal.append("verification", "build", "orchestrator", {
        "message": "Implementation review found that the Build artifact returned a draft but no executable HTML. The original is preserved. Reopen Build, require a runnable candidate, and revise the evaluation and refinement against its actual source. No field results exist.",
        "artifact_hash": build["content_hash"], "status": "correction_required"})
    record_turn(journal, provider, "orchestrator", "build", finding["seq"])
    record_turn(journal, provider, "measurement", "evaluate")
    record_turn(journal, provider, "orchestrator", "evaluate")
    record_turn(journal, provider, "orchestrator", "refine")
    journal.append("completed", "refine", "orchestrator", {"status": "awaiting_human_pilot", "through": "refine", "claim": "Runnable candidate and revised desk evaluation. Browser review and human pilot evidence are separate requirements; no operational or flourishing outcome is demonstrated."})
    verify(journal.run)
    return journal.run

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("run", type=Path)
    parser.add_argument("--export", type=Path, required=True)
    args = parser.parse_args()
    journal = Journal.reopen(args.run)
    run = repair(journal, CodexProvider())
    from product import write_product
    write_product(run, journal.path / "product")
    args.export.write_text(json.dumps(run, ensure_ascii=False, indent=2))
    print(json.dumps({"run_directory": str(journal.path), "events": len(journal.events), "status": journal.events[-1]["payload"]["status"]}))
