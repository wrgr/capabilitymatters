"""Verify that case changes preserve treatment assignments and pin auditable assumptions."""
import copy
import hashlib
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from experiment_config import apply_study_preset, legacy_config as default_config, resolve_config, upgrade_config
from experiment_scenarios import apply_scenario, get_scenario, scenario_catalog


class ScenarioTests(unittest.TestCase):
    """Protect controlled factors, reproducible references, and the sensitivity-model contract."""

    def test_cases_preserve_treatment_provider_schedule_and_coefficients(self) -> None:
        """An ablated comparison remains ablated with identical opportunities in every case."""
        source = apply_study_preset(default_config(), "ablation", "learning")
        source["execution"].update(provider="codex", model="pinned-test-model", repetitions=2)
        source["outcomes"]["assumptions"]["practice_gain_per_minute"] = 0.015
        original = copy.deepcopy(source)
        before = resolve_config(source)
        for case in scenario_catalog()["scenarios"]:
            with self.subTest(case=case["id"]):
                output = apply_scenario(source, case["id"])["config"]
                for field in ("team", "integration", "omit_competencies", "execution", "participation"):
                    self.assertEqual(output[field], source[field])
                for field in ("enabled", "model_id", "seed", "cohort_size", "assumptions", "criteria"):
                    self.assertEqual(output["outcomes"][field], source["outcomes"][field])
                self.assertEqual(resolve_config(output)["schedule"], before["schedule"])
                self.assertEqual(output["outcomes"]["conditions"], case["legacy_outcome_conditions"])
                self.assertEqual(output["challenges"], case["challenges"])
        self.assertEqual(source, original)

    def test_reference_hash_pins_the_rubric_and_profile_assumptions(self) -> None:
        """A reference binds the complete case, not just the visible task description."""
        case = get_scenario("science-evidence")
        encoded = json.dumps(case, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        reference = apply_scenario(default_config(), case["id"])["scenario_reference"]
        self.assertEqual(reference["scenario_hash"], hashlib.sha256(encoded.encode()).hexdigest())
        self.assertEqual(reference["catalog_version"], scenario_catalog()["version"])
        changed = copy.deepcopy(case)
        changed["axis_targets"]["learning"] = 71
        different = json.dumps(changed, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        self.assertNotEqual(reference["scenario_hash"], hashlib.sha256(different.encode()).hexdigest())

    def test_returned_cases_are_independent_and_unknown_cases_fail(self) -> None:
        """Editing a returned profile cannot alter a later case or select a fallback silently."""
        case = get_scenario("feedback-conversation")
        case["population_profiles"][0]["weight"] = 0
        self.assertEqual(get_scenario(case["id"])["population_profiles"][0]["weight"], 0.5)
        for unknown in ("nonexistent-case", "../default", None):
            with self.subTest(case=unknown), self.assertRaises(ValueError):
                apply_scenario(default_config(), unknown)

    def test_individual_participation_survives_case_application(self) -> None:
        """Changing a task cannot silently convert an individual run back into a team run."""
        source = apply_study_preset(default_config(), "individual")
        result = apply_scenario(source, "library-digital-access")["config"]
        self.assertEqual(result["participation"], source["participation"])
        self.assertEqual(resolve_config(result)["schedule"], resolve_config(source)["schedule"])

    def test_invalid_assumptions_are_rejected_before_application(self) -> None:
        """Malformed mixtures, nonfinite values, and omitted axes cannot reach a sampler."""
        valid = scenario_catalog()
        changes = (
            ("weight", 0.25),
            ("axis_shift", {"human_flourishing": 0, "system_performance": 0, "learning": float("nan")}),
            ("axis_sd", {"human_flourishing": 0, "system_performance": 0, "learning": 31}),
            ("axis_shift", {"learning": 0}),
        )
        for key, value in changes:
            invalid = copy.deepcopy(valid)
            invalid["scenarios"][0]["population_profiles"][0][key] = value
            with self.subTest(field=key, value=value), patch("experiment_scenarios.CATALOG_PATH") as catalog_path:
                catalog_path.read_text.return_value = json.dumps(invalid)
                with self.assertRaises(ValueError):
                    scenario_catalog()

    def test_legacy_upgrade_is_explicit_and_does_not_mutate_input(self) -> None:
        """Legacy callers receive schema two only in the returned configuration."""
        legacy = upgrade_config(default_config())
        legacy["schema_version"] = 1
        legacy.pop("participation")
        legacy.pop("outcomes")
        for actor in legacy["team"]:
            actor.pop("persona_ref")
        for challenge in legacy["challenges"]:
            challenge.pop("simulation_effects", None)
        original = copy.deepcopy(legacy)
        output = apply_scenario(legacy, "science-evidence")["config"]
        self.assertEqual(legacy, original)
        self.assertEqual(output["schema_version"], 2)
        self.assertEqual([a["competencies"] for a in output["team"]], [a["competencies"] for a in legacy["team"]])


if __name__ == "__main__":
    unittest.main()
