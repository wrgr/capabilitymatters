"""Check flower responsibility contrasts, controlled work slots, and truthful offline execution records."""
from __future__ import annotations

import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import verify
from experiment_batch import default_comparison, plan_comparison, run_batch, validate_comparison
from experiment_config import apply_study_preset, catalog, default_config, legacy_config, resolve_config, validate_config
from experiment_flower import DEFAULT_DOMAIN


class FlowerExperimentTests(unittest.TestCase):
    """Protect the methodological distinctions between domains, people, and available effort."""

    def setUp(self) -> None:
        """Use one repetition so every contrast can be executed without external model calls."""
        self.config = default_config()
        self.config["execution"]["repetitions"] = 1
        self.spec = default_comparison(self.config)

    def test_default_is_eight_domains_and_forty_slots(self) -> None:
        """The initial flower allocates four contributions per domain plus eight decisions."""
        resolved = resolve_config(self.config)
        domains = catalog()["flower"]["domains"]
        self.assertEqual([item["name"] for item in domains], [
            "Learning Sciences", "Learning Experience Design", "Data Science", "Assessment, Measurement, Evaluation",
            "Learning Environment Engineering", "Software Engineering", "Subject-Matter Expertise", "Education and Training Professionals"])
        self.assertEqual(set(resolved["coverage"]), {item["id"] for item in domains})
        self.assertEqual(resolved["planned_calls"], 40)
        for domain in domains:
            self.assertEqual(sum(domain["id"] in slot["competency_ids"] for slot in resolved["execution_plan"]), 4)
        self.assertEqual(sum(slot["kind"] == "decision" for slot in resolved["execution_plan"]), 8)
        self.assertFalse(self.config["outcomes"]["enabled"])
        self.assertEqual(resolved["role_contract"]["framework"]["center"], "Shared understanding")
        self.assertEqual(resolved["role_contract"]["framework"]["task_lenses"], [])

    def test_shared_responsibilities_survive_all_five_conditions(self) -> None:
        """Changing a domain never withdraws learner connection or shared understanding."""
        duties = set(catalog()["flower"]["shared_responsibilities"])
        for plan in plan_comparison(self.config, self.spec):
            resolved = resolve_config(plan["config"])
            for profile in resolved["role_contract"]["roles"].values():
                self.assertTrue(duties <= set(profile["duties"]))
                self.assertEqual(profile["proficiency_targets"], {})
            self.assertNotIn('"D1"', json.dumps(resolved["role_contract"]))

    def test_omission_and_withdrawal_preserve_work_but_removal_loses_it(self) -> None:
        """Instruction changes retain slots; availability changes expose their capacity loss."""
        plans = plan_comparison(self.config, self.spec)
        self.assertEqual([item["planned_calls"] for item in plans], [40, 40, 40, 36, 40])
        reference = plans[0]["comparison_signature"]
        unchanged = ("case_hash", "environment_hash", "challenges_hash", "outcomes_hash", "execution_hash", "integration_hash")
        for item in plans:
            for field in unchanged:
                self.assertEqual(item["comparison_signature"][field], reference[field])
        for item in (plans[1], plans[2], plans[4]):
            self.assertEqual(item["comparison_signature"]["opportunities_hash"], reference["opportunities_hash"])
        self.assertEqual(plans[3]["flower_intervention"]["lost_slots"], 4)
        self.assertEqual(plans[4]["comparison_signature"]["competency_exposure_hash"], reference["competency_exposure_hash"])
        self.assertTrue(all(item["flower_intervention"]["omission_and_withdrawal_coincide"] for item in plans))

    def test_overlap_preserves_a_colleagues_contribution(self) -> None:
        """Withdrawing one member's domain leaves explicit redundancy; global omission removes both."""
        self.config["team"][1]["competencies"].append(DEFAULT_DOMAIN)
        self.config["team"][1]["persona_ref"] = None
        plans = plan_comparison(self.config, self.spec)
        omitted = resolve_config(plans[1]["config"])
        withdrawn = resolve_config(plans[2]["config"])
        self.assertEqual(omitted["coverage"][DEFAULT_DOMAIN]["scheduled_actors"], [])
        self.assertEqual(withdrawn["coverage"][DEFAULT_DOMAIN]["scheduled_actors"], ["member-1"])
        self.assertFalse(plans[2]["flower_intervention"]["omission_and_withdrawal_coincide"])
        self.assertEqual(plans[2]["flower_intervention"]["other_assigned_actors"], ["member-1"])
        module = next(item for item in catalog()["competencies"] if item["id"] == DEFAULT_DOMAIN)
        for profile in omitted["role_contract"]["roles"].values():
            self.assertTrue(set(module["instructions"]).isdisjoint(profile["duties"]))
        self.assertEqual(resolve_config(plans[0]["config"])["schedule"], withdrawn["schedule"])

    def test_single_default_retains_flower_exposure(self) -> None:
        """One identity receives the same domain responsibilities in the same scheduled slots."""
        team = resolve_config(self.config)
        individual = resolve_config(apply_study_preset(self.config, "individual"))
        self.assertEqual({slot["actor_id"] for slot in individual["execution_plan"]}, {"individual"})
        for field in ("opportunities_hash", "competency_exposure_hash", "behavior_hash", "authority_hash"):
            self.assertEqual(individual["comparison_signature"][field], team["comparison_signature"][field])
        self.assertEqual(individual["comparison_signature"]["individual_filtered_competencies"], [])

    def test_zero_domain_coverage_preserves_the_flower_and_shared_duties(self) -> None:
        """Removing every explicit domain cannot silently turn a flower study into a legacy run."""
        for actor in [*self.config["team"], self.config["participation"]["individual"]]:
            actor.update(competencies=[], persona_ref=None)
        self.config["omit_competencies"] = []
        resolved = resolve_config(self.config)
        self.assertEqual(resolved["config"]["framework"], "learning-engineering-flower-v1")
        self.assertEqual(len(resolved["coverage"]), 8)
        self.assertTrue(all(not row["scheduled_actors"] for row in resolved["coverage"].values()))
        duties = catalog()["flower"]["shared_responsibilities"]
        self.assertTrue(all(profile["duties"] == duties for profile in resolved["role_contract"]["roles"].values()))

    def test_imported_flower_assignments_pin_identity_before_withdrawal(self) -> None:
        """An older unmarked export gains stable flower provenance without modifying legacy files."""
        del self.config["framework"]
        self.assertEqual(validate_config(self.config)["framework"], "learning-engineering-flower-v1")
        legacy = legacy_config()
        legacy["participation"]["individual"]["competencies"] = [DEFAULT_DOMAIN]
        legacy["participation"]["individual"]["persona_ref"] = None
        self.assertEqual(validate_config(legacy)["framework"], "learning-engineering-flower-v1")
        self.assertNotIn("framework", validate_config(legacy_config()))

    def test_invalid_target_and_unexposed_domain_fail_before_execution(self) -> None:
        """A contrast cannot silently change the selected member or invent a missing exposure."""
        for target in ("coordinator", "unknown", "member-1"):
            spec = {**self.spec, "actor_id": target}
            with self.subTest(target=target), self.assertRaises(ValueError):
                plan_comparison(self.config, spec)
        self.config["execution"]["through"] = "understand"
        with self.assertRaisesRegex(ValueError, "no contribution slots"):
            plan_comparison(self.config, self.spec)
        with self.assertRaisesRegex(ValueError, "flower domain"):
            validate_comparison({**self.spec, "competency": "measurement"})

    def test_legacy_baseline_keeps_original_modules_and_no_flower_duties(self) -> None:
        """Historical configurations remain a separate twenty-one-call instruction system."""
        legacy = resolve_config(legacy_config())
        self.assertEqual(legacy["planned_calls"], 21)
        self.assertEqual(set(legacy["coverage"]), {"framing", "systems", "learning", "design", "implementation", "measurement", "human"})
        self.assertEqual(legacy["role_contract"]["roles"]["orchestrator"]["duties"], [])
        self.assertNotIn("center", legacy["role_contract"]["framework"])

    def test_offline_five_way_run_verifies_all_196_calls_without_outcome_claims(self) -> None:
        """Each condition produces its own intact journal and remains labeled a pipeline check."""
        saved = copy.deepcopy(self.config)
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            result = run_batch(self.config, root, comparison=self.spec)
            self.assertEqual(result["status"], "completed")
            self.assertEqual(result["result_kind"], "pipeline_check")
            self.assertEqual(result["planned_total_calls"], 196)
            self.assertEqual(sum(item["observed"]["requests"] for item in result["plans"]), 196)
            for item in result["plans"]:
                run = json.loads((root / item["run_id"] / "run.json").read_text())
                self.assertTrue(verify(run))
                self.assertEqual(run["mode"], "experimental-dry-run")
                self.assertFalse(any(event["kind"] == "outcome_assessment" for event in run["events"]))
        self.assertEqual(self.config, saved)


if __name__ == "__main__":
    unittest.main()
