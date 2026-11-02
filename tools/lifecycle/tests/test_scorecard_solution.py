"""Protect full-solution evidence boundaries and compatibility with frozen artifact-only reviews."""
from __future__ import annotations

import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from experiment_config import default_config
from experiment_fixture import DryRunProvider
from experiment_runtime import run_experiment
from experiment_scenarios import apply_scenario, get_scenario
from experiment_scorecard import (build_blind_packet, compare_frozen, default_settings, freeze_review,
                                  review_template, unblind_scorecards, validate_frozen, validate_packet)
from experiment_scorecard_store import create_packets
from scorecard_blind import blind_review_prompt
from scorecard_contract import stable_hash
from scorecard_solution import LABELS, PLAN_BOUNDARY, packet_scope, solution_evidence


class FullSolutionTests(unittest.TestCase):
    """Use technical fixtures to test evidence transport without claiming scientific outcomes."""

    def setUp(self) -> None:
        """Generate one fresh offline run under a declared scenario."""
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.config = apply_scenario(default_config(), "feedback-conversation")["config"]
        self.config["name"] = "PRIVATE_CONDITION_LABEL"
        self.run = run_experiment(self.config, self.root, DryRunProvider()).run
        self.scenario = get_scenario("feedback-conversation")
        self.settings = default_settings()
        self.settings.update(draws=100, cohort_size=5)

    def test_full_solution_keeps_executable_build_and_eight_generated_plans(self) -> None:
        """Plans supply design evidence while retained Build source remains the only executable item."""
        packet, mapping = build_blind_packet(self.run, self.scenario, ["A supplied observation."])
        build = [event for event in self.run["events"] if event["kind"] == "artifact" and event["stage"] == "build"][-1]
        self.assertEqual(packet["schema_version"], 2)
        self.assertEqual(packet_scope(packet), "full_solution")
        self.assertEqual(packet["evidence"][0]["text"], build["payload"]["content"]["prototype_html"])
        self.assertEqual(packet["evidence"][1]["kind"], "observation")
        plans = [json.loads(item["text"]) for item in packet["evidence"] if item["kind"] == "generated_plan"]
        self.assertEqual([plan["stage"] for plan in plans], list(LABELS.values()))
        self.assertTrue(all(plan["evidence_boundary"] == PLAN_BOUNDARY for plan in plans))
        encoded = json.dumps(packet)
        for private in ("PRIVATE_CONDITION_LABEL", self.run["id"], "config_hash", "actor_id", "source_actor_id", "prior_contributions"):
            self.assertNotIn(private, encoded)
        self.assertTrue(all("prototype_html" not in plan["integrated_record"] and "message" not in plan["integrated_record"] for plan in plans))
        self.assertEqual(mapping["evaluation_scope"], "full_solution")
        self.assertIn("Proposed repairs and later plans receive no implementation credit", blind_review_prompt(packet))
        self.assertEqual(validate_packet(packet), packet)

    def test_latest_integrated_record_replaces_old_plan_without_member_transcripts(self) -> None:
        """A later plan updates the plan snapshot and cannot silently replace the executable source."""
        events = [
            {"kind": "artifact", "stage": "refine", "payload": {"content": {"artifact_body": "Old plan."}}},
            {"kind": "contribution", "stage": "refine", "payload": {"content": {"message": "PRIVATE_MEMBER_TRANSCRIPT"}}},
            {"kind": "artifact", "stage": "refine", "agent": "PRIVATE_AGENT", "payload": {"content": {
                "artifact_body": "Propose a repaired reset path.", "prototype_html": "UNEXECUTED_SOURCE",
                "message": "PRIVATE_COORDINATOR_TRANSCRIPT", "evidence_refs": [1], "revisit_stage": "build"}}},
        ]
        plans = solution_evidence({"events": events}, 2)
        self.assertEqual(len(plans), 1)
        self.assertIn("Propose a repaired reset path", plans[0]["text"])
        for omitted in ("Old plan.", "PRIVATE_MEMBER", "PRIVATE_AGENT", "PRIVATE_COORDINATOR", "UNEXECUTED_SOURCE", "evidence_refs"):
            self.assertNotIn(omitted, plans[0]["text"])

    def test_legacy_complete_frozen_review_replays_without_rewriting_its_identity(self) -> None:
        """The real pre-migration v1 fixture retains its hashes, sampled results, and review."""
        path = Path(__file__).parent / "fixtures/scorecard-v1-frozen.json"
        frozen = json.loads(path.read_text())
        self.assertEqual(packet_scope(frozen["packet"]), "artifact")
        self.assertEqual(validate_frozen(frozen), frozen)
        self.assertNotIn("evaluation_scope", frozen["assessment"])

    def test_cross_scope_comparison_rejected_and_revealed_groups_remain_separate(self) -> None:
        """Additional design evidence cannot be pooled with artifact-only evidence as one treatment scale."""
        artifact, old_mapping = build_blind_packet(self.run, self.scenario, evaluation_scope="artifact")
        solution, new_mapping = build_blind_packet(self.run, self.scenario)
        before = freeze_review(artifact, review_template(artifact), self.settings)
        after = freeze_review(solution, review_template(solution), self.settings)
        with self.assertRaisesRegex(ValueError, "same evaluation scope"):
            compare_frozen(before, after)
        result = unblind_scorecards([before, after], [old_mapping, new_mapping])
        self.assertEqual({row["evaluation_scope"] for row in result["strata"]}, {"artifact", "full_solution"})
        self.assertEqual(len(result["strata"]), 2)
        self.assertEqual(validate_frozen(after), after)

    def test_scope_cannot_be_changed_after_the_evidence_set_is_pinned(self) -> None:
        """The same candidate cannot silently receive a different review evidence scope."""
        request = {"run_ids": [self.run["id"]], "scenario_id": "feedback-conversation", "evaluation_scope": "artifact"}
        first = create_packets(self.root, request)
        self.assertEqual(first["packets"][0]["schema_version"], 1)
        self.assertEqual(create_packets(self.root, request), first)
        with self.assertRaisesRegex(ValueError, "scope is already pinned"):
            create_packets(self.root, {**request, "evaluation_scope": "full_solution"})

    def test_version_two_cannot_masquerade_as_artifact_only_or_drop_all_plans(self) -> None:
        """Scope declarations and evidence kinds are validated before a reviewer sees the packet."""
        packet, _ = build_blind_packet(self.run, self.scenario)
        for change in ("scope", "evidence"):
            altered = copy.deepcopy(packet)
            if change == "scope":
                altered["evaluation_scope"] = "artifact"
            else:
                altered["evidence"] = altered["evidence"][:1]
            altered["packet_hash"] = stable_hash({key: value for key, value in altered.items() if key != "packet_hash"})
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, "full_solution|integrated stage"):
                validate_packet(altered)


if __name__ == "__main__":
    unittest.main()
