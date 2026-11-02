"""Preserve legacy experiment semantics while rejecting ambiguous assignments and manifests."""
import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from experiment_config import (STAGES, apply_persona, apply_study_preset, catalog, legacy_config as default_config,
                               resolve_config, upgrade_config, validate_config)


class ConfigurationTests(unittest.TestCase):
    """Exercise configuration boundaries that could invalidate an experimental comparison."""

    def setUp(self) -> None:
        """Load an independent baseline for each comparison."""
        self.config = default_config()

    def test_default_pins_explicit_modules_and_fixed_schedule(self) -> None:
        """A baseline resolves all assigned support with a known full-cycle call count."""
        resolved = resolve_config(self.config)
        self.assertEqual(resolved["planned_calls"], 21)
        self.assertEqual(list(resolved["schedule"]), list(STAGES))
        measurement_actor = next(actor["id"] for actor in self.config["team"] if "measurement" in actor["competencies"])
        self.assertIn(measurement_actor, resolved["schedule"]["design"])
        self.assertTrue(all(item["scheduled_actors"] for item in resolved["coverage"].values()))
        self.assertEqual(len(resolved["role_contract"]["roles"]), 9)
        self.assertEqual(resolved["role_contract"]["roles"]["orchestrator"]["actor_id"], "coordinator")
        self.assertEqual(resolved["role_contract"]["roles"]["orchestrator"]["duties"], [])

    def test_omission_reaches_contributors_and_coordinator(self) -> None:
        """Global omission cannot leak through coordinator copying or framework lenses."""
        self.config["team"][0]["competencies"] = ["measurement", "human"]
        self.config["omit_competencies"] = ["measurement"]
        resolved = resolve_config(self.config)
        source = next(item for item in catalog()["competencies"] if item["id"] == "measurement")
        serialized = json.dumps(resolved["role_contract"])
        for instruction in source["instructions"]:
            self.assertNotIn(instruction, serialized)
        for role in resolved["role_contract"]["roles"].values():
            self.assertNotIn("measurement", role["competency_ids"])
            self.assertFalse(set(role["focus_lenses"]) & set(source["task_lenses"]))
        self.assertNotIn('"D4"', serialized)
        self.assertEqual(resolved["coverage"]["measurement"]["scheduled_actors"], [])
        self.assertIn("coordinator", resolved["coverage"]["measurement"]["assigned_to"])
        self.assertEqual(resolved["planned_calls"], 21)

    def test_redistribution_preserves_support_without_inheritance(self) -> None:
        """Moving a module preserves coverage while recording its different actor assignment."""
        actor = next(item for item in self.config["team"] if "measurement" in item["competencies"])
        actor["competencies"].remove("measurement")
        self.config["team"][0]["competencies"].append("measurement")
        result = resolve_config(self.config)
        self.assertEqual(result["coverage"]["measurement"]["scheduled_actors"], ["coordinator"])
        self.assertIn("measurement", result["role_contract"]["roles"]["orchestrator"]["competency_ids"])
        self.assertEqual(result["role_contract"]["roles"][actor["id"]]["duties"], [])

    def test_unavailable_actors_do_not_contribute(self) -> None:
        """Unavailable contributors remain in configured assignments but leave runtime support."""
        actor = next(item for item in self.config["team"] if "measurement" in item["competencies"])
        actor["available"] = False
        result = resolve_config(self.config)
        self.assertNotIn(actor["id"], result["role_contract"]["roles"])
        self.assertEqual(result["planned_calls"], 18)
        self.assertEqual(result["coverage"]["measurement"]["assigned_to"], [actor["id"]])
        self.assertEqual(result["coverage"]["measurement"]["available_to"], [])
        self.assertTrue(any("measurement: no available" in item for item in result["warnings"]))

    def test_available_but_unscheduled_support_is_visible(self) -> None:
        """A profile without a contribution opportunity does not count as scheduled coverage."""
        actor = next(item for item in self.config["team"] if "measurement" in item["competencies"])
        actor["stages"] = []
        result = resolve_config(self.config)
        self.assertEqual(result["coverage"]["measurement"]["available_to"], [actor["id"]])
        self.assertEqual(result["coverage"]["measurement"]["scheduled_actors"], [])

    def test_handoff_retains_same_actor_schedule_and_allows_integration(self) -> None:
        """The integration contrast changes the duty without changing contribution opportunities."""
        explicit = resolve_config(self.config)
        self.config["integration"]["mode"] = "handoff"
        handoff = resolve_config(self.config)
        self.assertEqual(explicit["schedule"], handoff["schedule"])
        self.assertEqual(explicit["planned_calls"], handoff["planned_calls"])
        text = handoff["role_contract"]["roles"]["orchestrator"]["integration_instruction"]
        self.assertIn("spontaneously", text)
        self.assertIn("not prohibited", text)
        self.assertNotEqual(explicit["config_hash"], handoff["config_hash"])

    def test_partial_stage_count_and_unseen_challenge_warning(self) -> None:
        """The selected endpoint bounds calls and makes later unexposed challenges visible."""
        self.config["execution"]["through"] = "understand"
        result = resolve_config(self.config)
        self.assertEqual(result["planned_calls"], 3)
        self.assertTrue(any("will not be presented" in item for item in result["warnings"]))
        self.assertEqual(result["coverage"]["measurement"]["scheduled_actors"], [])

    def test_normalization_does_not_mutate_inputs(self) -> None:
        """Editing a resolved run cannot alter the caller's next experimental condition."""
        self.config["name"] = "  Study  "
        saved = copy.deepcopy(self.config)
        result = resolve_config(self.config)
        self.assertEqual(self.config, saved)
        self.assertEqual(result["config"]["name"], "Study")
        result["config"]["team"][0]["behavior"]["challenge"] = "persistent"
        self.assertEqual(self.config["team"][0]["behavior"]["challenge"], "balanced")
        self.assertEqual(default_config()["team"][0]["behavior"]["challenge"], "balanced")

    def test_hashes_ignore_object_key_order_and_track_behavior(self) -> None:
        """Manifest hashes are canonical while meaningful configuration changes remain visible."""
        first = resolve_config(self.config)
        reordered = dict(reversed(list(self.config.items())))
        self.assertEqual(first["config_hash"], resolve_config(reordered)["config_hash"])
        self.config["team"][1]["behavior"]["challenge"] = "persistent"
        changed = resolve_config(self.config)
        self.assertNotEqual(first["config_hash"], changed["config_hash"])
        self.assertEqual(first["catalog_hash"], changed["catalog_hash"])
        self.assertNotEqual(first["role_contract"]["roles"]["member-1"]["behavior_instructions"], changed["role_contract"]["roles"]["member-1"]["behavior_instructions"])

    def test_model_and_integer_limits_are_enforced(self) -> None:
        """Live models must be named and booleans cannot masquerade as numeric budgets."""
        self.config["execution"]["provider"] = "codex"
        with self.assertRaisesRegex(ValueError, "explicit model"):
            validate_config(self.config)
        self.config["execution"]["model"] = "named-model-version"
        self.assertEqual(validate_config(self.config)["execution"]["provider"], "codex")
        for field, value in (("repetitions", True), ("repetitions", 21), ("max_calls", 1), ("max_output_chars", 999)):
            candidate = copy.deepcopy(self.config)
            candidate["execution"][field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                validate_config(candidate)

    def test_reviewer_predictions_are_not_accepted_as_runtime_config(self) -> None:
        """Review hypotheses must remain outside the manifest sent through runtime assembly."""
        self.config["expected_gaps"] = ["The measurement condition should fail."]
        with self.assertRaisesRegex(ValueError, "exactly"):
            validate_config(self.config)

    def test_invalid_actor_and_assignment_inputs_are_rejected(self) -> None:
        """Malformed identities and assignments fail before any execution starts."""
        edits = [
            ("id", "../other"), ("id", "human"), ("id", "coordinator"),
            ("competencies", ["unknown"]), ("competencies", ["measurement", "measurement"]),
            ("stages", ["unlisted"]), ("stages", ["build", "build"]),
            ("available", "false"), ("authority", "administrator"),
            ("name", ""), ("role", "x" * 121),
        ]
        for key, value in edits:
            candidate = copy.deepcopy(self.config)
            candidate["team"][1][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                validate_config(candidate)

    def test_coordinator_and_challenge_constraints_are_enforced(self) -> None:
        """A stage recorder cannot be absent and challenge timing must be unambiguous."""
        candidate = copy.deepcopy(self.config)
        candidate["team"][0]["available"] = False
        with self.assertRaisesRegex(ValueError, "coordinator must be available"):
            validate_config(candidate)
        candidate = copy.deepcopy(self.config)
        candidate["integration"]["coordinator"] = "missing"
        with self.assertRaises(ValueError):
            validate_config(candidate)
        candidate = copy.deepcopy(self.config)
        candidate["challenges"].append(copy.deepcopy(candidate["challenges"][0]))
        with self.assertRaisesRegex(ValueError, "Challenge IDs must be unique"):
            validate_config(candidate)
        candidate = copy.deepcopy(self.config)
        candidate["challenges"][0]["stage"] = "afterwards"
        with self.assertRaises(ValueError):
            validate_config(candidate)

    def test_presets_are_complete_valid_and_differ_only_as_declared(self) -> None:
        """Distributed presets keep the same roster and opportunities for their contrast."""
        directory = Path(__file__).resolve().parents[3] / "src/data/lifecycle/experiments"
        presets = [validate_config(json.loads(path.read_text())) for path in (directory / "baseline.json", directory / "measurement-omitted.json")]
        self.assertGreaterEqual(len(presets), 2)
        schedules = [resolve_config(preset)["schedule"] for preset in presets]
        self.assertTrue(all(schedule == schedules[0] for schedule in schedules))
        self.assertEqual({tuple(preset["omit_competencies"]) for preset in presets}, {(), ("measurement",)})

    def test_legacy_configuration_keeps_its_original_fields_and_hash(self) -> None:
        """Version-one callers do not acquire new settings or a different canonical identity."""
        legacy = copy.deepcopy(self.config)
        legacy["schema_version"] = 1
        del legacy["participation"], legacy["outcomes"]
        for actor in legacy["team"]:
            del actor["persona_ref"]
        for challenge in legacy["challenges"]:
            challenge.pop("simulation_effects", None)
        resolved = resolve_config(legacy)
        self.assertEqual(resolved["config"], legacy)
        self.assertEqual(resolved["config_hash"], "27d27fa965595c8293aed8e50da935c68ec1ec808178dc105ad2fb77ed980296")
        self.assertNotIn("design", resolved["agent_contract"]["output_schema"]["properties"])
        upgraded = upgrade_config(legacy)
        self.assertEqual(upgraded["schema_version"], 2)
        self.assertEqual(upgraded["seed"], legacy["seed"])
        self.assertTrue(all(actor["persona_ref"] is None for actor in upgraded["team"]))
        self.assertNotIn("participation", legacy)
        legacy["participation"] = upgraded["participation"]
        with self.assertRaisesRegex(ValueError, "exactly"):
            validate_config(legacy)

    def test_persona_is_materialized_without_changing_identity_or_opportunities(self) -> None:
        """Choosing a named module bundle cannot silently reschedule or promote its contributor."""
        before = copy.deepcopy(self.config["team"][6])
        value = apply_persona(self.config, before["id"], "evidence-engineer")
        actor = value["team"][6]
        self.assertEqual(actor["competencies"], ["implementation", "measurement"])
        self.assertEqual(actor["persona_ref"], {"id": "evidence-engineer", "version": "1.0.0"})
        for key in ("id", "name", "role", "stages", "authority", "available"):
            self.assertEqual(actor[key], before[key])
        self.assertEqual(self.config["team"][6], before)
        actor["competencies"] = []
        actor["persona_ref"] = None
        self.assertEqual(validate_config(value)["team"][6]["competencies"], [])
        self.assertEqual(sum(not item["id"].startswith("flower-") for item in catalog()["personas"]), 11)
        with self.assertRaisesRegex(ValueError, "existing team"):
            apply_persona(self.config, "missing-actor", "generalist")

    def test_study_presets_preserve_case_and_independent_outcome_settings(self) -> None:
        """Changing the study arrangement retains the supplied case, conditions, and evaluator criteria."""
        self.config["name"] = "Locally edited case"
        self.config["outcomes"]["conditions"]["available_minutes"] = 7
        self.config["team"][1]["available"] = False
        self.config["integration"]["mode"] = "handoff"
        self.config["omit_competencies"] = ["learning"]
        ablated = apply_study_preset(self.config, "ablation", competency="human")
        self.assertEqual(ablated["team"], self.config["team"])
        self.assertEqual(ablated["omit_competencies"], ["learning", "human"])
        restored = apply_study_preset(ablated, "default")
        for key in ("id", "name", "seed", "execution", "environment", "challenges", "outcomes"):
            self.assertEqual(restored[key], self.config[key])
        for key in ("team", "integration", "omit_competencies", "participation"):
            self.assertEqual(restored[key], default_config()[key])

    def test_individual_preserves_per_slot_capabilities_authority_and_call_opportunities(self) -> None:
        """One actor performs all matched duties, including coordination, without extra module exposure."""
        team = resolve_config(self.config)
        individual = resolve_config(apply_study_preset(self.config, "individual"))
        self.assertEqual(individual["planned_calls"], 21)
        self.assertEqual({slot["actor_id"] for slot in individual["execution_plan"]}, {"individual"})
        self.assertEqual({profile["actor_id"] for profile in individual["role_contract"]["roles"].values()}, {"individual"})
        for left, right in zip(team["execution_plan"], individual["execution_plan"]):
            for key in ("slot_id", "stage", "kind", "source_actor_id", "competency_ids"):
                self.assertEqual(left[key], right[key])
            source = team["role_contract"]["roles"][left["profile_key"]]
            target = individual["role_contract"]["roles"][right["profile_key"]]
            for key in ("duties", "authority", "behavior_instructions"):
                self.assertEqual(source[key], target[key])
        signature = individual["comparison_signature"]
        for key in ("opportunities_hash", "competency_exposure_hash", "behavior_hash", "authority_hash", "outcomes_hash"):
            self.assertEqual(signature[key], team["comparison_signature"][key])
        self.assertNotEqual(signature["model_profiles_hash"], team["comparison_signature"]["model_profiles_hash"])
        self.assertEqual(individual["coverage"]["measurement"]["scheduled_actors"], ["individual"])

    def test_specialist_individual_filters_duties_without_dropping_turns(self) -> None:
        """A narrower persona changes explicit support and remains labeled as a different contrast."""
        value = apply_study_preset(self.config, "individual", persona_id="measurement-specialist")
        resolved = resolve_config(value)
        self.assertEqual(resolved["planned_calls"], 21)
        slots = resolved["execution_plan"]
        self.assertEqual([slot["stage"] for slot in slots if slot["competency_ids"]], ["design", "instrument", "evaluate"])
        self.assertEqual(resolved["coverage"]["learning"]["scheduled_actors"], [])
        self.assertIn("learning", resolved["comparison_signature"]["individual_filtered_competencies"])
        self.assertTrue(any("filters source-slot" in message for message in resolved["warnings"]))
        value["omit_competencies"] = ["measurement"]
        omitted = resolve_config(value)
        self.assertTrue(all(not profile["duties"] for profile in omitted["role_contract"]["roles"].values()))

    def test_individual_behavior_changes_are_visible_in_the_matching_audit(self) -> None:
        """Consolidating heterogeneous requested behaviors cannot be described as an identity-only change."""
        self.config["team"][1]["behavior"]["challenge"] = "persistent"
        value = apply_study_preset(self.config, "individual")
        resolved = resolve_config(value)
        self.assertEqual(resolved["comparison_signature"]["individual_behavior_changed_slots"], ["understand-contribution-01"])
        self.assertTrue(any("changes behavior" in message for message in resolved["warnings"]))

    def test_invalid_new_fields_fail_before_execution(self) -> None:
        """Persona, participation, and challenge-effect boundaries remain strict in version two."""
        candidates = []
        for path, replacement in (("mode", "crowd"), ("allocation", "adaptive")):
            value = copy.deepcopy(self.config)
            value["participation"][path] = replacement
            candidates.append(value)
        value = apply_study_preset(self.config, "individual")
        value["participation"]["individual"]["available"] = False
        candidates.append(value)
        value = copy.deepcopy(self.config)
        value["team"][1]["persona_ref"]["version"] = "999"
        candidates.append(value)
        value = copy.deepcopy(self.config)
        value["challenges"][0]["simulation_effects"] = {"success_rate": 0.1}
        candidates.append(value)
        value = copy.deepcopy(self.config)
        value["outcomes"]["criteria"]["learner_success_min"] = float("nan")
        candidates.append(value)
        for index, value in enumerate(candidates):
            with self.subTest(index=index), self.assertRaises(ValueError):
                validate_config(value)


if __name__ == "__main__":
    unittest.main()
