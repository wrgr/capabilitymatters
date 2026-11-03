"""Check design-context amendment restrictions with synthetic fragments, without generating research outcomes."""
from __future__ import annotations

import copy
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dynamic_amendment import _payload, _refused_prompt, _source_map, validate_amendment
from dynamic_contract import digest
from test_dynamic_amendment import fragment


def design_fragment() -> tuple[dict, dict, dict]:
    """Construct explicitly synthetic state for checking amendment permissions only."""
    run, _ = fragment()
    run["events"][1] = {"seq": 2, "kind": "artifact", "payload": {"version": 1}, "hash": "b" * 64}
    run["events"].append({"seq": 3, "kind": "stopped", "payload": {"reason": "context_limit: full prompt needs 217067 characters; no transcript was truncated", "complete": False}, "hash": "d" * 64})
    refusal = {"seq": 3, "hash": "d" * 64, "reason": run["events"][-1]["payload"]["reason"], "actor": "fixture-actor",
               "scheduler_reason": "answer:fixture", "prompt_characters": 217067, "prompt_sha256": "e" * 64}
    with patch("dynamic_amendment._refused_prompt", return_value=(refusal, "Synthetic fixture only")):
        value = _payload(run, b"synthetic fixture", _source_map(ROOT), "fixture-design-v2", "Synthetic contract test only.", 2)
    return run, {"kind": "runtime_amendment", "phase": "design_develop", "actor": "user", "payload": value}, refusal


class DesignAmendmentTests(unittest.TestCase):
    """Ensure the new branch cannot weaken the old method or unrelated runtime contracts."""

    def test_v1_frozen_precondition_is_unchanged(self) -> None:
        """A v2-shaped design record never receives v1's frozen-artifact authorization."""
        run, event, _ = design_fragment()
        event["payload"]["schema_version"] = "dynamic-flower-context-amendment-1"
        with self.assertRaisesRegex(ValueError, "frozen candidate"):
            validate_amendment(run, event)

    def test_v2_accepts_only_exact_declared_refusal_identity(self) -> None:
        """A recorded prompt identity cannot be substituted after the refusal."""
        run, event, refusal = design_fragment()
        with patch("dynamic_amendment._refused_prompt", return_value=(refusal, "Synthetic fixture only")):
            validate_amendment(run, event)
            altered = copy.deepcopy(event)
            altered["payload"]["refusal"]["prompt_sha256"] = "0" * 64
            with self.assertRaisesRegex(ValueError, "refusal identity"):
                validate_amendment(run, altered)

    def test_v2_cannot_change_any_peer_runtime_module(self) -> None:
        """Even modules adapted in v1 must remain exactly the v1 version for this continuation."""
        run, event, refusal = design_fragment()
        event["payload"]["new_runtime_sources"]["dynamic_records.py"] = "0" * 64
        event["payload"]["new_source_set_sha256"] = digest(event["payload"]["new_runtime_sources"])
        with patch("dynamic_amendment._refused_prompt", return_value=(refusal, "Synthetic fixture only")):
            with self.assertRaisesRegex(ValueError, "only the amendment module"):
                validate_amendment(run, event)

    def test_v2_cannot_cross_a_pending_request(self) -> None:
        """An already dispatched role must finish under its existing source identity."""
        run, event, _ = design_fragment()
        run["events"].append({"seq": 4, "kind": "request", "payload": {"purpose": "conversation"}, "hash": "f" * 64})
        with self.assertRaisesRegex(ValueError, "request is pending"):
            validate_amendment(run, event)

    def test_other_stop_reasons_do_not_authorize_context_change(self) -> None:
        """A call-budget stop cannot be used as evidence of a context-limit block."""
        run, _, _ = design_fragment()
        run["events"][-1]["payload"]["reason"] = "call_budget_exhausted"
        with self.assertRaisesRegex(ValueError, "not a context-limit refusal"):
            _refused_prompt(run)


if __name__ == "__main__":
    unittest.main()
