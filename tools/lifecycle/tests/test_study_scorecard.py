"""Verify masked study preparation, bounded reviewer attempts, and evidence-only aggregation with offline fixtures."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from experiment_config import default_config
from experiment_runtime import run_experiment
from experiment_scenarios import apply_scenario
from scorecard_blind import review_template
from scorecard_contract import stable_hash
from study_scorecard import load_protocol, prepare_study, review_study
from study_scorecard_aggregate import aggregate_study


class StudyScorecardTests(unittest.TestCase):
    """Keep model invocations mocked while checking real journal and packet boundaries."""

    def setUp(self) -> None:
        """Retain one real offline journal and a source-bound browser-observation fixture."""
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.runs, self.qa, self.output = self.root / "runs", self.root / "qa", self.root / "scoring"
        config = apply_scenario(default_config(), "feedback-conversation")["config"]
        config["execution"].update(through="build", repetitions=1)
        self.run = run_experiment(config, self.runs).run
        self.build = [event for event in self.run["events"] if event["kind"] == "artifact" and event["stage"] == "build"][-1]
        self.batch = self.root / "batch.json"
        self.batch.write_text(json.dumps({"id": "fixture-batch", "plans": [{"item_id": "fixture-item", "condition": "full-team-explicit",
            "replicate": 1, "status": "completed", "run_id": self.run["id"], "config_hash": self.run["experiment"]["config_hash"],
            "run_head_hash": self.run["events"][-1]["hash"]}]}))
        folder = self.qa / self.run["id"]
        folder.mkdir(parents=True)
        self.observation_file = folder / "observations.json"
        self.observation_file.write_text(json.dumps({"source_sha256": hashlib.sha256(self.build["payload"]["content"]["prototype_html"].encode()).hexdigest(),
            "build_content_hash": self.build["payload"]["content_hash"], "observations": [{"text": "Authored test fixture: no actual browser observation or human outcome is claimed."}]}))
        self.tool_activity = False
        self.unknown = False
        self.bad_quote = False
        self.configuration_events = []
        self.working_directories = []

    def _prepare(self) -> dict:
        protocol = prepare_study(self.runs, self.batch, self.qa, self.output, "feedback-conversation", order_seed=42)
        packet_id = next(iter(protocol["packet_hashes"]))
        self.packet = json.loads((self.output / "packets" / (packet_id + ".json")).read_text())
        return protocol

    def _fake_process(self, command: list, **kwargs: object) -> subprocess.CompletedProcess:
        cwd = Path(kwargs["cwd"])
        self.assertEqual(list(cwd.iterdir()), [])
        self.working_directories.append(str(cwd))
        self.assertIn("--ephemeral", command)
        self.assertEqual(command[command.index("--sandbox") + 1], "read-only")
        self.assertNotIn(self.run["id"], kwargs["input"])
        self.assertNotIn("full-team-explicit", kwargs["input"])
        schema = json.loads(Path(command[command.index("--output-schema") + 1]).read_text())
        reviewer = schema["properties"]["reviewer"]["properties"]["id"]["const"]
        review = review_template(self.packet)
        review.update(status="complete", reviewer={"id": reviewer, "kind": "model", "model": "gpt-6.1-sol"}, reviewed_at="fixture-time")
        score = 3 if reviewer == "reviewer-1" else 2
        for rating in review["ratings"].values():
            rating.update(score=score, lower=score, upper=score, rationale="Authored method-test value, not a scientific rating.",
                          evidence_refs=[{"evidence_id": "E1", "quote": self.packet["evidence"][0]["text"][:40], "locator": "source start"}])
        if self.unknown and reviewer == "reviewer-2":
            review["ratings"]["practice_feedback"].update(score=None, lower=None, upper=None, evidence_refs=[])
            review["status"] = "partial"
        if self.bad_quote:
            review["ratings"]["alignment"]["evidence_refs"][0]["quote"] = "UNSUPPLIED QUOTATION"
        Path(command[command.index("-o") + 1]).write_text(json.dumps(review))
        events = [*self.configuration_events, {"type": "item.completed", "item": {"type": "agent_message"}}, {"type": "turn.completed"}]
        if self.tool_activity:
            events.insert(0, {"type": "item.completed", "item": {"type": "command_execution"}})
        kwargs["stdout"].write("\n".join(json.dumps(event) for event in events) + "\n")
        return subprocess.CompletedProcess(command, 0)

    def _review(self) -> dict:
        with patch.dict(os.environ, {"CAPABILITY_MATTERS_LIVE": "1"}), patch("study_reviewer.shutil.which", return_value="/fixture/codex"):
            with patch("study_reviewer.subprocess.run", side_effect=self._fake_process) as process:
                result = review_study(self.output, "/fixture/codex", execute=True)
                self.assertEqual(process.call_count, 2)
        return result

    def test_preparation_is_masked_bounded_and_does_not_call_a_model(self) -> None:
        """Two jobs are pinned with real stage bodies and source-bound observations before execution."""
        protocol = self._prepare()
        self.assertEqual(len(protocol["jobs"]), 2)
        self.assertEqual(protocol["maximum_review_invocations"], 30)
        self.assertFalse(protocol["simulated_probabilities"])
        self.assertTrue(all("condition" not in job for job in protocol["jobs"]))
        self.assertEqual(self.packet["evidence"][1]["kind"], "observation")
        plans = [json.loads(item["text"]) for item in self.packet["evidence"] if item["kind"] == "generated_plan"]
        self.assertTrue(all(plan["integrated_record"]["artifact_body"] for plan in plans))
        with patch("study_reviewer.subprocess.run") as process:
            self.assertEqual(review_study(self.output, "unavailable")["status"], "prepared_not_executed")
            process.assert_not_called()

    def test_mismatched_browser_evidence_is_rejected(self) -> None:
        """An observation of different HTML cannot receive credit for this candidate."""
        report = json.loads(self.observation_file.read_text())
        report["source_sha256"] = "0" * 64
        self.observation_file.write_text(json.dumps(report))
        with self.assertRaisesRegex(ValueError, "exact retained Build"):
            self._prepare()

    def test_more_than_thirty_review_jobs_fail_before_any_invocation(self) -> None:
        """A changed or oversized schedule cannot exceed the stated review-call maximum."""
        protocol = self._prepare()
        protocol["jobs"] = [dict(protocol["jobs"][0], job_id=f"review-{i:03d}") for i in range(31)]
        protocol["protocol_hash"] = stable_hash({k: v for k, v in protocol.items() if k != "protocol_hash"})
        (self.output / "protocol.json").write_text(json.dumps(protocol))
        with patch("study_reviewer.subprocess.run") as process:
            with self.assertRaisesRegex(ValueError, "thirty review invocations"):
                review_study(self.output, "unavailable", execute=True)
            process.assert_not_called()

    def test_thirty_jobs_are_each_dispatched_once_with_at_most_five_workers(self) -> None:
        """Concurrency reduces latency without multiplying attempts or changing submitted order."""
        protocol = self._prepare()
        protocol["jobs"] = [{"job_id": f"review-{i:03d}", "packet_id": "fixture", "reviewer_id": f"r{i}"} for i in range(30)]
        lock, active, maximum, seen = threading.Lock(), 0, 0, []

        def fake_job(output: Path, plan: dict, job: dict, executable: str, timeout: int) -> dict:
            nonlocal active, maximum
            with lock:
                active += 1
                maximum = max(maximum, active)
                seen.append(job["job_id"])
            time.sleep(0.01)
            with lock:
                active -= 1
            return {"job_id": job["job_id"], "status": "accepted"}

        with patch("study_scorecard.load_protocol", return_value=protocol), patch("study_scorecard._review_job", side_effect=fake_job):
            result = review_study(self.output, "unavailable", execute=True, workers=5)
        self.assertEqual(result["attempted_reviews"], 30)
        self.assertEqual(len(seen), len(set(seen)))
        self.assertGreater(maximum, 1)
        self.assertLessEqual(maximum, 5)
        dispatch = json.loads((self.output / "dispatch.json").read_text())
        self.assertEqual(dispatch["submitted_order"], [job["job_id"] for job in protocol["jobs"]])
        with self.assertRaisesRegex(ValueError, "one to five"):
            review_study(self.output, "unavailable", workers=6)

    def test_two_fresh_reviews_aggregate_raw_indices_and_disagreement_without_sampling(self) -> None:
        """One candidate has two model judgments, one replication, and no simulated probability output."""
        self._prepare()
        self.assertEqual(self._review()["accepted_reviews"], 2)
        self.assertEqual(len(set(self.working_directories)), 2)
        with patch("scorecard_sampling.conditional_samples", side_effect=AssertionError("Sampling is forbidden")):
            summary = aggregate_study(self.output, load_protocol(self.output))
        self.assertEqual(summary["review_count"], 2)
        self.assertEqual(len(summary["candidates"]), 1)
        self.assertEqual(summary["candidates"][0]["axes"]["learning"]["mean_index"], 62.5)
        self.assertEqual(summary["absolute_criterion_disagreement"]["mean"], 1)
        self.assertFalse(summary["simulated_probabilities"])
        self.assertEqual(summary, aggregate_study(self.output, load_protocol(self.output)))
        with patch("study_reviewer.subprocess.run") as process:
            review_study(self.output, "unavailable", execute=True)
            process.assert_not_called()

    def test_unknown_criteria_remain_unknown_in_candidate_and_condition_axes(self) -> None:
        """One missing practice rating is never replaced with another reviewer's score or zero."""
        self._prepare()
        self.unknown = True
        self._review()
        summary = aggregate_study(self.output, load_protocol(self.output))
        self.assertIsNone(summary["candidates"][0]["axes"]["learning"]["mean_index"])
        self.assertEqual(summary["condition_groups"][0]["axes"]["learning"]["unknown_count"], 1)
        self.assertEqual(summary["absolute_criterion_disagreement"]["unknown_count"], 1)

    def test_observed_configuration_notices_are_retained_without_ignoring_real_errors(self) -> None:
        """Exact captured CLI configuration notices do not invalidate an otherwise isolated review."""
        protocol = self._prepare()
        fixture = Path(__file__).parent / "fixtures/codex-configuration-warnings.json"
        self.configuration_events = json.loads(fixture.read_text())["events"]
        self.assertEqual(self._review()["accepted_reviews"], 2)
        for job in protocol["jobs"]:
            folder = self.output / "reviews" / job["job_id"]
            result = json.loads((folder / "result.json").read_text())
            self.assertEqual(len(result["configuration_warnings"]), 4)
            raw_events = [json.loads(line) for line in (folder / "provider.jsonl").read_text().splitlines()]
            self.assertEqual(raw_events[:4], self.configuration_events)
        from study_reviewer import _known_configuration_notice
        self.assertFalse(_known_configuration_notice({"type": "error", "message": "Provider failed: request rejected"}))
        changed = dict(self.configuration_events[0]["item"], message=self.configuration_events[0]["item"]["message"] + " Provider request failed.")
        self.assertFalse(_known_configuration_notice(changed))

    def test_invalid_quotes_are_retained_as_unknown_without_retry(self) -> None:
        """Schema-shaped but unsupported ratings cannot become accepted evidence."""
        self._prepare()
        self.bad_quote = True
        self.assertEqual(self._review()["accepted_reviews"], 0)
        summary = aggregate_study(self.output, load_protocol(self.output))
        self.assertEqual(summary["failed_review_count"], 2)
        self.assertIsNone(summary["candidates"][0]["axes"]["system_performance"]["mean_index"])
        with patch("study_reviewer.subprocess.run") as process:
            review_study(self.output, "unavailable", execute=True)
            process.assert_not_called()

    def test_tool_activity_is_rejected_and_an_unfinished_set_cannot_reveal(self) -> None:
        """Tool-enabled evidence access cannot masquerade as an isolated blind judgment."""
        self._prepare()
        with self.assertRaisesRegex(ValueError, "not found"):
            aggregate_study(self.output, load_protocol(self.output))
        self.assertFalse((self.output / "freeze.json").exists())
        self.tool_activity = True
        self.assertEqual(self._review()["accepted_reviews"], 0)
        summary = aggregate_study(self.output, load_protocol(self.output))
        self.assertEqual(summary["failed_review_count"], 2)


if __name__ == "__main__":
    unittest.main()
