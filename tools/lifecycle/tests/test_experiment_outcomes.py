"""Verify transparent synthetic outcomes, fixed-cohort comparisons, and independence from persona labels."""
from __future__ import annotations

import copy
from decimal import Decimal
import math
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from experiment_outcomes import (assess_outcome, default_outcomes, design_schema, outcome_catalog,
                                 validate_design, validate_effects, validate_outcomes, visible_conditions)


def _design() -> dict:
    return {"practice_minutes": 10, "feedback": "specific", "revision_opportunity": True,
            "support_minutes_per_learner": 1, "offline_fallback": True,
            "choice_preserved": True, "personal_data": "none", "model_applicability": "within_scope", "scope_rationale": ""}


def _events(design: dict | None = None) -> list[dict]:
    decision = {"seq": 1, "hash": "a" * 64, "kind": "decision", "stage": "build", "agent": "orchestrator",
                "payload": {"response": {"design": copy.deepcopy(_design() if design is None else design)}, "technical_fixture": True}}
    artifact = {"seq": 2, "hash": "b" * 64, "kind": "artifact", "stage": "build", "agent": "orchestrator",
                "payload": {"trigger_seq": 1, "content_hash": "c" * 64}}
    return [decision, artifact]


def _challenge(seq: int, effects: dict) -> dict:
    return {"seq": seq, "hash": str(seq) * 64, "kind": "challenge", "stage": "evaluate", "agent": "scenario",
            "payload": {"id": "challenge-" + str(seq), "simulation_effects": effects}}


class ExperimentOutcomeTests(unittest.TestCase):
    """Protect simulation semantics without treating synthetic results as empirical learning evidence."""

    def setUp(self) -> None:
        """Use a small explicit design and independent default settings for every test."""
        self.config = {"outcomes": default_outcomes()}
        self.events = _events()

    def test_hand_calculable_probabilities_and_scope_are_reported(self) -> None:
        """The retained metrics expose the equations instead of hiding a persona-based score."""
        result = assess_outcome(self.config, self.events)
        learner, system = result["dimensions"]["learner"], result["dimensions"]["system"]
        self.assertAlmostEqual(learner["metrics"]["conditional_success_probability"], 0.75)
        self.assertAlmostEqual(system["metrics"]["coverage_fraction"], 0.98)
        self.assertEqual(system["metrics"]["support_capacity_fraction"], 1)
        self.assertAlmostEqual(learner["metrics"]["expected_success_fraction"], 0.735)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["scope"], "illustrative_declared_design_simulation")
        self.assertFalse(result["human_outcomes_observed"])
        self.assertFalse(result["candidate_implementation_verified"])
        self.assertEqual(result["input_origin"], "authored_fixture")
        self.assertTrue(any("uncalibrated" in item for item in result["limitations"]))

    def test_failure_and_partial_results_follow_criteria(self) -> None:
        """All, some, or no passing dimensions produce distinct outcomes from the same evaluation code."""
        design = _design()
        design.update(choice_preserved=False, personal_data="identified", offline_fallback=False)
        self.config["outcomes"]["conditions"].update(available_minutes=0, support_capacity_minutes=0, digital_access=0)
        failed = assess_outcome(self.config, _events(design))
        self.assertEqual(failed["status"], "failure")
        self.assertTrue(all(item["status"] == "failure" for item in failed["dimensions"].values()))
        self.config["outcomes"] = default_outcomes()
        design = _design()
        design["choice_preserved"] = False
        partial = assess_outcome(self.config, _events(design))
        self.assertEqual(partial["status"], "partial")
        self.assertEqual(partial["dimensions"]["human"]["status"], "failure")
        self.assertEqual(partial["dimensions"]["learner"]["status"], "success")

    def test_persona_competency_and_ablation_labels_do_not_change_results(self) -> None:
        """Identical designs and conditions score identically despite changed team labels or assignments."""
        altered = copy.deepcopy(self.config)
        altered.update(name="Guaranteed failure", omit_competencies=["measurement", "learning"],
                       study={"mode": "individual"}, integration={"mode": "handoff"},
                       team=[{"id": "expert", "persona": "unrelated", "competencies": []}])
        self.assertEqual(assess_outcome(self.config, self.events), assess_outcome(altered, self.events))

    def test_repeated_seed_is_exact_and_draws_are_paired(self) -> None:
        """Changing conditional learning probability keeps each simulated person's completion draw fixed."""
        baseline = assess_outcome(self.config, self.events)
        self.assertEqual(baseline, assess_outcome(copy.deepcopy(self.config), copy.deepcopy(self.events)))
        self.config["outcomes"]["assumptions"]["baseline_success"] = 0.7
        better = assess_outcome(self.config, self.events)
        self.assertEqual(baseline["dimensions"]["system"]["metrics"], better["dimensions"]["system"]["metrics"])
        self.assertGreaterEqual(better["dimensions"]["learner"]["metrics"]["success_count"], baseline["dimensions"]["learner"]["metrics"]["success_count"])
        self.assertNotEqual(baseline["assumption_hash"], better["assumption_hash"])

    def test_support_capacity_and_offline_access_change_outcomes(self) -> None:
        """Declared support demand and fallback interact with resources through exposed calculations."""
        design = _design()
        design["support_minutes_per_learner"] = 5
        constrained = assess_outcome(self.config, _events(design))
        metrics = constrained["dimensions"]["system"]["metrics"]
        self.assertEqual(metrics["support_minutes_requested_total"], 500)
        self.assertEqual(metrics["support_capacity_fraction"], 0.4)
        self.assertAlmostEqual(metrics["expected_completion_fraction"], 0.392)
        self.config["outcomes"]["conditions"]["digital_access"] = 0.5
        with_fallback = assess_outcome(self.config, self.events)
        design = _design()
        design["offline_fallback"] = False
        without_fallback = assess_outcome(self.config, _events(design))
        self.assertAlmostEqual(with_fallback["dimensions"]["system"]["metrics"]["coverage_fraction"], 0.9)
        self.assertEqual(without_fallback["dimensions"]["system"]["metrics"]["coverage_fraction"], 0.5)
        self.assertGreaterEqual(with_fallback["dimensions"]["system"]["metrics"]["completion_count"], without_fallback["dimensions"]["system"]["metrics"]["completion_count"])

    def test_challenge_effects_follow_only_the_visible_event_prefix(self) -> None:
        """Future configured events do not leak into earlier state and later effects replace only named conditions."""
        self.config["challenges"] = [{"id": "future", "simulation_effects": {"available_minutes": 0}}]
        self.assertEqual(visible_conditions(self.config, self.events)["available_minutes"], 20)
        first = _challenge(3, {"available_minutes": 5})
        second = _challenge(4, {"available_minutes": 8, "digital_access": 0.5})
        self.assertEqual(visible_conditions(self.config, self.events + [first])["available_minutes"], 5)
        current = visible_conditions(self.config, self.events + [first, second])
        self.assertEqual(current, {"available_minutes": 8, "support_capacity_minutes": 200, "digital_access": 0.5})
        result = assess_outcome(self.config, self.events + [first])
        self.assertEqual(result["dimensions"]["learner"]["metrics"]["effective_practice_minutes"], 5)
        self.assertFalse(result["dimensions"]["human"]["metrics"]["checks"]["practice_fits_available_time"])
        self.assertEqual(result["applied_challenge_effects"][0]["evidence_ref"]["event_seq"], 3)

    def test_missing_or_disabled_design_is_indeterminate(self) -> None:
        """The evaluator never fills missing design choices by reading narrative or persona labels."""
        self.events[0]["payload"]["response"] = {"artifact_body": "This definitely succeeds."}
        missing = assess_outcome(self.config, self.events)
        self.assertEqual(missing["status"], "indeterminate")
        self.assertIsNone(missing["design_source"])
        self.assertEqual(missing["input_origin"], "unavailable")
        self.assertTrue(all(item["status"] == "indeterminate" for item in missing["dimensions"].values()))
        self.config["outcomes"]["enabled"] = False
        self.events[0]["payload"]["response"]["design"] = {"invalid": True}
        self.assertEqual(assess_outcome(self.config, self.events)["status"], "indeterminate")

    def test_only_build_decisions_drive_the_model(self) -> None:
        """A specialist contribution or later non-Build narrative cannot replace the accepted design."""
        baseline = assess_outcome(self.config, self.events)
        ignored = copy.deepcopy(self.events[0])
        ignored.update(seq=3, kind="contribution", agent="another-actor")
        ignored["payload"]["response"]["design"]["choice_preserved"] = False
        self.assertEqual(baseline, assess_outcome(self.config, self.events + [ignored]))
        ignored.update(kind="decision", stage="evaluate")
        self.assertEqual(baseline, assess_outcome(self.config, self.events + [ignored]))

    def test_sources_and_parameter_hashes_remain_inspectable(self) -> None:
        """Assessments preserve exact design-event and artifact identities and distinguish changed parameters."""
        result = assess_outcome(self.config, self.events)
        source = result["design_source"]
        self.assertEqual((source["decision_seq"], source["decision_hash"]), (1, "a" * 64))
        self.assertEqual((source["artifact_seq"], source["artifact_hash"]), (2, "c" * 64))
        for dimension in result["dimensions"].values():
            self.assertEqual([ref["event_seq"] for ref in dimension["evidence_refs"]], [1, 2])
        self.config["outcomes"]["criteria"]["learner_success_min"] = 0.8
        revised = assess_outcome(self.config, self.events)
        self.assertEqual(result["assumption_hash"], revised["assumption_hash"])
        self.assertNotEqual(result["parameter_hash"], revised["parameter_hash"])
        self.assertEqual(result["model_hash"], revised["model_hash"])

    def test_outcome_settings_reject_invalid_and_nonfinite_inputs(self) -> None:
        """Every numeric bound rejects booleans, nonfinite values, and out-of-range settings."""
        for field, invalid in (("seed", -1), ("seed", 2**32), ("seed", 3.0), ("seed", True),
                               ("cohort_size", 0), ("cohort_size", 10001), ("enabled", 1), ("model_id", "unknown")):
            with self.subTest(field=field, invalid=invalid):
                settings = default_outcomes()
                settings[field] = invalid
                with self.assertRaises(ValueError):
                    validate_outcomes(settings)
        for invalid in (math.nan, math.inf, -math.inf, True, -0.1, 1.1, "0.5", 10**1000):
            with self.subTest(invalid=invalid):
                settings = default_outcomes()
                settings["conditions"]["digital_access"] = invalid
                with self.assertRaises(ValueError):
                    validate_outcomes(settings)
        with self.assertRaises(ValueError):
            validate_outcomes({**default_outcomes(), "expected_failure": True})

    def test_design_contract_rejects_untyped_or_incomplete_declarations(self) -> None:
        """Validation enforces declared fields and does not silently coerce design semantics."""
        for key, invalid in (("practice_minutes", 1.5), ("practice_minutes", True), ("practice_minutes", 121),
                             ("support_minutes_per_learner", math.nan), ("choice_preserved", 1),
                             ("feedback", "excellent"), ("personal_data", "sometimes"),
                             ("model_applicability", "guaranteed_success"), ("scope_rationale", None), ("scope_rationale", "x" * 2001)):
            with self.subTest(key=key, invalid=invalid):
                design = _design()
                design[key] = invalid
                with self.assertRaises(ValueError):
                    validate_design(design)
        for invalid in (None, {}, {**_design(), "success": True}):
            with self.assertRaises(ValueError):
                validate_design(invalid)
        self.assertEqual(set(design_schema()["required"]), set(_design()))

    def test_outside_scope_preserves_unmodeled_ideas_without_scoring(self) -> None:
        """An unrepresented mechanism receives a reviewable indeterminate result, never automatic credit or failure."""
        design = _design()
        rationale = "The intervention changes staffing and task routing; it does not depend on practice or feedback."
        design.update(model_applicability="outside_scope", scope_rationale=rationale)
        for resources in (0, 200):
            with self.subTest(resources=resources):
                self.config["outcomes"]["conditions"]["support_capacity_minutes"] = resources
                with patch("experiment_outcomes.random.Random", side_effect=AssertionError("Outside-scope designs must not be simulated")):
                    result = assess_outcome(self.config, _events(design))
                self.assertEqual(result["status"], "indeterminate")
                self.assertEqual(result["applicability_review"]["scope_rationale"], rationale)
                self.assertFalse(result["applicability_review"]["eligibility_verified"])
                self.assertEqual(result["applicability_review"]["origin"], "agent_claim")
                self.assertIn("awaiting human review", result["reason"])
                for dimension in result["dimensions"].values():
                    self.assertEqual(dimension["status"], "indeterminate")
                    self.assertEqual(dimension["metrics"], {})
                    self.assertIn(rationale, dimension["reason"])
                    self.assertEqual([ref["event_seq"] for ref in dimension["evidence_refs"]], [1, 2])

    def test_outside_scope_requires_a_bounded_explanation(self) -> None:
        """Scope claims remain explicit and reviewable instead of silently bypassing the model."""
        for rationale in ("", "   ", "x" * 2001, None):
            with self.subTest(rationale=rationale):
                design = _design()
                design.update(model_applicability="outside_scope", scope_rationale=rationale)
                with self.assertRaises(ValueError):
                    validate_design(design)
        design = _design()
        design.update(model_applicability="outside_scope", scope_rationale="A different mechanism needs a new model.")
        self.assertEqual(validate_design(design)["scope_rationale"], design["scope_rationale"])

    def test_challenge_effects_cannot_change_model_or_design(self) -> None:
        """Challenge mappings are bounded condition overrides and cannot encode an expected result."""
        self.assertEqual(validate_effects({}), {})
        self.assertEqual(validate_effects({"available_minutes": 5}), {"available_minutes": 5})
        for invalid in ({"baseline_success": 0}, {"seed": 7}, {"success": False}, {"digital_access": math.nan}):
            with self.assertRaises(ValueError):
                validate_effects(invalid)

    def test_defaults_and_inputs_are_independent(self) -> None:
        """Evaluation and editing do not mutate the source configuration, journal, or catalog defaults."""
        before = copy.deepcopy((self.config, self.events))
        assess_outcome(self.config, self.events)
        self.assertEqual((self.config, self.events), before)
        self.config["outcomes"]["conditions"]["available_minutes"] = 3
        self.assertEqual(default_outcomes()["conditions"]["available_minutes"], 20)
        definitions = outcome_catalog()
        self.assertEqual({item["id"] for item in definitions["presets"]}, {"adequate", "time_limited", "access_limited"})

    def test_numeric_inputs_are_portable_without_silent_rounding(self) -> None:
        """Integral numeric values normalize while precision finer than four places is rejected."""
        settings = default_outcomes()
        settings["conditions"]["available_minutes"] = 20.0
        settings["assumptions"]["feedback_gain"] = 1.0
        normalized = validate_outcomes(settings)
        self.assertIs(type(normalized["conditions"]["available_minutes"]), int)
        self.assertIs(type(normalized["assumptions"]["feedback_gain"]), int)
        self.assertEqual(validate_effects({"available_minutes": 5.0}), {"available_minutes": 5})
        design = _design()
        design["support_minutes_per_learner"] = 1.0
        self.assertIs(type(validate_design(design)["support_minutes_per_learner"]), int)
        self.assertEqual(validate_effects({"digital_access": 0.0001}), {"digital_access": 0.0001})
        for value in (0.00001, 0.12345, 0.10000000000000002):
            with self.assertRaisesRegex(ValueError, "four decimal"):
                validate_effects({"digital_access": value})

    def test_assessment_numbers_have_portable_serialization(self) -> None:
        """Recorded metrics contain no integral floats or tiny exponents that change browser hashes."""
        self.config["outcomes"]["cohort_size"] = 3
        result = assess_outcome(self.config, self.events)
        pending = [result]
        while pending:
            value = pending.pop()
            if isinstance(value, dict):
                pending.extend(value.values())
            elif isinstance(value, list):
                pending.extend(value)
            elif type(value) is float:
                self.assertFalse(value.is_integer())
                self.assertGreaterEqual(Decimal(str(value)).as_tuple().exponent, -4)
        self.assertEqual(result["evidence_kind"], "illustrative_simulation")
        self.assertEqual(result["numeric_precision"]["reported_decimal_places"], 4)

    def test_threshold_checks_match_reported_quantized_fractions(self) -> None:
        """An exact reported threshold cannot contradict its displayed criterion status."""
        self.config["outcomes"]["cohort_size"] = 3
        self.config["outcomes"]["criteria"].update(learner_success_min=0.6667, system_completion_min=0.6667)
        with patch("experiment_outcomes.random.Random") as generator:
            generator.return_value.random.side_effect = [0.1, 0.1, 0.1, 0.1, 0.9999, 0.1]
            result = assess_outcome(self.config, self.events)
        self.assertEqual(result["dimensions"]["learner"]["metrics"]["success_count"], 2)
        self.assertEqual(result["dimensions"]["learner"]["metrics"]["sampled_success_fraction"], 0.6667)
        self.assertEqual(result["dimensions"]["learner"]["status"], "success")
        self.assertEqual(result["dimensions"]["system"]["status"], "success")


if __name__ == "__main__":
    unittest.main()
