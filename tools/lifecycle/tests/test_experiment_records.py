"""Exercise immutable iteration lineage and blind-review reveal boundaries on actual offline journals."""
from __future__ import annotations

import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from experiment_config import default_config
from experiment_iteration import create_iteration, link_execution, read_iteration, verify_execution_iteration
from experiment_records import hash_value, read_record, write_immutable
from experiment_runtime import create_experiment, execute_experiment
from experiment_scenarios import apply_scenario
from experiment_scorecard import review_template, scorecard_catalog
from experiment_scorecard_store import create_packets, freeze_stored_review, reveal_stored_reviews


class ImmutableReviewTests(unittest.TestCase):
    """Test provenance and blinding without live model calls or invented competency findings."""

    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        case = apply_scenario(default_config(), "feedback-conversation")
        self.settings = scorecard_catalog()["defaults"]
        self.settings.update(draws=100, cohort_size=5)
        self.body = {"config": case["config"], "comparison": None, "scenario_reference": case["scenario_reference"],
                     "scorecard_assumptions": self.settings, "change_note": "Establish the prospective case."}

    def _run(self, iteration: dict | None = None) -> dict:
        journal = create_experiment(self.body["config"], self.root)
        link_execution(self.root, iteration, journal.run["id"], "run")
        execute_experiment(journal)
        return journal.run

    def test_iteration_forks_pin_parents_and_reject_edited_execution(self) -> None:
        parent = create_iteration(self.root, self.body)
        fork_body = {**self.body, "change_note": "Change the task constraints prospectively.",
                     "parent_iteration_id": parent["iteration_id"], "parent_hash": parent["content_hash"]}
        fork = create_iteration(self.root, fork_body)
        self.assertNotEqual(parent["iteration_id"], fork["iteration_id"])
        self.assertEqual(read_iteration(self.root, parent["iteration_id"]), parent)
        self.assertEqual(verify_execution_iteration(self.root, parent["iteration_id"], self.body["config"], None), parent)
        edited = copy.deepcopy(self.body["config"])
        edited["seed"]["constraints"] += " A newly changed requirement."
        with self.assertRaisesRegex(ValueError, "save a new iteration"):
            verify_execution_iteration(self.root, parent["iteration_id"], edited, None)
        fork_body["parent_hash"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "Parent iteration hash"):
            create_iteration(self.root, fork_body)

    def test_freeze_reveal_has_no_journal_mutation_and_blocks_score_revision(self) -> None:
        iteration = create_iteration(self.root, self.body)
        run = self._run(iteration)
        path = self.root / run["id"] / "run.json"
        original = path.read_bytes()
        result = create_packets(self.root, {"run_ids": [run["id"]], "scenario_id": "feedback-conversation",
                                           "iteration_id": iteration["iteration_id"]})
        packet = result["packets"][0]
        repeated = create_packets(self.root, {"run_ids": [run["id"]], "scenario_id": "feedback-conversation"})
        self.assertEqual(repeated["private_mapping"], result["private_mapping"])
        self.assertNotIn("run_id", packet)
        self.assertNotIn("condition", packet)
        self.assertEqual(result["private_mapping"]["mappings"][0]["iteration"], iteration["iteration_id"])
        review = review_template(packet)
        frozen = freeze_stored_review(self.root, packet, review, self.settings)
        self.assertEqual(frozen["assessment"]["status"], "incomplete")
        self.assertEqual(freeze_stored_review(self.root, packet, review, self.settings), frozen)
        reveal_stored_reviews(self.root, [frozen], result["private_mapping"])
        with self.assertRaisesRegex(ValueError, "unblinded"):
            freeze_stored_review(self.root, packet, review, self.settings)
        with self.assertRaisesRegex(ValueError, "revealed"):
            create_packets(self.root, {"run_ids": [run["id"]], "scenario_id": "feedback-conversation"})
        self.assertEqual(path.read_bytes(), original)

    def test_reveal_requires_exact_frozen_set_and_preserves_unknowns(self) -> None:
        runs = [self._run(), self._run()]
        result = create_packets(self.root, {"run_ids": [r["id"] for r in runs], "scenario_id": "feedback-conversation"})
        frozen = [freeze_stored_review(self.root, p, review_template(p), result["settings"]) for p in result["packets"]]
        with self.assertRaises(ValueError):
            reveal_stored_reviews(self.root, frozen[:1], result["private_mapping"])
        first = next(item for item in result["private_mapping"]["mappings"] if item["packet_id"] == frozen[0]["packet_id"])
        subset = {"schema_version": 1, "mappings": [first]}
        subset["manifest_hash"] = hash_value(subset)
        with self.assertRaisesRegex(ValueError, "complete original"):
            reveal_stored_reviews(self.root, frozen[:1], subset)
        with self.assertRaisesRegex(ValueError, "every candidate"):
            create_packets(self.root, {"run_ids": [runs[0]["id"]], "scenario_id": "feedback-conversation"})
        altered = copy.deepcopy(frozen)
        altered[0]["locked_before_unblinding"] = False
        with self.assertRaises(ValueError):
            reveal_stored_reviews(self.root, altered, result["private_mapping"])
        for record in frozen:
            self.assertIsNone(record["assessment"]["axes"])
        output = reveal_stored_reviews(self.root, frozen, result["private_mapping"])
        self.assertEqual(len(output["reveal"]["record_hashes"]), 2)

    def test_immutable_records_reject_collision_and_path_identifiers(self) -> None:
        path = self.root / "record.json"
        write_immutable(path, {"value": 1})
        write_immutable(path, {"value": 1})
        with self.assertRaises(ValueError):
            write_immutable(path, {"value": 2})
        self.assertEqual(read_record(path), {"value": 1})
        self.assertEqual(hash_value({"value": 1.0}), hash_value({"value": 1}))
        with self.assertRaises(ValueError):
            read_iteration(self.root, "../record")

    def test_packet_scenario_and_prospective_assumptions_cannot_be_reassigned(self) -> None:
        """A task label or post-view threshold edit cannot convert a result into a different experiment."""
        iteration = create_iteration(self.root, self.body)
        run = self._run(iteration)
        with self.assertRaisesRegex(ValueError, "scenario version"):
            create_packets(self.root, {"run_ids": [run["id"]], "scenario_id": "science-evidence"})
        bundle = create_packets(self.root, {"run_ids": [run["id"]], "scenario_id": "feedback-conversation"})
        altered = copy.deepcopy(bundle["settings"])
        altered["thresholds"]["learning"] = 20
        packet = bundle["packets"][0]
        with self.assertRaisesRegex(ValueError, "pinned before"):
            freeze_stored_review(self.root, packet, review_template(packet), altered)
        unlinked = self._run()
        with self.assertRaisesRegex(ValueError, "does not match"):
            create_packets(self.root, {"run_ids": [unlinked["id"]], "scenario_id": "science-evidence"})

    def test_comparison_iteration_cannot_claim_a_single_or_changed_execution(self) -> None:
        """Iteration lineage must match the actual intervention plan as well as the base configuration."""
        comparison = {"schema_version": 1, "kind": "competency_emphasis", "competency": "learning", "integration_modes": ["explicit"]}
        saved = create_iteration(self.root, {**self.body, "comparison": comparison})
        self.assertEqual(verify_execution_iteration(self.root, saved["iteration_id"], self.body["config"], comparison), saved)
        with self.assertRaisesRegex(ValueError, "comparison changed"):
            verify_execution_iteration(self.root, saved["iteration_id"], self.body["config"], None)
        with self.assertRaisesRegex(ValueError, "comparison changed"):
            verify_execution_iteration(self.root, saved["iteration_id"], self.body["config"], {**comparison, "competency": "measurement"})


if __name__ == "__main__":
    unittest.main()
