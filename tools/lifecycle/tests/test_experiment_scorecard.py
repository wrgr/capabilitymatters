"""Protect blind evidence scoring, conditional probability semantics, and immutable replay."""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from experiment_config import default_config
from experiment_fixture import DryRunProvider
from experiment_runtime import run_experiment
from experiment_scenarios import apply_scenario, get_scenario
from experiment_scorecard import (assess_packet, build_blind_packet, compare_frozen, default_settings,
                                  freeze_review, review_template, settings_for_packet, stable_hash,
                                  unblind_scorecards, validate_frozen, validate_packet, validate_review,
                                  validate_settings)
from scorecard_contract import AXES, CRITERIA, rubric


def _rehash(value: dict, field: str) -> dict:
    value[field] = stable_hash({key: item for key, item in value.items() if key != field})
    return value


def _packet(identifier: str = "candidate-reference") -> dict:
    scenario = get_scenario("feedback-conversation")
    source = "<html><button>Choose a fictional case</button><p>Inspect this fixture only.</p></html>"
    packet = {"schema_version": 1, "id": identifier,
              "task": {"title": "Fictional practice", "brief": "Support a short practice task.", "constraints": ["No personal data."]},
              "scenario": {key: scenario[key] for key in ("id", "version", "axis_targets", "evidence_anchors", "population_profiles")},
              "rubric": rubric(), "evidence": [{"id": "E1", "kind": "artifact", "text": source,
                                                   "sha256": hashlib.sha256(source.encode()).hexdigest()}],
              "blinding": {"assignment_metadata_withheld": True, "content_disclosure_possible": True}}
    return _rehash(packet, "packet_hash")


def _review(packet: dict, score: float = 3) -> dict:
    review = review_template(packet)
    review.update(status="complete", reviewer={"id": "offline-method-test", "kind": "human", "model": ""})
    for rating in review["ratings"].values():
        rating.update(score=score, lower=score, upper=score, rationale="Synthetic rating for a method test, not an evaluated candidate.",
                      evidence_refs=[{"evidence_id": "E1", "quote": "Choose a fictional case", "locator": "button text"}])
    return review


def _settings() -> dict:
    settings = default_settings()
    settings.update(draws=100, cohort_size=10)
    return settings


def _mapping(packet: dict, run: str = "run-reference", condition: str = "default") -> dict:
    return {"packet_id": packet["id"], "packet_hash": packet["packet_hash"], "run_id": run,
            "run_head_hash": "a" * 64, "artifact_hash": "b" * 64, "config_hash": "c" * 64,
            "scenario_id": packet["scenario"]["id"], "condition": condition, "iteration": "iteration-test"}


class ScorecardTests(unittest.TestCase):
    """Verify model behavior without using offline fixtures as research findings."""

    def setUp(self) -> None:
        """Use short deterministic conditional simulations for each independent test."""
        self.packet = _packet()
        self.review = _review(self.packet)
        self.settings = _settings()

    def test_packet_builder_masks_assignment_and_retains_realized_constraints(self) -> None:
        """Only task, source, and supplied observations reach the review packet."""
        config = apply_scenario(default_config(), "feedback-conversation")["config"]
        config["name"] = "SECRET_CONDITION_NAME"
        config["execution"]["through"] = "build"
        with tempfile.TemporaryDirectory() as directory:
            run = run_experiment(config, Path(directory), DryRunProvider()).run
            packet, mapping = build_blind_packet(run, get_scenario("feedback-conversation"), ["Observed button receives focus."])
        encoded = json.dumps(packet)
        self.assertNotIn("SECRET_CONDITION_NAME", encoded)
        self.assertNotIn(run["id"], encoded)
        self.assertNotIn("config_hash", encoded)
        self.assertNotIn("simulation_effects", encoded)
        self.assertIn("at most five minutes", encoded)
        self.assertIn(config["environment"]["resources"], packet["task"]["brief"])
        self.assertEqual(mapping["run_id"], run["id"])
        self.assertEqual(mapping["run_head_hash"], run["events"][-1]["hash"])
        self.assertEqual(packet["evidence"][1]["kind"], "observation")
        self.assertTrue(packet["blinding"]["content_disclosure_possible"])

    def test_unknown_evidence_remains_incomplete_and_can_be_frozen(self) -> None:
        """A frozen missing review has no synthetic probabilities or invented failure."""
        frozen = freeze_review(self.packet, review_template(self.packet), self.settings)
        result = frozen["assessment"]
        self.assertEqual(result["status"], "incomplete")
        self.assertEqual(set(result["missing_criteria"]), set(CRITERIA))
        self.assertIsNone(result["axes"])
        self.assertIsNone(result["samples"])
        self.assertEqual(validate_frozen(frozen), frozen)
        revealed = unblind_scorecards([frozen], [_mapping(self.packet)])
        self.assertEqual(revealed["strata"][0]["distinct_generated_candidates"], 0)
        self.assertIsNone(revealed["strata"][0]["axes"]["learning"]["between_candidate_sd"])

    def test_evidence_citations_unknown_bounds_and_hidden_fields_are_rejected(self) -> None:
        """Ratings must cite real packet text and hidden assignment inputs fail closed."""
        review = copy.deepcopy(self.review)
        review["ratings"]["alignment"]["evidence_refs"][0]["quote"] = "a nonexistent observed success"
        with self.assertRaisesRegex(ValueError, "quote"):
            validate_review(review, self.packet)
        review = review_template(self.packet)
        review["ratings"]["alignment"]["lower"] = 1
        with self.assertRaisesRegex(ValueError, "Unknown"):
            validate_review(review, self.packet)
        packet = copy.deepcopy(self.packet)
        packet["scenario"]["condition"] = "expert"
        with self.assertRaisesRegex(ValueError, "blind scenario"):
            validate_packet(_rehash(packet, "packet_hash"))
        for kinds in (("observation",), ("artifact", "artifact")):
            packet = copy.deepcopy(self.packet)
            item = packet["evidence"][0]
            packet["evidence"] = [{**item, "id": f"E{index + 1}", "kind": kind} for index, kind in enumerate(kinds)]
            with self.subTest(kinds=kinds), self.assertRaisesRegex(ValueError, "one artifact"):
                validate_packet(_rehash(packet, "packet_hash"))
        review = copy.deepcopy(self.review)
        review["ratings"]["alignment"]["score"] = float("nan")
        with self.assertRaisesRegex(ValueError, "finite"):
            validate_review(review, self.packet)

    def test_replay_is_exact_and_detects_rehashed_inconsistent_scores(self) -> None:
        """Hash integrity and deterministic replay reject changed evidence or fabricated samples."""
        frozen = freeze_review(self.packet, self.review, self.settings)
        self.assertEqual(frozen["assessment"], assess_packet(self.packet, self.review, self.settings))
        self.assertEqual(validate_frozen(frozen), frozen)
        tampered = copy.deepcopy(frozen)
        tampered["assessment"]["axes"]["learning"]["mean"] += 1
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            validate_frozen(tampered)
        with self.assertRaisesRegex(ValueError, "summaries"):
            validate_frozen(_rehash(tampered, "record_hash"))
        tampered = copy.deepcopy(frozen)
        tampered["assessment"]["human_outcomes_observed"] = True
        with self.assertRaisesRegex(ValueError, "replay"):
            validate_frozen(_rehash(tampered, "record_hash"))
        packet = copy.deepcopy(self.packet)
        packet["evidence"][0]["text"] += " Changed."
        with self.assertRaisesRegex(ValueError, "Evidence text hash"):
            validate_packet(_rehash(packet, "packet_hash"))

    def test_decisive_human_gap_cannot_be_averaged_away(self) -> None:
        """A high numerical mean fails its axis when a prespecified criterion floor fails."""
        review = _review(self.packet, 4)
        review["ratings"]["agency_dignity"].update(score=0, lower=0, upper=0)
        self.settings["variability"].update(person_sd_scale=0, profile_shift_scale=0, scenario_sd=dict.fromkeys(AXES, 0))
        result = assess_packet(self.packet, review, self.settings)
        human = result["axes"]["human_flourishing"]
        self.assertAlmostEqual(human["mean"], 66.666667)
        self.assertEqual(human["p_threshold_only"], 1)
        self.assertEqual(human["p_gate_failure"], 1)
        self.assertEqual(human["p_meets_threshold"], 0)
        self.assertEqual(result["joint"]["p_all_axes"], 0)

    def test_identical_evidence_profiles_have_exact_null_paired_difference(self) -> None:
        """Condition labels or competency words cannot manufacture a treatment advantage."""
        other = _packet("candidate-another")
        other["evidence"][0]["text"] += "<!-- specialist competency persona emphasis -->"
        other["evidence"][0]["sha256"] = hashlib.sha256(other["evidence"][0]["text"].encode()).hexdigest()
        _rehash(other, "packet_hash")
        before = freeze_review(self.packet, self.review, self.settings)
        after = freeze_review(other, _review(other), self.settings)
        result = compare_frozen(before, after)
        for axis in AXES:
            self.assertEqual(before["assessment"]["axes"][axis], after["assessment"]["axes"][axis])
            self.assertEqual(result["axes"][axis]["q05"], 0)
            self.assertEqual(result["axes"][axis]["q95"], 0)
            self.assertEqual(result["axes"][axis]["p_within_margin"], 1)
            self.assertEqual(result["axes"][axis]["p_meaningful_gain"], 0)

    def test_point_rating_gain_is_monotone_under_shared_person_context_draws(self) -> None:
        """An actual rating difference propagates consistently without an assignment bonus."""
        other = _packet("candidate-improved")
        low = freeze_review(self.packet, _review(self.packet, 2), self.settings)
        high = freeze_review(other, _review(other, 3), self.settings)
        for axis in AXES:
            self.assertGreaterEqual(high["assessment"]["axes"][axis]["p_meets_threshold"], low["assessment"]["axes"][axis]["p_meets_threshold"])
            pairs = zip(low["assessment"]["samples"]["axes"][axis], high["assessment"]["samples"]["axes"][axis])
            self.assertTrue(all(before <= after for before, after in pairs))
        comparison = compare_frozen(low, high)
        self.assertEqual(comparison["axes"]["learning"]["p_meaningful_gain"], 1)

    def test_review_uncertainty_is_not_assumed_perfectly_correlated(self) -> None:
        """Shared conditions preserve evidence-rating uncertainty across independent reviewers."""
        for rating in self.review["ratings"].values():
            rating.update(lower=2, upper=4)
        other = _packet("candidate-uncertain")
        review = copy.deepcopy(self.review)
        review.update(packet_id=other["id"], packet_hash=other["packet_hash"])
        before = freeze_review(self.packet, self.review, self.settings)
        after = freeze_review(other, review, self.settings)
        comparison = compare_frozen(before, after)
        self.assertLess(comparison["axes"]["learning"]["q05"], 0)
        self.assertGreater(comparison["axes"]["learning"]["q95"], 0)

    def test_comparison_rejects_changed_settings_scenario_or_task(self) -> None:
        """A comparison cannot silently mix thresholds, problem spaces, or edited briefs."""
        baseline = freeze_review(self.packet, self.review, self.settings)
        settings = copy.deepcopy(self.settings)
        settings["thresholds"]["learning"] = 61
        with self.assertRaisesRegex(ValueError, "assumptions"):
            compare_frozen(baseline, freeze_review(self.packet, self.review, settings))
        for field in ("task", "scenario"):
            other = _packet("candidate-edited")
            if field == "task":
                other[field]["brief"] += " A changed task."
            else:
                other[field]["version"] = "2.0.0"
            _rehash(other, "packet_hash")
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "same scenario|identical task"):
                compare_frozen(baseline, freeze_review(other, _review(other), self.settings))

    def test_probability_outputs_distinguish_model_precision_and_replication(self) -> None:
        """Modeled people do not become observed humans or independent generated teams."""
        frozen = freeze_review(self.packet, self.review, self.settings)
        result = frozen["assessment"]
        self.assertFalse(result["human_outcomes_observed"])
        self.assertEqual(result["independent_empirical_sample_size"], 0)
        self.assertEqual(result["modeled_draws"], 100)
        self.assertEqual(result["modeled_cohort_size"], 10)
        self.assertEqual(result["calibration"], "uncalibrated_illustrative")
        other = _packet("candidate-second-review")
        duplicate = freeze_review(other, _review(other), self.settings)
        revealed = unblind_scorecards([frozen, duplicate], [_mapping(self.packet), _mapping(other)])
        stratum = revealed["strata"][0]
        self.assertEqual(stratum["frozen_review_count"], 2)
        self.assertEqual(stratum["distinct_generated_candidates"], 1)
        self.assertIsNone(stratum["axes"]["learning"]["between_candidate_sd"])
        with self.assertRaisesRegex(ValueError, "exactly one"):
            unblind_scorecards([frozen], [_mapping(self.packet), _mapping(other)])

    def test_scenario_targets_and_editable_sensitivity_scales_are_used(self) -> None:
        """Case thresholds are defaults while scale changes remain explicit pinned assumptions."""
        self.assertEqual(settings_for_packet(self.packet)["thresholds"], dict.fromkeys(AXES, 70))
        self.settings["variability"].update(person_sd_scale=0, profile_shift_scale=0, scenario_sd=dict.fromkeys(AXES, 0))
        result = assess_packet(self.packet, self.review, self.settings)
        self.assertTrue(all(axis["q05"] == axis["q95"] == 75 for axis in result["axes"].values()))
        for field, value in (("person_sd_scale", 3.1), ("profile_shift_scale", -1)):
            invalid = copy.deepcopy(self.settings)
            invalid["variability"][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, field):
                validate_settings(invalid)

    @unittest.skipUnless(shutil.which("node"), "Browser-compatible hash check requires Node")
    def test_hashes_match_browser_numeric_serialization(self) -> None:
        """Integral floats and six-place probabilities hash identically in Python and JavaScript."""
        frozen = freeze_review(self.packet, self.review, self.settings)
        values = [self.packet, self.settings, frozen, {"decimal": 0.000001, "integral": 4.0, "zero": -0.0, "text": "café 🧭"}]
        script = "const fs=require('fs'),c=require('crypto');function sort(v){return Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;}const values=JSON.parse(fs.readFileSync(0,'utf8'));process.stdout.write(JSON.stringify(values.map(v=>c.createHash('sha256').update(JSON.stringify(sort(v))).digest('hex'))));"
        result = subprocess.run([shutil.which("node"), "-e", script], input=json.dumps(values), text=True, capture_output=True, check=True)
        self.assertEqual(json.loads(result.stdout), [stable_hash(value) for value in values])


if __name__ == "__main__":
    unittest.main()
