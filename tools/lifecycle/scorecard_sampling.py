"""Simulate conditional rubric-index distributions without reading team or treatment labels."""
from __future__ import annotations

import math
import random
import statistics
from typing import Any

from scorecard_contract import AXES, CRITERIA, stable_hash


def _rng(*keys: Any) -> random.Random:
    return random.Random(int(stable_hash(list(keys))[:16], 16))


def _rounded(value: float) -> float:
    return round(value, 6)


def _quantile(values: list[float], probability: float) -> float:
    ordered = sorted(values)
    index = probability * (len(ordered) - 1)
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    return _rounded(ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower))


def distribution(values: list[float]) -> dict:
    """Summarize a modeled distribution with quantiles rather than a human confidence interval."""
    return {"mean": _rounded(statistics.fmean(values)), "q05": _quantile(values, 0.05),
            "q50": _quantile(values, 0.5), "q95": _quantile(values, 0.95)}


def _correlated(rng: random.Random, rho: float) -> dict:
    common = rng.gauss(0, 1)
    return {axis: math.sqrt(rho) * common + math.sqrt(1 - rho) * rng.gauss(0, 1) for axis in AXES}


def _choose_profile(rng: random.Random, profiles: list[dict]) -> dict:
    value, cumulative = rng.random(), 0
    for profile in profiles:
        cumulative += profile["weight"]
        if value < cumulative:
            return profile
    return profiles[-1]


def _rubric_draw(review: dict, settings: dict, rng: random.Random) -> tuple[dict, dict]:
    sampled = {}
    for key, rating in review["ratings"].items():
        low, high, mode = rating["lower"], rating["upper"], rating["score"]
        sampled[key] = low if low == high else rng.triangular(low, high, mode)
    scores, gates = {}, {}
    for axis in AXES:
        keys = [key for key, item in CRITERIA.items() if item[0] == axis]
        scores[axis] = 25 * statistics.fmean(sampled[key] for key in keys)
        gates[axis] = all(sampled[key] >= settings["criterion_floors"][key] for key in keys)
    return scores, gates


def _cohort(scores: dict, gates: dict, profiles: list[dict], settings: dict, environment: random.Random, team: random.Random) -> tuple[dict, dict, float]:
    variation, thresholds = settings["variability"], settings["thresholds"]
    rho = variation["shared_correlation"]
    context_noise, team_noise = _correlated(environment, rho), _correlated(team, rho)
    shifted = {axis: scores[axis] + context_noise[axis] * variation["scenario_sd"][axis]
               + team_noise[axis] * variation["team_sd"][axis] for axis in AXES}
    sums, passes, all_pass = dict.fromkeys(AXES, 0.0), dict.fromkeys(AXES, 0), 0
    for _ in range(settings["cohort_size"]):
        profile = _choose_profile(environment, profiles)
        person_noise = _correlated(environment, rho)
        flags = {}
        for axis in AXES:
            shift = profile["axis_shift"][axis] * variation["profile_shift_scale"]
            dispersion = profile["axis_sd"][axis] * variation["person_sd_scale"]
            value = max(0, min(100, shifted[axis] + shift + dispersion * person_noise[axis]))
            sums[axis] += value
            flags[axis] = gates[axis] and value >= thresholds[axis]
            passes[axis] += int(flags[axis])
        all_pass += int(all(flags.values()))
    n = settings["cohort_size"]
    return ({axis: _rounded(sums[axis] / n) for axis in AXES},
            {axis: _rounded(passes[axis] / n) for axis in AXES}, _rounded(all_pass / n))


def conditional_samples(packet: dict, review: dict, settings: dict) -> dict:
    """Use shared person/context draws and independently keyed review uncertainty across candidates."""
    scenario = packet["scenario"]
    # The task mixture defines a pairing stratum; competency/condition names never enter this key.
    pair_key = {key: scenario[key] for key in ("id", "version", "population_profiles")}
    environment = _rng("person-context", settings["seed"], pair_key)
    reviewer = _rng("review-uncertainty", settings["seed"], packet["id"], stable_hash(review))
    team = _rng("assumed-residual-team", settings["seed"], packet["id"])
    samples = {"axes": {axis: [] for axis in AXES}, "gates": {axis: [] for axis in AXES},
               "person_pass": {axis: [] for axis in AXES}, "joint": [], "person_joint": []}
    for _ in range(settings["draws"]):
        scores, gates = _rubric_draw(review, settings, reviewer)
        means, person_pass, person_joint = _cohort(scores, gates, scenario["population_profiles"], settings, environment, team)
        for axis in AXES:
            samples["axes"][axis].append(means[axis])
            samples["gates"][axis].append(gates[axis])
            samples["person_pass"][axis].append(person_pass[axis])
        samples["joint"].append(all(gates[axis] and means[axis] >= settings["thresholds"][axis] for axis in AXES))
        samples["person_joint"].append(person_joint)
    return samples


def _probability(values: list[bool]) -> tuple[float, float]:
    probability = sum(values) / len(values)
    return _rounded(probability), _rounded(math.sqrt(probability * (1 - probability) / len(values)))


def summarize_samples(samples: dict, review: dict, settings: dict) -> tuple[dict, dict]:
    """Report axis thresholds, non-compensable gates, person fractions, and joint probability."""
    axes = {}
    for axis in AXES:
        threshold = settings["thresholds"][axis]
        threshold_only = [value >= threshold for value in samples["axes"][axis]]
        passed = [value and gate for value, gate in zip(threshold_only, samples["gates"][axis])]
        probability, error = _probability(passed)
        keys = [key for key, item in CRITERIA.items() if item[0] == axis]
        axes[axis] = {**distribution(samples["axes"][axis]), "threshold": threshold,
                      "p_meets_threshold": probability, "mc_standard_error": error,
                      "p_threshold_only": _probability(threshold_only)[0],
                      "p_gate_failure": _rounded(1 - sum(samples["gates"][axis]) / len(passed)),
                      "criterion_floors": {key: settings["criterion_floors"][key] for key in keys},
                      "person_pass_probability": _rounded(statistics.fmean(samples["person_pass"][axis])),
                      "rubric_point_score": _rounded(25 * statistics.fmean(review["ratings"][key]["score"] for key in keys))}
    probability, error = _probability(samples["joint"])
    joint = {"p_all_axes": probability, "mc_standard_error": error,
             "person_probability": _rounded(statistics.fmean(samples["person_joint"])),
             "meaning": "All three cohort-mean thresholds and their criterion floors in the same modeled draw."}
    return axes, joint


def paired_difference(baseline: dict, target: dict, settings: dict) -> dict:
    """Compare matched conditional draws without treating them as independent study participants."""
    margin, results = settings["meaningful_difference"], {}
    for axis in AXES:
        before, after = baseline["samples"]["axes"][axis], target["samples"]["axes"][axis]
        differences = [b - a for a, b in zip(before, after)]
        n = len(differences)
        gains = [value > margin for value in differences]
        target_pass = [gate and value >= settings["thresholds"][axis] for gate, value in zip(target["samples"]["gates"][axis], after)]
        results[axis] = {**distribution(differences), "meaningful_difference": margin,
                        "p_meaningful_gain": _probability(gains)[0],
                        "p_meaningful_loss": _rounded(sum(value < -margin for value in differences) / n),
                        "p_within_margin": _rounded(sum(abs(value) <= margin for value in differences) / n),
                        "p_gain_and_pass": _rounded(sum(a and b for a, b in zip(gains, target_pass)) / n),
                        "p_gate_regression": _rounded(sum(a and not b for a, b in zip(baseline["samples"]["gates"][axis], target["samples"]["gates"][axis])) / n),
                        "mc_standard_error": _probability(gains)[1]}
    joint_delta = statistics.fmean(int(b) - int(a) for a, b in zip(baseline["samples"]["joint"], target["samples"]["joint"]))
    return {"axes": results, "joint_probability_difference": _rounded(joint_delta)}
