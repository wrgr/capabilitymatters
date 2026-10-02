import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import Journal, SEED, CodexProvider, execute, snapshot, verify, validate_response, prompt_for
from exemplar import ScriptedProvider

class EngineTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.journal = Journal(Path(self.directory.name) / "test-run", dict(SEED), "scripted-simulation")

    def test_complete_lifecycle_keeps_unknowns_and_gate(self):
        run = execute(self.journal, ScriptedProvider())
        self.assertTrue(verify(run))
        self.assertEqual(run["events"][-1]["payload"]["status"], "awaiting_human_pilot")
        gates = [e for e in run["events"] if e["kind"] == "human_gate"]
        self.assertEqual(gates[0]["payload"]["status"], "pending")
        self.assertIn("No pilot has occurred", snapshot(run, len(run["events"]))["artifacts"]["evaluate"]["content"]["body"])

    def test_scenarios_trace_to_specific_revisions(self):
        run = execute(self.journal, ScriptedProvider())
        challenges = [e for e in run["events"] if e["kind"] == "scenario"]
        links = [e for e in run["events"] if e["kind"] == "revision_link"]
        self.assertEqual(len(challenges), 2)
        self.assertEqual([e["payload"]["return_stage"] for e in links], ["model", "design"])
        for challenge, link in zip(challenges, links):
            self.assertTrue(challenge["payload"]["hypothetical"])
            self.assertEqual(link["payload"]["scenario_seq"], challenge["seq"])
            decision = run["events"][link["payload"]["decision_seq"] - 1]
            self.assertIn(challenge["seq"], decision["payload"]["response"]["evidence_refs"])
        self.assertEqual(snapshot(run, len(run["events"]))["artifacts"]["model"]["revision"], 2)

    def test_replay_has_no_future_artifacts_or_revisions(self):
        run = execute(self.journal, ScriptedProvider())
        first = next(e for e in run["events"] if e["kind"] == "artifact")
        self.assertEqual(snapshot(run, first["seq"] - 1)["artifacts"], {})
        revised = next(e for e in run["events"] if e["kind"] == "artifact" and e["payload"]["id"] == "model" and e["payload"]["revision"] == 2)
        before = snapshot(run, revised["seq"] - 1)
        after = snapshot(run, revised["seq"])
        self.assertEqual(before["artifacts"]["model"]["revision"], 1)
        self.assertEqual(after["artifacts"]["model"]["revision"], 2)
        self.assertNotIn("refine", after["artifacts"])

    def test_tampered_payload_and_mode_are_rejected(self):
        run = execute(self.journal, ScriptedProvider(), "understand")
        bad = copy.deepcopy(run)
        bad["events"][0]["payload"]["seed"]["idea"] = "Altered seed"
        with self.assertRaises(ValueError): verify(bad)
        bad = copy.deepcopy(run)
        bad["mode"] = "live-codex"
        with self.assertRaises(ValueError): verify(bad)

    def test_failure_retains_request_and_prior_turns(self):
        class Broken(ScriptedProvider):
            def call(self, *args):
                if args[-1] == 2: raise RuntimeError("fixture provider failure")
                return super().call(*args)
        with self.assertRaises(RuntimeError): execute(self.journal, Broken())
        saved = json.loads((self.journal.path / "run.json").read_text())
        self.assertTrue(verify(saved))
        self.assertEqual(saved["events"][-1]["kind"], "failure")
        self.assertEqual(len([e for e in saved["events"] if e["kind"] == "contribution"]), 1)
        self.assertTrue((self.journal.path / "events.jsonl").exists())

    def test_future_evidence_is_rejected(self):
        run = execute(self.journal, ScriptedProvider(), "understand")
        response = copy.deepcopy(next(e["payload"]["response"] for e in run["events"] if e["kind"] == "contribution"))
        response["evidence_refs"] = [1000]
        with self.assertRaises(ValueError): validate_response(response, len(run["events"]))

    def test_append_copies_mutable_payload(self):
        payload = {"items": ["old"]}
        event = self.journal.append("test", "understand", "human", payload)
        payload["items"].append("new")
        self.assertEqual(event["payload"]["items"], ["old"])
        self.assertTrue(verify(self.journal.run))

    def test_live_requires_explicit_environment_gate(self):
        with patch.dict("os.environ", {"CAPABILITY_MATTERS_LIVE": "0"}):
            with self.assertRaisesRegex(RuntimeError, "CAPABILITY_MATTERS_LIVE"):
                CodexProvider()

    def test_exemplar_contains_executable_candidate_source(self):
        run = execute(self.journal, ScriptedProvider())
        build = snapshot(run, len(run["events"]))["artifacts"]["build"]
        self.assertIn("document.getElementById", build["content"]["prototype_html"])
        self.assertNotIn("https://", build["content"]["prototype_html"])

    def test_missing_build_stops_and_preserves_provider_output(self):
        class MissingBuild(ScriptedProvider):
            def call(self, role, stage, *args):
                response, metadata = super().call(role, stage, *args)
                if role == "orchestrator" and stage == "build":
                    response["prototype_html"] = ""
                return response, metadata
        with self.assertRaisesRegex(ValueError, "runnable prototype_html"):
            execute(self.journal, MissingBuild())
        saved = Journal.reopen(self.journal.path)
        self.assertTrue(verify(saved.run))
        self.assertEqual(saved.events[-1]["kind"], "failure")
        self.assertEqual(saved.events[-1]["payload"]["rejected_response"]["prototype_html"], "")
        self.assertNotIn("build", snapshot(saved.run, len(saved.events))["artifacts"])

    def test_reopen_rejects_active_or_divergent_journals(self):
        with self.assertRaisesRegex(ValueError, "stopped run"):
            Journal.reopen(self.journal.path)
        execute(self.journal, ScriptedProvider(), "understand")
        with (self.journal.path / "events.jsonl").open("a") as handle:
            handle.write('{}\n')
        with self.assertRaisesRegex(ValueError, "differ"):
            Journal.reopen(self.journal.path)

    def test_technical_review_trigger_includes_actual_finding(self):
        finding = self.journal.append("verification", "build", "orchestrator", {"message": "Build has no executable source"})
        prompt = prompt_for(self.journal, "orchestrator", "build", finding["seq"])
        self.assertIn('"message":"Build has no executable source"', prompt)
        self.assertIn('"seq":2', prompt)
        self.assertIn("prototype_html must contain complete runnable", prompt)

if __name__ == "__main__": unittest.main()
