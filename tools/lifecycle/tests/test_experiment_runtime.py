"""Verify controlled experiment execution without treating offline fixtures as scientific findings."""
from __future__ import annotations

import copy
import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from typing import Callable
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import Journal, SEED, STAGES, canonical, execute, verify
from exemplar import ScriptedProvider
from experiment_config import catalog, default_config, resolve_config
from experiment_fixture import DryRunProvider
from experiment_prompts import experiment_prompt
from experiment_runtime import ExperimentRunError, create_experiment, execute_experiment, run_experiment


class _RecordingProvider(DryRunProvider):
    """Observe offline provider calls while optionally injecting a defined transport failure."""

    def __init__(self, transform: Callable | None = None, fail_at: int | None = None) -> None:
        self.calls: list[dict] = []
        self.transform = transform
        self.fail_at = fail_at

    def call(self, role: str, stage: str, prompt: str, directory: Path, ordinal: int) -> tuple[dict, dict]:
        """Record the exact request and return an explicitly offline fixture response."""
        self.calls.append({"role": role, "stage": stage, "prompt": prompt, "ordinal": ordinal})
        if ordinal == self.fail_at:
            raise RuntimeError("Intentional offline provider failure")
        response, metadata = super().call(role, stage, prompt, directory, ordinal)
        if self.transform is not None:
            response = self.transform(response, role, stage, ordinal)
        return response, metadata


def _section(prompt: str, label: str) -> dict | list:
    return json.loads(next(line.removeprefix(label + ": ") for line in prompt.splitlines() if line.startswith(label + ": ")))


class ExperimentRuntimeTests(unittest.TestCase):
    """Protect timing, prompt isolation, failure retention, and interpretation boundaries."""

    def setUp(self) -> None:
        """Use temporary offline runs with a short default schedule."""
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.output = Path(temporary.name) / "runs"
        self.config = default_config()
        self.config["execution"]["through"] = "understand"

    def _run(self, provider: DryRunProvider | None = None, config: dict | None = None) -> Journal:
        return run_experiment(config if config is not None else self.config, self.output, provider)

    def test_full_dry_run_pins_configuration_and_is_not_scientific_evidence(self) -> None:
        """A complete technical fixture reports its limited purpose at every output layer."""
        self.config["execution"]["through"] = "refine"
        provider = _RecordingProvider()
        journal = self._run(provider)
        self.assertTrue(verify(journal.run))
        self.assertEqual(len(provider.calls), 21)
        measurement_actor = next(actor["id"] for actor in self.config["team"] if "measurement" in actor["competencies"])
        measurement_design = next(index for index, call in enumerate(provider.calls) if call["role"] == measurement_actor and call["stage"] == "design")
        first_build = next(index for index, call in enumerate(provider.calls) if call["stage"] == "build")
        self.assertLess(measurement_design, first_build)
        self.assertEqual(journal.run["experiment"]["config"], self.config)
        self.assertEqual(journal.run["experiment"], journal.events[0]["payload"]["experiment"])
        self.assertEqual(journal.events[-1]["payload"]["status"], "dry_run_completed")
        self.assertFalse(journal.events[-1]["payload"]["model_generated"])
        self.assertFalse(journal.events[-1]["payload"]["human_outcomes_observed"])
        self.assertEqual(journal.events[-1]["payload"]["evidence_status"], "pipeline_check")
        records = [event for event in journal.events if event["kind"] in ("contribution", "decision")]
        self.assertTrue(all(event["payload"]["technical_fixture"] for event in records))
        self.assertTrue(all(event["payload"]["provider"]["scientific_evidence"] is False for event in records))
        build = next(event for event in journal.events if event["kind"] == "artifact" and event["stage"] == "build")
        self.assertIn("Offline fixture", build["payload"]["content"]["prototype_html"])

    def test_fixed_challenges_arrive_before_their_stage_and_never_early(self) -> None:
        """Earlier prompts cannot see future challenge descriptions or their identifiers."""
        self.config["execution"]["through"] = "refine"
        self.config["challenges"] = [
            {"id": "design-event", "stage": "design", "description": "DESIGN_SENTINEL: protected time disappears."},
            {"id": "later-event", "stage": "evaluate", "description": "FUTURE_SENTINEL: the delivery location changes."},
        ]
        provider = _RecordingProvider()
        journal = self._run(provider)
        for call in provider.calls:
            stage_index = STAGES.index(call["stage"])
            self.assertEqual("DESIGN_SENTINEL" in call["prompt"], stage_index >= STAGES.index("design"))
            self.assertEqual("FUTURE_SENTINEL" in call["prompt"], stage_index >= STAGES.index("evaluate"))
            arrived = _section(call["prompt"], "ARRIVED CHALLENGES")
            self.assertTrue(all(STAGES.index(item["stage"]) <= stage_index for item in arrived))
        for challenge in [event for event in journal.events if event["kind"] == "challenge"]:
            first_request = next(event for event in journal.events if event["kind"] == "request" and event["stage"] == challenge["stage"])
            self.assertLess(challenge["seq"], first_request["seq"])
            self.assertTrue(challenge["payload"]["hypothetical"])

    def test_condition_labels_and_unassigned_module_instructions_are_withheld(self) -> None:
        """All prompt assignments omit the withdrawn module, including coordinator duties."""
        self.config["id"] = "withheld-condition-label"
        self.config["name"] = "WITHHELD EXPECTATION: measurement should fail"
        self.config["execution"]["through"] = "refine"
        self.config["team"][0]["competencies"] = ["measurement"]
        self.config["omit_competencies"] = ["measurement"]
        provider = _RecordingProvider()
        self._run(provider)
        measurement = next(item for item in catalog()["competencies"] if item["id"] == "measurement")
        for call in provider.calls:
            prompt = call["prompt"]
            self.assertNotIn(self.config["id"], prompt)
            self.assertNotIn(self.config["name"], prompt)
            self.assertNotIn('"omit_competencies"', prompt)
            assigned = _section(prompt, "ASSIGNED INSTRUCTIONS")
            self.assertFalse({"actor_id", "competency_ids", "focus_lenses", "lineage"} & set(assigned))
            for instruction in measurement["instructions"]:
                self.assertNotIn(instruction, json.dumps(assigned))

    def test_spontaneous_contributions_are_preserved_under_omission(self) -> None:
        """Omission changes assigned support without censoring an unassigned model contribution."""
        self.config["omit_competencies"] = ["measurement"]
        unexpected = "Spontaneous suggestion: compare performance in a changed task context."
        provider = _RecordingProvider(lambda response, role, stage, ordinal: {**response, "message": unexpected} if ordinal == 1 else response)
        self._run(provider)
        self.assertIn(unexpected, provider.calls[1]["prompt"])
        assigned = _section(provider.calls[1]["prompt"], "ASSIGNED INSTRUCTIONS")
        self.assertNotIn(unexpected, json.dumps(assigned))

    def test_behavior_authority_and_environment_reach_actual_prompt(self) -> None:
        """Configuration changes influence model-facing instructions, not only replay metadata."""
        actor = self.config["team"][1]
        actor["behavior"] = {"challenge": "persistent", "revision": "reluctant", "communication": "elaborate"}
        actor["authority"] = "decision"
        self.config["environment"] = {"time_pressure": "high", "resources": "RESOURCE_SENTINEL: one shared terminal.", "constraints": ["CONSTRAINT_SENTINEL: no protected preparation time."]}
        journal = create_experiment(self.config, self.output)
        prompt = experiment_prompt(journal, actor["id"], "understand")
        assigned = _section(prompt, "ASSIGNED INSTRUCTIONS")
        definitions = catalog()
        for dimension, setting in actor["behavior"].items():
            self.assertIn(definitions["behavior_options"][dimension][setting], assigned["behavior_instructions"])
        self.assertEqual(assigned["authority_instruction"], definitions["authority_options"]["decision"])
        environment = _section(prompt, "ENVIRONMENT")
        self.assertEqual(environment["time_pressure"], "high")
        self.assertEqual(journal.run["experiment"]["environment_instruction"], definitions["time_pressure_options"]["high"])
        self.assertIn(definitions["time_pressure_options"]["high"], prompt)
        self.assertIn("RESOURCE_SENTINEL", prompt)
        self.assertIn("CONSTRAINT_SENTINEL", prompt)

    def test_ablation_conditions_preserve_budgets_and_call_opportunities(self) -> None:
        """The four-condition contrast changes support and coordination without changing calls."""
        runs = []
        for omitted in (False, True):
            for integration in ("explicit", "handoff"):
                config = copy.deepcopy(self.config)
                config["execution"]["through"] = "refine"
                config["omit_competencies"] = ["measurement"] if omitted else []
                config["integration"]["mode"] = integration
                provider = _RecordingProvider()
                journal = self._run(provider, config)
                runs.append((journal, [(call["role"], call["stage"]) for call in provider.calls]))
                coverage = journal.run["experiment"]["coverage"]["measurement"]
                self.assertEqual(bool(coverage["scheduled_actors"]), not omitted)
        self.assertTrue(all(calls == runs[0][1] for _, calls in runs))
        self.assertEqual(len(runs[0][1]), 21)
        self.assertTrue(all(run.run["experiment"]["config"]["execution"] == runs[0][0].run["experiment"]["config"]["execution"] for run, _ in runs))

    def test_exact_prompts_and_response_receipts_are_retained(self) -> None:
        """Recorded hashes and on-disk prompts identify the inputs that actually reached the provider."""
        provider = _RecordingProvider()
        journal = self._run(provider)
        requests = [event for event in journal.events if event["kind"] == "request"]
        for event, call in zip(requests, provider.calls):
            payload = event["payload"]
            self.assertEqual(payload["prompt"], call["prompt"])
            self.assertEqual(payload["prompt_sha256"], hashlib.sha256(call["prompt"].encode()).hexdigest())
            self.assertEqual((journal.path / payload["prompt_file"]).read_text(), call["prompt"])
            self.assertTrue((journal.path / f"experiment-response-{call['ordinal']:03d}.json").is_file())
        saved = json.loads((journal.path / "run.json").read_text())
        self.assertEqual(saved, journal.run)
        self.assertEqual([json.loads(line) for line in (journal.path / "events.jsonl").read_text().splitlines()], journal.events)

    def test_failed_provider_retains_prefix_request_and_failure(self) -> None:
        """A provider failure preserves earlier contributions and the failing prompt."""
        provider = _RecordingProvider(fail_at=2)
        with self.assertRaises(ExperimentRunError) as caught:
            self._run(provider)
        journal = caught.exception.journal
        self.assertTrue(verify(journal.run))
        self.assertEqual(journal.events[-1]["kind"], "failure")
        self.assertEqual(sum(event["kind"] == "contribution" for event in journal.events), 1)
        self.assertFalse(any(event["kind"] == "completed" for event in journal.events))
        request = journal.events[journal.events[-1]["payload"]["request_seq"] - 1]
        self.assertEqual(request["kind"], "request")
        self.assertTrue((journal.path / request["payload"]["prompt_file"]).is_file())
        self.assertEqual(Journal.reopen(journal.path).run, journal.run)

    def test_rejected_response_is_retained_with_acceptance_limit(self) -> None:
        """Oversized accepted-output candidates remain inspectable without becoming contributions."""
        self.config["execution"]["max_output_chars"] = 1000
        provider = _RecordingProvider(lambda response, role, stage, ordinal: {**response, "artifact_body": "x" * 2000})
        with self.assertRaisesRegex(ExperimentRunError, "character limit") as caught:
            self._run(provider)
        journal = caught.exception.journal
        self.assertEqual(journal.events[-1]["payload"]["rejected_response"]["artifact_body"], "x" * 2000)
        self.assertFalse(any(event["kind"] == "contribution" for event in journal.events))
        receipt = json.loads((journal.path / "experiment-response-001.json").read_text())
        self.assertEqual(receipt["response"]["artifact_body"], "x" * 2000)
        self.assertTrue(verify(journal.run))

    def test_future_references_are_rejected_with_the_raw_response(self) -> None:
        """Evidence pointers cannot refer to later or nonexistent journal events."""
        provider = _RecordingProvider(lambda response, role, stage, ordinal: {**response, "evidence_refs": [999999]})
        with self.assertRaisesRegex(ExperimentRunError, "earlier event") as caught:
            self._run(provider)
        self.assertEqual(caught.exception.journal.events[-1]["payload"]["rejected_response"]["evidence_refs"], [999999])

    def test_iteration_requests_do_not_add_unplanned_calls(self) -> None:
        """A requested revisit is preserved without changing the matched experimental schedule."""
        provider = _RecordingProvider(lambda response, role, stage, ordinal: {**response, "revisit_stage": "model"})
        journal = self._run(provider)
        self.assertEqual(len(provider.calls), resolve_config(self.config)["planned_calls"])
        iterations = [event for event in journal.events if event["kind"] == "iteration_requested"]
        self.assertEqual(len(iterations), 3)
        self.assertTrue(all(event["payload"]["status"] == "recorded_not_executed" for event in iterations))
        self.assertFalse(any(event["kind"] == "artifact" and event["stage"] == "model" for event in journal.events))

    def test_repeated_execute_rejects_without_mutating_a_completed_run(self) -> None:
        """Replaying a completed record cannot append failure or execute more contributions."""
        provider = _RecordingProvider()
        journal = self._run(provider)
        before = canonical(journal.run)
        saved = {name: (journal.path / name).read_bytes() for name in ("run.json", "events.jsonl", "manifest.json")}
        with self.assertRaises((ExperimentRunError, ValueError)):
            execute_experiment(journal, provider)
        self.assertEqual(canonical(journal.run), before)
        self.assertEqual(len(provider.calls), 3)
        for name, content in saved.items():
            self.assertEqual((journal.path / name).read_bytes(), content)

    def test_tampered_configuration_cannot_pass_journal_verification(self) -> None:
        """Both metadata mismatch and a stale configuration hash are rejected."""
        journal = create_experiment(self.config, self.output)
        tampered = copy.deepcopy(journal.run)
        tampered["experiment"]["config"]["environment"]["resources"] = "Changed resource"
        with self.assertRaisesRegex(ValueError, "configuration differs"):
            verify(tampered)
        tampered["events"][0]["payload"]["experiment"] = copy.deepcopy(tampered["experiment"])
        with self.assertRaisesRegex(ValueError, "configuration hash differs"):
            verify(tampered)

    def test_cancellation_stops_between_calls_and_preserves_completed_contribution(self) -> None:
        """A cancellation marker prevents the next call without disguising it as provider failure."""
        journal = create_experiment(self.config, self.output)

        def request_stop(response: dict, role: str, stage: str, ordinal: int) -> dict:
            (journal.path / "cancel.requested").write_text("Stop requested by offline test")
            return response

        provider = _RecordingProvider(request_stop)
        with self.assertRaisesRegex(ExperimentRunError, "cancelled"):
            execute_experiment(journal, provider)
        self.assertEqual(len(provider.calls), 1)
        self.assertEqual(journal.events[-1]["kind"], "cancelled")
        self.assertEqual(sum(event["kind"] == "contribution" for event in journal.events), 1)
        self.assertFalse(any(event["kind"] in ("completed", "failure") for event in journal.events))
        self.assertTrue(verify(journal.run))

    def test_live_initialization_failure_preserves_manifest_without_calls(self) -> None:
        """A missing explicit live gate cannot discard the experiment's configuration record."""
        self.config["execution"].update(provider="codex", model="test-only-model-id")
        with patch.dict("os.environ", {"CAPABILITY_MATTERS_LIVE": "0"}):
            with self.assertRaisesRegex(ExperimentRunError, "CAPABILITY_MATTERS_LIVE") as caught:
                self._run()
        journal = caught.exception.journal
        self.assertEqual([event["kind"] for event in journal.events], ["seed", "failure"])
        self.assertTrue(verify(journal.run))

    def test_repetitions_have_fresh_identities_and_provider_calls(self) -> None:
        """The same manifest creates independent records rather than reusing a cached response."""
        first_provider, second_provider = _RecordingProvider(), _RecordingProvider()
        first, second = self._run(first_provider), self._run(second_provider)
        self.assertNotEqual(first.run["id"], second.run["id"])
        self.assertEqual(first.run["experiment"]["config_hash"], second.run["experiment"]["config_hash"])
        self.assertEqual(len(first_provider.calls), 3)
        self.assertEqual(len(second_provider.calls), 3)
        self.assertTrue(first.run["experiment"]["fresh_context"])
        self.assertFalse(first.run["experiment"]["response_reuse"])
        self.assertEqual([call["ordinal"] for call in second_provider.calls], [1, 2, 3])

    def test_legacy_journal_execution_remains_compatible(self) -> None:
        """Existing demonstration records still verify without an experiment extension."""
        journal = Journal(self.output / "legacy", dict(SEED), "scripted-simulation")
        execute(journal, ScriptedProvider(), through="understand")
        self.assertNotIn("experiment", journal.run)
        self.assertTrue(verify(journal.run))
        self.assertEqual(Journal.reopen(journal.path).run, journal.run)


if __name__ == "__main__":
    unittest.main()
