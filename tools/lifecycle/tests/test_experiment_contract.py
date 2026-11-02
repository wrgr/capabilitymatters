"""Check the typed agent boundary and preserve traceable failure records across real experiment execution."""
import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import digest, verify
from experiment_config import legacy_config as default_config, apply_study_preset
from experiment_contract import validate_turn_input, validate_experiment_response, validate_recorded_response
from experiment_fixture import DryRunProvider
from experiment_runtime import run_experiment, ExperimentRunError


class DecimalProvider(DryRunProvider):
    """Supply a valid integral decimal to test normalization without losing its raw representation."""
    def call(self, role: str, stage: str, prompt: str, directory: Path, ordinal: int) -> tuple[dict, dict]:
        """Return the ordinary fixture with one numerically equivalent declared-design value."""
        response, metadata = super().call(role, stage, prompt, directory, ordinal)
        if response.get("design"):
            response["design"]["support_minutes_per_learner"] = 1.0
        return response, metadata


class NonfiniteProvider(DryRunProvider):
    """Exercise failure retention when a provider violates the JSON numeric contract."""
    def call(self, role: str, stage: str, prompt: str, directory: Path, ordinal: int) -> tuple[dict, dict]:
        """Return an invalid nonfinite design value at Build."""
        response, metadata = super().call(role, stage, prompt, directory, ordinal)
        if response.get("design"):
            response["design"]["support_minutes_per_learner"] = float("nan")
        return response, metadata


class OutsideModelProvider(DryRunProvider):
    """Preserve a novel proposed mechanism without forcing it through an inapplicable simulator."""
    def call(self, role: str, stage: str, prompt: str, directory: Path, ordinal: int) -> tuple[dict, dict]:
        """Mark a workflow redesign as requiring a different outcome model."""
        response, metadata = super().call(role, stage, prompt, directory, ordinal)
        if response.get("design"):
            response["design"].update(model_applicability="outside_scope", scope_rationale="Redesign the approval workflow instead of adding practice.")
        return response, metadata


class AgentContractTests(unittest.TestCase):
    """Verify semantic distinctions at the provider, record, and outcome interfaces."""
    @classmethod
    def setUpClass(cls) -> None:
        """Create actual matched offline runs for assertions about their retained contracts."""
        cls.folder = tempfile.TemporaryDirectory()
        cls.addClassCleanup(cls.folder.cleanup)
        cls.root = Path(cls.folder.name)
        cls.team = run_experiment(default_config(), cls.root).run
        cls.individual = run_experiment(apply_study_preset(default_config(), "individual"), cls.root).run

    def test_inputs_are_typed_and_exclude_study_metadata(self) -> None:
        """Reject accidental experimental labels at the standardized model boundary."""
        request = next(event for event in self.team["events"] if event["kind"] == "request")
        value = copy.deepcopy(request["payload"]["input"])
        self.assertEqual(validate_turn_input(value), value)
        value["condition_label"] = "ablation"
        with self.assertRaisesRegex(ValueError, "Unexpected"):
            validate_turn_input(value)
        self.assertNotIn("persona_ref", request["payload"]["input"]["assigned_instructions"])

    def test_actual_identity_and_opportunities_are_matched(self) -> None:
        """One individual fills every contribution and decision opportunity without a hidden coordinator."""
        team = [event for event in self.team["events"] if event["kind"] == "request"]
        solo = [event for event in self.individual["events"] if event["kind"] == "request"]
        self.assertEqual(len(team), 21)
        self.assertEqual(len(solo), 21)
        self.assertEqual({event["agent"] for event in solo}, {"individual"})
        self.assertEqual([(e["stage"], e["payload"]["turn_kind"]) for e in team],
                         [(e["stage"], e["payload"]["turn_kind"]) for e in solo])

    def test_design_is_typed_and_not_an_agent_success_grade(self) -> None:
        """Reject self-assigned success fields and design declarations on the wrong turn."""
        event = next(e for e in self.team["events"] if e["kind"] == "decision" and e["stage"] == "build")
        response = copy.deepcopy(event["payload"]["response"])
        with self.assertRaisesRegex(ValueError, "only to the Build"):
            validate_experiment_response(response, event["seq"], 2, "evaluate", "decision")
        response["success"] = True
        with self.assertRaisesRegex(ValueError, "contract"):
            validate_experiment_response(response, event["seq"], 2)

    def test_same_declared_design_has_same_synthetic_results(self) -> None:
        """A team label cannot supply an advantage to an identical authored design."""
        assessments = [next(e["payload"] for e in run["events"] if e["kind"] == "outcome_assessment")
                       for run in (self.team, self.individual)]
        for dimension in ("learner", "human", "system"):
            self.assertEqual(assessments[0]["dimensions"][dimension]["metrics"],
                             assessments[1]["dimensions"][dimension]["metrics"])
        self.assertFalse(assessments[0]["human_outcomes_observed"])

    def test_integral_decimal_normalization_retains_raw_response(self) -> None:
        """Portable hashes retain the original parsed numeric representation when normalization occurs."""
        run = run_experiment(default_config(), self.root, provider=DecimalProvider()).run
        event = next(e for e in run["events"] if e["kind"] == "decision" and e["stage"] == "build")
        payload = event["payload"]
        self.assertIs(type(payload["response"]["design"]["support_minutes_per_learner"]), int)
        self.assertIn('"support_minutes_per_learner":1.0', payload["raw_response_json"])
        self.assertEqual(digest(json.loads(payload["raw_response_json"])), payload["raw_response_hash"])
        self.assertTrue(verify(run))

    def test_nonfinite_rejection_stays_valid_json_and_verifiable(self) -> None:
        """A malformed provider response must not make its failure journal impossible to replay."""
        with self.assertRaises(ExperimentRunError) as caught:
            run_experiment(default_config(), self.root, provider=NonfiniteProvider())
        run = caught.exception.journal.run
        payload = run["events"][-1]["payload"]
        self.assertEqual(payload["acceptance_status"], "rejected")
        self.assertIn("NaN", payload["rejected_response_text"])
        json.dumps(run, allow_nan=False)
        self.assertTrue(verify(run))

    def test_consistently_rehashed_identity_graft_is_rejected(self) -> None:
        """Hash-chain consistency alone cannot excuse an executing identity that differs from its slot."""
        run = copy.deepcopy(self.individual)
        request = next(e for e in run["events"] if e["kind"] == "request")
        request["agent"] = "hidden-coordinator"
        previous = "0" * 64
        for event in run["events"]:
            event["prev_hash"] = previous
            event["hash"] = digest({key: value for key, value in event.items() if key != "hash"})
            previous = event["hash"]
        with self.assertRaisesRegex(ValueError, "executing identity"):
            verify(run)

    def test_unrepresented_mechanism_is_retained_for_human_review(self) -> None:
        """An unfamiliar mechanism is indeterminate, not an invented success or failure."""
        run = run_experiment(default_config(), self.root, provider=OutsideModelProvider()).run
        result = next(e["payload"] for e in run["events"] if e["kind"] == "outcome_assessment")
        self.assertEqual(result["status"], "indeterminate")
        self.assertEqual(result["applicability_review"]["status"], "awaiting_human_review")
        self.assertFalse(result["applicability_review"]["eligibility_verified"])
        self.assertIn("approval workflow", result["reason"])
        self.assertTrue(verify(run))

    def test_historical_schema_does_not_acquire_new_required_fields(self) -> None:
        """Validate a retained older typed design using its pinned schema rather than today's additions."""
        event = next(e for e in self.team["events"] if e["kind"] == "decision" and e["stage"] == "build")
        response = copy.deepcopy(event["payload"]["response"])
        experiment = copy.deepcopy(self.team["experiment"])
        schema = experiment["agent_contract"]["output_schema"]["properties"]["design"]["anyOf"][1]
        for field in ("model_applicability", "scope_rationale"):
            del response["design"][field]
            del schema["properties"][field]
            schema["required"].remove(field)
        validate_recorded_response(response, event["seq"], experiment, "build", "decision")


if __name__ == "__main__":
    unittest.main()
