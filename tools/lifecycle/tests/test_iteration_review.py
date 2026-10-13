import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import Journal, WEB, verify
from review_iteration import review_iteration


class IterationReviewTests(unittest.TestCase):
    def test_missing_findings_citation_retains_reply_without_accepting_it(self):
        run = json.loads((WEB / "library-journey.json").read_text())
        build = next(e for e in reversed(run["events"]) if e["kind"] == "artifact" and e["payload"]["id"] == "build")
        reply = copy.deepcopy(next(e["payload"]["response"] for e in run["events"] if e["kind"] == "decision"))
        reply["prototype_html"] = ""
        reply["evidence_refs"] = [2]
        captured = []

        class WrongCitation:
            def call(self, role, stage, prompt, directory, ordinal):
                captured.append(prompt)
                return copy.deepcopy(reply), {"provider": "offline-rejected-reply-fixture"}

        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            (folder / "run.json").write_text(json.dumps(run))
            (folder / "events.jsonl").write_text("".join(json.dumps(e) + "\n" for e in run["events"]))
            journal = Journal.reopen(folder)
            original = copy.deepcopy(journal.events)
            with self.assertRaisesRegex(ValueError, "cite its actual technical evidence"):
                review_iteration(journal, WrongCitation(), {"build_content_hash": build["payload"]["content_hash"]})
            self.assertEqual(journal.events[:len(original)], original)
            self.assertEqual(journal.events[-1]["kind"], "failure")
            self.assertEqual(journal.events[-1]["payload"]["rejected_response"], reply)
            self.assertEqual(journal.events[-1]["payload"]["provider"]["provider"], "offline-rejected-reply-fixture")
            self.assertFalse(any(e["kind"] in ("artifact", "contribution", "decision") for e in journal.events[len(original):]))
            self.assertIn("Parent context is preserved background, not a newly executed stage", captured[0])
            self.assertIn("Mandatory JSON citation", captured[0])
            self.assertTrue(verify(journal.run))
