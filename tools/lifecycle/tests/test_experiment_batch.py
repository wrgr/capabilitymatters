"""Check matched plans, retained failures, and human citations without invoking a live model."""
import copy
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import uuid

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import Journal, SCHEMA
from experiment_batch import execute_batch, plan_matrix, plan_repetitions, prepare_batch, run_batch
from experiment_config import default_config, resolve_config
from experiment_review import validate_review


def fixture_run(config: dict, output_root: Path, provider: object = None,
                parent: object = None, on_created: object = None) -> Journal:
    """Produce a verified miniature journal for transport and provenance assertions."""
    resolved = resolve_config(config)
    journal = Journal(output_root / ("fixture-" + uuid.uuid4().hex), config["seed"], "dry-run", role_profiles=resolved["role_contract"])
    if on_created is not None:
        on_created(journal)
    journal.append("request", "understand", "orchestrator", {"prompt": json.dumps(config)})
    response = {key: [] if field["type"] == "array" else "" for key, field in SCHEMA["properties"].items()}
    response.update(message="Pipeline fixture only", artifact_title="Fixture", artifact_body="No scientific findings", evidence_refs=[1])
    decision = journal.append("decision", "understand", "orchestrator", {"response": response})
    journal.artifact("understand", response, decision["seq"])
    journal.append("completed", "understand", "orchestrator", {"status": "dry_run_complete"})
    return journal


class BatchPlanTests(unittest.TestCase):
    def test_matrix_changes_only_declared_factors_and_preserves_repetitions(self) -> None:
        """The four cells preserve team, schedule, environment, challenge, and budget."""
        config = default_config()
        before = copy.deepcopy(config)
        plans = plan_matrix(config)
        self.assertEqual(config, before)
        self.assertEqual(len(plans), 12)
        self.assertEqual(len({item["item_id"] for item in plans}), 12)
        for item in plans:
            expected = copy.deepcopy(before)
            expected["execution"]["repetitions"] = 1
            if item["condition"] in ("B", "D"):
                expected["omit_competencies"].append("measurement")
            if item["condition"] in ("C", "D"):
                expected["integration"]["mode"] = "handoff"
            self.assertEqual(item["config"], expected)
        plans[0]["config"]["team"][0]["name"] = "Changed locally"
        self.assertNotEqual(plans[1]["config"]["team"][0]["name"], "Changed locally")

    def test_matrix_needs_measurement_exposure_but_custom_repetition_does_not(self) -> None:
        """A nominal presence condition cannot silently lack any assigned contribution."""
        config = default_config()
        for actor in config["team"]:
            actor["competencies"] = [value for value in actor["competencies"] if value != "measurement"]
        with self.assertRaisesRegex(ValueError, "Assign measurement"):
            plan_matrix(config)
        self.assertEqual(len(plan_repetitions(config)), 3)

    def test_matrix_restores_support_for_presence_cells_without_restoring_other_omissions(self) -> None:
        """The predefined comparison keeps unrelated user choices fixed."""
        config = default_config()
        config["omit_competencies"] = ["measurement", "learning"]
        plans = plan_matrix(config)
        self.assertEqual(plans[0]["config"]["omit_competencies"], ["learning"])
        self.assertEqual(plans[3]["config"]["omit_competencies"], ["learning", "measurement"])


class BatchExecutionTests(unittest.TestCase):
    def setUp(self) -> None:
        """Use temporary isolated run storage for each execution check."""
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.config = default_config()
        self.config["execution"]["repetitions"] = 1

    def test_fresh_runs_keep_expectations_out_of_inputs_and_link_artifacts(self) -> None:
        """Batch records are independent and review hypotheses never enter agent input."""
        received = []
        def run(config: dict, root: Path, **kwargs: object) -> Journal:
            received.append(copy.deepcopy(config))
            return fixture_run(config, root, **kwargs)
        with patch.dict(sys.modules, {"experiment_runtime": SimpleNamespace(run_experiment=run)}):
            result = run_batch(self.config, self.root, expectations=["SECRET hypothesis held for human review"])
        self.assertEqual(result["status"], "completed")
        self.assertEqual(len({row["run_id"] for row in result["plans"]}), 4)
        self.assertNotIn("SECRET", json.dumps(received))
        folder = self.root / "batches" / result["id"]
        comparison = json.loads((folder / "comparison.json").read_text())
        review = json.loads((folder / "review.json").read_text())
        self.assertEqual(comparison["result_kind"], "pipeline_check")
        self.assertEqual(comparison["completed_runs"], 4)
        self.assertEqual(review["expected_observations"], result["expected_observations"])
        for row in comparison["rows"]:
            self.assertTrue(row["journal_verified"])
            self.assertTrue((folder / row["run_path"]).is_file())
            self.assertIn("&event=", row["artifacts"][0]["replay_url"])
        with self.assertRaisesRegex(ValueError, "unchanged prepared batch"):
            execute_batch(result, self.root)

    def test_failed_runs_are_retained_and_later_conditions_still_execute(self) -> None:
        """A failed condition remains in the comparison rather than biasing its inventory."""
        seen = []
        def run(config: dict, root: Path, **kwargs: object) -> Journal:
            journal = fixture_run(config, root, **kwargs)
            seen.append(journal)
            if len(seen) == 2:
                journal.append("failure", "understand", "orchestrator", {"message": "fixture failed"})
                error = RuntimeError("fixture failed")
                error.journal = journal
                raise error
            return journal
        with patch.dict(sys.modules, {"experiment_runtime": SimpleNamespace(run_experiment=run)}):
            result = run_batch(self.config, self.root)
        self.assertEqual(len(seen), 4)
        self.assertEqual(result["status"], "completed_with_failures")
        failed = result["plans"][1]
        self.assertEqual(failed["status"], "failed")
        self.assertEqual(failed["run_id"], seen[1].run["id"])
        self.assertEqual(failed["run_head_hash"], seen[1].events[-1]["hash"])
        self.assertTrue(failed["journal_verified"])

    def test_catalog_change_and_changed_plan_prevent_execution(self) -> None:
        """A prepared batch cannot silently use different instructions."""
        batch = prepare_batch(self.config, self.root)
        changed = copy.deepcopy(batch)
        changed["plans"][0]["config"]["name"] = "changed"
        with self.assertRaisesRegex(ValueError, "unchanged prepared batch"):
            execute_batch(changed, self.root)
        def changed_catalog(config: dict) -> dict:
            resolved = resolve_config(config)
            resolved["catalog_hash"] = "changed"
            return resolved
        with patch("experiment_batch.resolve_config", side_effect=changed_catalog):
            with patch.dict(sys.modules, {"experiment_runtime": SimpleNamespace(run_experiment=fixture_run)}):
                result = execute_batch(batch, self.root)
        self.assertTrue(all(row["status"] == "failed" for row in result["plans"]))
        self.assertEqual(list(self.root.glob("*/run.json")), [])

    def test_review_requires_exact_event_hash_and_human_rationale(self) -> None:
        """A human score cannot cite a future, changed, or different artifact."""
        with patch.dict(sys.modules, {"experiment_runtime": SimpleNamespace(run_experiment=fixture_run)}):
            batch = run_batch(self.config, self.root, matrix=False)
        review = json.loads((self.root / "batches" / batch["id"] / "review.json").read_text())
        item = batch["plans"][0]
        run = json.loads((self.root / item["run_id"] / "run.json").read_text())
        self.assertEqual(validate_review(review, batch, {run["id"]: run}), review)
        artifact = item["artifacts"][0]
        entry = review["reviews"][0]
        entry["reviewer"] = "Test human reviewer"
        evidence = {"run_id": run["id"], "event_seq": artifact["event_seq"],
                    "event_hash": artifact["event_hash"], "artifact_hash": artifact["artifact_hash"]}
        entry["ratings"]["learner"] = {"score": 1, "rationale": "Fixture recognition only", "evidence": [evidence]}
        validate_review(review, batch, {run["id"]: run})
        evidence["event_hash"] = "wrong"
        with self.assertRaisesRegex(ValueError, "event hash"):
            validate_review(review, batch, {run["id"]: run})
        evidence["event_hash"] = artifact["event_hash"]
        entry["ratings"]["learner"]["score"] = True
        with self.assertRaisesRegex(ValueError, "integer from 0 to 3"):
            validate_review(review, batch, {run["id"]: run})

    def test_cancellation_before_execution_never_starts_a_run(self) -> None:
        """A cancellation received while prepared skips the entire planned execution."""
        batch = prepare_batch(self.config, self.root)
        folder = self.root / "batches" / batch["id"]
        (folder / "cancel.requested").write_text("User requested cancellation")
        with patch("experiment_batch._execute_item") as execute:
            result = execute_batch(batch, self.root)
        execute.assert_not_called()
        self.assertEqual(result["status"], "cancelled")
        self.assertTrue(all(item["status"] == "skipped" for item in result["plans"]))
        comparison = json.loads((folder / "comparison.json").read_text())
        self.assertEqual(comparison["skipped_runs"], 4)
        self.assertEqual(comparison["pending_runs"], 0)
        self.assertEqual(comparison["failed_runs"], 0)

    def test_created_run_is_replayable_from_the_batch_before_its_first_call(self) -> None:
        """Live trace identity is persisted while the row is running, not inferred afterward."""
        batch = prepare_batch(self.config, self.root, matrix=False)
        folder = self.root / "batches" / batch["id"]
        observed = []
        def run(config: dict, root: Path, **kwargs: object) -> Journal:
            callback = kwargs.pop("on_created")
            def check_created(journal: Journal) -> None:
                callback(journal)
                manifest = json.loads((folder / "manifest.json").read_text())
                row = manifest["plans"][0]
                observed.append(row)
                self.assertEqual(len(journal.events), 1)
                self.assertEqual(row["run_id"], journal.run["id"])
                self.assertEqual(row["status"], "running")
                self.assertEqual(row["trace_status"], "recording")
                self.assertTrue((folder / row["run_path"]).is_file())
                comparison = json.loads((folder / "comparison.json").read_text())
                self.assertEqual(comparison["rows"][0]["replay_url"], row["replay_url"])
            return fixture_run(config, root, on_created=check_created, **kwargs)
        with patch.dict(sys.modules, {"experiment_runtime": SimpleNamespace(run_experiment=run)}):
            result = execute_batch(batch, self.root)
        self.assertEqual(len(observed), 1)
        self.assertEqual(result["status"], "completed")
        self.assertEqual(result["plans"][0]["trace_status"], "retained")

    def test_cancellation_during_current_run_stops_before_the_next(self) -> None:
        """Stopping a batch preserves the current result without scheduling another run."""
        batch = prepare_batch(self.config, self.root)
        folder = self.root / "batches" / batch["id"]
        calls = []
        def run(config: dict, root: Path, **kwargs: object) -> Journal:
            calls.append(config)
            (folder / "cancel.requested").write_text("User requested cancellation")
            return fixture_run(config, root, **kwargs)
        with patch.dict(sys.modules, {"experiment_runtime": SimpleNamespace(run_experiment=run)}):
            result = execute_batch(batch, self.root)
        self.assertEqual(len(calls), 1)
        self.assertEqual(result["status"], "cancelled")
        self.assertEqual([row["status"] for row in result["plans"]], ["completed", "skipped", "skipped", "skipped"])
        comparison = json.loads((folder / "comparison.json").read_text())
        self.assertEqual(comparison["completed_runs"], 1)
        self.assertEqual(comparison["skipped_runs"], 3)
        self.assertEqual(comparison["running_runs"], 0)

    def test_cancelled_journal_is_not_misreported_as_failure(self) -> None:
        """An interrupted active run stays replayable and stops the remaining conditions."""
        def run(config: dict, root: Path, **kwargs: object) -> Journal:
            journal = fixture_run(config, root, **kwargs)
            journal.append("cancelled", "understand", "orchestrator", {"status": "cancelled"})
            error = RuntimeError("User cancelled the active run")
            error.journal = journal
            raise error
        with patch.dict(sys.modules, {"experiment_runtime": SimpleNamespace(run_experiment=run)}):
            result = run_batch(self.config, self.root)
        self.assertEqual(result["status"], "cancelled")
        row = result["plans"][0]
        self.assertEqual(row["status"], "cancelled")
        self.assertTrue(row["journal_verified"])
        self.assertIn("run_head_hash", row)
        comparison = json.loads((self.root / "batches" / result["id"] / "comparison.json").read_text())
        self.assertEqual(comparison["cancelled_runs"], 1)
        self.assertEqual(comparison["failed_runs"], 0)
        self.assertEqual(comparison["skipped_runs"], 3)

    def test_unexpected_orchestration_failure_persists_a_terminal_status(self) -> None:
        """Unexpected scheduler errors cannot leave a batch indefinitely marked running."""
        batch = prepare_batch(self.config, self.root)
        folder = self.root / "batches" / batch["id"]
        with patch("experiment_batch._execute_item", side_effect=RuntimeError("Unexpected scheduler failure")):
            with self.assertRaisesRegex(RuntimeError, "Unexpected scheduler"):
                execute_batch(batch, self.root)
        manifest = json.loads((folder / "manifest.json").read_text())
        comparison = json.loads((folder / "comparison.json").read_text())
        self.assertEqual(manifest["status"], "failed")
        self.assertEqual(manifest["error"]["phase"], "batch_orchestration")
        self.assertEqual(len(manifest["plans"]), 4)
        self.assertEqual(comparison["failed_runs"], 1)
        self.assertEqual(comparison["skipped_runs"], 3)
        self.assertEqual(comparison["running_runs"], 0)
        review = json.loads((folder / "review.json").read_text())
        self.assertTrue(all(entry["ratings"]["learner"]["score"] is None for entry in review["reviews"]))


if __name__ == "__main__":
    unittest.main()
