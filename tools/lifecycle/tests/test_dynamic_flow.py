"""Exercise dynamic conversation and evidence boundaries with explicitly scripted fixtures only."""
from __future__ import annotations

import copy
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from dynamic_contract import canonical, digest, load_catalog, make_config, validate_config
from dynamic_evaluator import accept_evaluation, evaluation_packet, reference_text, request_evaluation, validate_evaluation
from dynamic_journal import append, create, load, verify
from dynamic_messages import validate_message
from dynamic_observations import validate_observation
from dynamic_runtime import accept_turn, freeze, observe, request_turn
from dynamic_state import current_artifact, outstanding, review_status, select_speaker, snapshot, turns

HTML = "<html><body><h1>Scripted fixture, not a study result</h1><p>don't infer learning</p></body></html>"


def response(kind: str, to: list[str], content: str = "Scripted fixture contribution.", **fields: object) -> dict:
    """Build a complete fixture response without claiming to simulate model behavior."""
    return {"kind": kind, "to": to, "reply_to": [], "domains": [], "content": content,
            "artifact_version": None, "issue_id": "", "artifact": None, "decision": None, **fields}


def step(directory: Path, message: dict) -> dict:
    """Submit one scripted response to the runtime's actually selected actor."""
    request_turn(directory)
    return accept_turn(directory, message)


def candidate(directory: Path) -> dict:
    """Create a three-message fixture candidate through the public runtime interface."""
    question = step(directory, response("question", ["generalist"], "Please implement a small routine candidate."))
    step(directory, response("implementation", ["facilitator"], reply_to=[question["payload"]["message_id"]],
                             artifact={"html": HTML, "change_summary": "First scripted fixture", "parent_version": None}))
    step(directory, response("ready", ["generalist"], "Ready for bounded browser testing; specialist domains remain not reviewed."))
    return freeze(directory)


def evidence_for(run: dict, scenario_id: str, status: str = "observed") -> dict:
    """Create clearly labeled contract fixtures, never substitute them for observed browser evidence."""
    scenario = next(s for s in run["config"]["scenarios"] if s["id"] == scenario_id)
    artifact = current_artifact(run)
    actions = [{"id": a["id"], "status": "observed" if status == "observed" else "unavailable",
                "observation": {"rendered_text": "Scripted fixture feedback. This is not browser research evidence."}}
               for a in scenario["actions"]]
    checks = [{"id": c["id"], "after_action": c["after_action"], "status": "pass" if status == "observed" else "unavailable",
               "expected": c.get("expected", c["type"]), "observed": c.get("expected", "Scripted fixture feedback.")}
              for c in scenario["checks"]]
    return {"schema_version": "dynamic-flower-observation-1", "run_id": run["id"], "evidence_kind": "fixture",
            "artifact_version": artifact["version"], "artifact_sha256": artifact["sha256"],
            "scenario_id": scenario_id, "scenario_sha256": digest(scenario), "status": status,
            "actions": actions, "checks": checks, "runtime_errors": [], "network_requests": [],
            "limitations": ["Scripted contract fixture only; no model or browser results."], "source_hashes": {"fixture": "f" * 64}}


def rating(packet: dict, value: int | None = 2) -> dict:
    """Construct a scripted evaluator response tied to named retained fixture evidence."""
    source = packet["sources"][0]
    scores = [{"dimension_id": c["id"], "score": value, "rationale": "Fixture validator exercise; no research rating.",
               "evidence_refs": [{"source": source["source"], "id": source["id"], "quote": reference_text(packet, source)}]}
              for c in packet["rubric"][packet["scope"]]]
    return {"scope": packet["scope"], "artifact_version": packet["artifact_version"], "scenario_id": packet["scenario_id"],
            "scores": scores, "limitations": ["Scripted evaluator fixture only."]}


class DynamicFlowTests(unittest.TestCase):
    """Check substantive dialogue, authority, version, and evaluation invariants."""

    def setUp(self) -> None:
        """Create an isolated fixture run using the real catalog contract."""
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name) / "fixture-run"
        self.catalog = load_catalog()
        self.config = make_config(self.catalog, "feedback_handoff", "generalist")
        self.config["budgets"]["max_context_chars"] = 1000000
        create(self.directory, self.config, self.catalog, "fixture")

    def test_subquestion_routes_to_its_addressee_then_returns_to_parent(self) -> None:
        """A nested question changes the speaker rather than advancing a fixed roster."""
        original = step(self.directory, response("question", ["generalist"], "Which input do you need?"))
        sub = step(self.directory, response("question", ["facilitator"], "Please clarify the time constraint."))
        self.assertEqual(select_speaker(load(self.directory))[0], "facilitator")
        step(self.directory, response("answer", ["generalist"], "Use the supplied modest-session constraint.", reply_to=[sub["payload"]["message_id"]]))
        self.assertEqual(select_speaker(load(self.directory))[0], "generalist")
        step(self.directory, response("answer", ["facilitator"], reply_to=[original["payload"]["message_id"]]))
        self.assertEqual(outstanding(load(self.directory)), ([], []))

    def test_generalist_does_not_receive_specialist_playbooks_or_hidden_tests(self) -> None:
        """Generalist prompts retain only its own introductory brief and disclosed facts."""
        first = step(self.directory, response("question", ["generalist"]))
        request = request_turn(self.directory)
        prompt = (self.directory / request["payload"]["prompt_file"]).read_text()
        self.assertIn(self.config["agents"][0]["brief"], prompt)
        specialist = next(a for a in self.catalog["agents"] if a["id"] == "assessment_measurement_evaluation")
        self.assertNotIn(specialist["brief"], prompt)
        self.assertNotIn(self.config["scenarios"][0]["actions"][1]["value"], prompt)
        self.assertIn(first["payload"]["message_id"], prompt)

    def test_full_transcript_is_not_reduced_to_recent_ten(self) -> None:
        """An early contribution remains in the prompt after more than ten accepted messages."""
        for index in range(6):
            question = step(self.directory, response("question", ["generalist"], f"Original request {index} remains visible."))
            step(self.directory, response("answer", ["facilitator"], reply_to=[question["payload"]["message_id"]]))
        request = request_turn(self.directory)
        self.assertIn("Original request 0 remains visible.", (self.directory / request["payload"]["prompt_file"]).read_text())

    def test_generalist_approval_is_rejected_and_attempt_consumes_budget(self) -> None:
        """A shallow generalist cannot acquire specialist authority by naming a domain."""
        step(self.directory, response("question", ["generalist"]))
        request_turn(self.directory)
        with self.assertRaisesRegex(ValueError, "exceeds assigned expertise"):
            accept_turn(self.directory, response("approval", ["facilitator"], domains=["learning_sciences"]))
        run = load(self.directory)
        self.assertEqual(turns(run, "design_develop"), 2)
        self.assertEqual(run["events"][-1]["kind"], "turn_failed")

    def test_facilitator_cannot_write_the_solution(self) -> None:
        """Procedural routing never grants the coordinator implementation authority."""
        request_turn(self.directory)
        with self.assertRaisesRegex(ValueError, "implementation authority"):
            accept_turn(self.directory, response("implementation", ["generalist"],
                                                artifact={"html": HTML, "change_summary": "Invalid", "parent_version": None}))

    def test_objection_requires_its_author_or_explicit_user_risk_acceptance(self) -> None:
        """An addressed response leaves dissent open and freezing records the actual override."""
        candidate(self.directory)
        observe(self.directory, evidence_for(load(self.directory), self.config["scenario_ids"][0]))
        question = step(self.directory, response("question", ["generalist"], "Review this candidate."))
        objection = step(self.directory, response("objection", ["facilitator"], "The feedback needs review.", reply_to=[question["payload"]["message_id"]]))
        issue = objection["payload"]["message_id"]
        step(self.directory, response("answer", ["generalist"], "I acknowledge this concern.", reply_to=[issue]))
        self.assertEqual(outstanding(load(self.directory))[1][0]["id"], issue)
        self.assertEqual(select_speaker(load(self.directory))[0], "generalist")
        step(self.directory, response("resolve", ["facilitator"], "The bounded risk is understood.", reply_to=[issue], issue_id=issue))
        self.assertFalse(outstanding(load(self.directory))[1])

    def test_new_version_requires_its_own_freeze_and_test_binding(self) -> None:
        """A repair preserves prior source and cannot borrow the earlier test results."""
        frozen = candidate(self.directory)
        original = (self.directory / "artifacts/v001.html").read_bytes()
        observe(self.directory, evidence_for(load(self.directory), self.config["scenario_ids"][0]))
        question = step(self.directory, response("question", ["generalist"], "Repair the candidate."))
        step(self.directory, response("implementation", ["facilitator"], reply_to=[question["payload"]["message_id"]],
                                     artifact={"html": HTML.replace("Scripted fixture", "Revised fixture"), "change_summary": "Repair fixture", "parent_version": 1}))
        self.assertEqual((self.directory / "artifacts/v001.html").read_bytes(), original)
        with self.assertRaisesRegex(ValueError, "Freeze the current artifact"):
            evaluation_packet(load(self.directory))
        freeze(self.directory)
        evidence = evidence_for(load(self.directory), self.config["scenario_ids"][0])
        evidence["artifact_sha256"] = frozen["payload"]["artifact_sha256"]
        with self.assertRaisesRegex(ValueError, "artifact hash mismatch"):
            observe(self.directory, evidence)

    def test_absent_specialist_review_does_not_force_failure(self) -> None:
        """A generalist artifact can freeze with every specialist domain explicitly not reviewed."""
        event = candidate(self.directory)
        self.assertEqual(set(event["payload"]["review_status"].values()), {"not_reviewed"})
        self.assertEqual(event["payload"]["evidence_kind"], "fixture")

    def test_case_update_invalidates_prior_approval_references(self) -> None:
        """Changed requirements cannot keep a previous specialist signoff silently alive."""
        run = load(self.directory)
        run["config"] = make_config(self.catalog, "feedback_handoff", "full_team")
        approval = response("approval", ["facilitator"], artifact_version=1, domains=["learning_sciences"])
        append(run, "artifact", "design_develop", "software_engineering", {"version": 1})
        event = append(run, "message", "design_develop", "learning_sciences", {"message_id": "approval", "response": approval})
        append(run, "user_update", "design_develop", "user", {"message": "Change the learning goal."})
        decision = response("decision", ["learning_sciences"], artifact_version=1,
                            decision={"action": "accept", "subject": "Accept revised design", "approval_refs": ["approval"]})
        self.assertEqual(review_status(run, 1)["learning_sciences"], "not_reviewed")
        with self.assertRaisesRegex(ValueError, "fresh approval"):
            validate_message(run, "facilitator", decision)
        self.assertLess(event["seq"], run["events"][-1]["seq"])

    def test_observation_timing_and_scenario_copies_are_bound(self) -> None:
        """A passing check cannot be moved to a different action or scenario."""
        candidate(self.directory)
        run = load(self.directory)
        evidence = evidence_for(run, self.config["scenario_ids"][0])
        evidence["checks"][0]["after_action"] = "reset"
        with self.assertRaisesRegex(ValueError, "timing differs"):
            validate_observation(run, evidence)
        evidence = evidence_for(run, self.config["scenario_ids"][0])
        evidence["scenario_sha256"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "scenario hash"):
            validate_observation(run, evidence)

    def test_expert_requires_observation_and_separate_exact_scope(self) -> None:
        """Expert ratings cannot appear before evidence or combine process with result."""
        candidate(self.directory)
        with self.assertRaisesRegex(ValueError, "actual retained browser"):
            evaluation_packet(load(self.directory))
        for scenario_id in self.config["scenario_ids"]:
            observe(self.directory, evidence_for(load(self.directory), scenario_id))
        packet = evaluation_packet(load(self.directory))
        value = rating(packet)
        request_evaluation(self.directory)
        accept_evaluation(self.directory, value)
        with self.assertRaisesRegex(ValueError, "already have an accepted evaluation"):
            request_evaluation(self.directory)
        result = evaluation_packet(load(self.directory), self.config["scenario_ids"][0])
        self.assertEqual(result["scope"], "result")
        self.assertNotEqual({s["dimension_id"] for s in rating(result)["scores"]}, {s["dimension_id"] for s in value["scores"]})

    def test_unavailable_browser_result_is_unknown_not_zero(self) -> None:
        """Missing execution evidence admits null result scores, never a fabricated failure."""
        candidate(self.directory)
        key = self.config["scenario_ids"][0]
        observe(self.directory, evidence_for(load(self.directory), key, "unavailable"))
        packet = evaluation_packet(load(self.directory), key)
        with self.assertRaisesRegex(ValueError, "cannot receive a numeric"):
            validate_evaluation(packet, rating(packet, 0))
        validate_evaluation(packet, rating(packet, None))

    def test_exact_quote_validation_uses_the_named_representation(self) -> None:
        """Rendered output cannot be silently substituted for raw-source evidence."""
        candidate(self.directory)
        key = self.config["scenario_ids"][0]
        observe(self.directory, evidence_for(load(self.directory), key))
        packet = evaluation_packet(load(self.directory), key)
        value = rating(packet)
        value["scores"][0]["evidence_refs"] = [{"source": "html", "id": "artifact/1", "quote": "Scripted fixture feedback."}]
        with self.assertRaisesRegex(ValueError, "named representation"):
            validate_evaluation(packet, value)

    def test_context_limit_stops_without_a_truncated_request(self) -> None:
        """An oversized full transcript consumes no hidden provider call."""
        directory = Path(self.temporary.name) / "bounded-fixture"
        config = copy.deepcopy(self.config)
        config["budgets"]["max_context_chars"] = 2000
        create(directory, config, self.catalog, "fixture")
        with self.assertRaisesRegex(ValueError, "context_limit"):
            request_turn(directory)
        run = load(directory)
        self.assertEqual(turns(run, "design_develop"), 0)
        self.assertEqual(snapshot(run)["status"], "incomplete_context_limit")

    def test_call_cap_and_prompt_file_integrity(self) -> None:
        """The hard call cap and retained exact prompt are independently enforced."""
        directory = Path(self.temporary.name) / "one-call-fixture"
        config = copy.deepcopy(self.config)
        config["budgets"]["design_develop"] = 1
        create(directory, config, self.catalog, "fixture")
        step(directory, response("question", ["generalist"]))
        with self.assertRaisesRegex(ValueError, "call_budget_exhausted"):
            request_turn(directory)
        (directory / "calls/0001/prompt.txt").write_text("Changed fixture")
        with self.assertRaisesRegex(ValueError, "Prompt file changed"):
            load(directory)

    def test_scheduled_user_change_is_applied_at_its_actual_turn_boundary(self) -> None:
        """A queued edit becomes an attributed case revision rather than an unlogged overwrite."""
        directory = Path(self.temporary.name) / "updated-fixture"
        config = copy.deepcopy(self.config)
        config["updates"] = [{"id": "shorter", "phase": "design_develop", "after_turn": 1, "message": "Only two minutes are now available."}]
        create(directory, config, self.catalog, "fixture")
        step(directory, response("question", ["generalist"]))
        request = request_turn(directory)
        run = load(directory)
        update = next(e for e in run["events"] if e["kind"] == "user_update")
        self.assertEqual(update["payload"]["case_version"], 2)
        self.assertIn(config["updates"][0]["message"], (directory / request["payload"]["prompt_file"]).read_text())
        self.assertEqual(run["config"]["case"], config["case"])

    def test_due_user_change_cannot_disappear_at_freeze(self) -> None:
        """A design update due after implementation is retained before crossing the phase boundary."""
        directory = Path(self.temporary.name) / "boundary-update-fixture"
        config = copy.deepcopy(self.config)
        config["updates"] = [{"id": "late", "phase": "design_develop", "after_turn": 2, "message": "Change the operating constraint."}]
        create(directory, config, self.catalog, "fixture")
        question = step(directory, response("question", ["generalist"]))
        step(directory, response("implementation", ["facilitator"], reply_to=[question["payload"]["message_id"]],
                                 artifact={"html": HTML, "change_summary": "Fixture", "parent_version": None}))
        with self.assertRaisesRegex(ValueError, "due_user_update"):
            freeze(directory)
        run = load(directory)
        self.assertEqual(run["events"][-1]["kind"], "user_update")
        self.assertEqual(snapshot(run)["phase"], "design_develop")
        request = request_turn(directory)
        self.assertIn("Change the operating constraint.", (directory / request["payload"]["prompt_file"]).read_text())

    def test_due_deploy_update_precedes_expert_request(self) -> None:
        """A deployment change cannot be skipped by going directly from tests to expert review."""
        directory = Path(self.temporary.name) / "review-update-fixture"
        config = copy.deepcopy(self.config)
        config["updates"] = [{"id": "deploy-change", "phase": "deploy_test", "after_turn": 0, "message": "A new operating constraint needs review."}]
        create(directory, config, self.catalog, "fixture")
        candidate(directory)
        for scenario_id in config["scenario_ids"]:
            observe(directory, evidence_for(load(directory), scenario_id))
        with self.assertRaisesRegex(ValueError, "due_user_update"):
            request_evaluation(directory)
        self.assertEqual(load(directory)["events"][-1]["kind"], "user_update")
        self.assertFalse(any(e["kind"] == "request" and e["actor"] == "expert_evaluator" for e in load(directory)["events"]))

    def test_catalog_and_config_identity_are_not_silently_refreshed(self) -> None:
        """User-edited copied scenarios remain authoritative and omitted expert briefs stay absent."""
        copied = copy.deepcopy(self.config)
        copied["scenarios"][0]["title"] = "User-defined fictional case"
        validate_config(copied, self.catalog)
        self.assertNotEqual(digest(copied), digest(self.config))
        withdrawn = make_config(self.catalog, "feedback_handoff", "assessment_withdrawn")
        actor = next(a for a in withdrawn["agents"] if a["id"] == "assessment_measurement_evaluation")
        self.assertEqual(actor["domains"], [])
        self.assertNotIn("Work deeply on measurement", actor["brief"])
        self.assertEqual(digest({"score": 3.0}), digest({"score": 3}))
        with self.assertRaisesRegex(ValueError, "must be integers"):
            canonical({"score": 2.5})

    def test_journal_detects_metadata_and_hash_tampering(self) -> None:
        """Replay verifies pinned configuration and the accepted event chain."""
        run = load(self.directory)
        run["config"]["case"]["title"] = "Changed"
        with self.assertRaisesRegex(ValueError, "Input pin mismatch"):
            verify(run)
        run = load(self.directory)
        run["events"][0]["hash"] = "0" * 64
        with self.assertRaisesRegex(ValueError, "Event integrity"):
            verify(run)

    def test_invalid_operating_conditions_fail_before_run_creation(self) -> None:
        """Editable scenario conditions use the same viewport and offline contract as the browser runner."""
        invalid = copy.deepcopy(self.config)
        invalid["scenarios"][0]["conditions"]["viewport"]["width"] = 239
        with self.assertRaisesRegex(ValueError, "viewport dimensions"):
            validate_config(invalid, self.catalog)
        invalid = copy.deepcopy(self.config)
        invalid["scenarios"][0]["conditions"]["offline"] = "yes"
        with self.assertRaisesRegex(ValueError, "offline condition"):
            validate_config(invalid, self.catalog)


if __name__ == "__main__":
    unittest.main()
