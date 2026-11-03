"""Check the narrow context-continuation contract with explicitly synthetic journal fragments."""
from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dynamic_amendment import ADAPTED_FILES, ARCHIVE, AMENDMENT_VERSION, context_limit, effective_sources, validate_amendment
from dynamic_contract import digest


def fragment() -> tuple[dict, dict]:
    """Create a synthetic scope-validation fragment, never a research run or model response."""
    old = json.loads((ROOT / "tests/fixtures/dynamic-context-baseline.json").read_text())
    config = {"budgets": {"max_context_chars": 180000, "design_develop": 24, "deploy_test": 12}}
    events = [{"seq": 1, "kind": "created", "payload": {}, "hash": "a" * 64},
              {"seq": 2, "kind": "frozen", "payload": {"artifact_version": 1}, "hash": "b" * 64}]
    run = {"config": config, "config_sha256": digest(config), "runtime_sources": old, "events": events}
    new = {**old, "dynamic_amendment.py": "c" * 64}
    for name in ADAPTED_FILES:
        new[name] = "c" * 64
    value = {"schema_version": AMENDMENT_VERSION, "amendment_id": "test-context-amendment", "scope": "context_character_allowance_only",
             "old_context_limit": 180000, "new_context_limit": 600000, "config_sha256": run["config_sha256"],
             "original_event_count": 2, "original_head": "b" * 64, "original_run_sha256": "d" * 64,
             "old_runtime_sources": old, "new_runtime_sources": new, "new_source_set_sha256": digest(new),
             "archive": ARCHIVE, "reason": "Synthetic validation fixture only."}
    return run, {"kind": "runtime_amendment", "actor": "user", "phase": "deploy_test", "payload": value}


class DynamicAmendmentTests(unittest.TestCase):
    """Reject silent overrides and preserve context-only method scope."""

    def test_effective_limit_changes_only_after_visible_amendment(self) -> None:
        """A replay prefix retains its original limit and source identity."""
        run, event = fragment()
        validate_amendment(run, event)
        self.assertEqual(context_limit(run), 180000)
        self.assertEqual(effective_sources(run), run["runtime_sources"])
        original = copy.deepcopy(run["config"])
        run["events"].append(event)
        self.assertEqual(context_limit(run), 600000)
        self.assertEqual(effective_sources(run), event["payload"]["new_runtime_sources"])
        self.assertEqual(run["config"], original)

    def test_other_budget_changes_are_rejected(self) -> None:
        """The continuation cannot be used as a generic cap-relaxation mechanism."""
        for value in (180001, 900000, 6000000):
            run, event = fragment()
            event["payload"]["new_context_limit"] = value
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "180000 to 600000"):
                validate_amendment(run, event)

    def test_protected_sources_cannot_change(self) -> None:
        """Expertise, evidence, evaluator, provider and routing code stay pinned."""
        for name in ("dynamic_messages.py", "dynamic_observations.py", "dynamic_evaluator.py", "dynamic_state.py", "dynamic_provider.py"):
            run, event = fragment()
            event["payload"]["new_runtime_sources"][name] = "e" * 64
            event["payload"]["new_source_set_sha256"] = digest(event["payload"]["new_runtime_sources"])
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, "may not change"):
                validate_amendment(run, event)

    def test_pending_request_blocks_migration(self) -> None:
        """An in-flight authoring or evaluation call cannot straddle a source migration."""
        run, event = fragment()
        run["events"].append({"seq": 3, "kind": "request", "payload": {"purpose": "conversation"}, "hash": "f" * 64})
        with self.assertRaisesRegex(ValueError, "request is pending"):
            validate_amendment(run, event)

    def test_any_prior_expert_request_blocks_retroactive_amendment(self) -> None:
        """A failed expert attempt still prevents describing the method change as pre-review."""
        run, event = fragment()
        run["events"] += [{"seq": 3, "kind": "request", "payload": {"purpose": "evaluation"}, "hash": "f" * 64},
                          {"seq": 4, "kind": "turn_failed", "payload": {"request_seq": 3}, "hash": "e" * 64}]
        with self.assertRaisesRegex(ValueError, "before any expert"):
            validate_amendment(run, event)

    def test_configuration_or_prefix_rewrite_is_rejected(self) -> None:
        """A recorded amendment must extend the exact original input and event identity."""
        for field, value in (("config_sha256", "0" * 64), ("original_head", "0" * 64), ("original_event_count", 1)):
            run, event = fragment()
            event["payload"][field] = value
            with self.subTest(field=field), self.assertRaisesRegex(ValueError, "unchanged original prefix"):
                validate_amendment(run, event)


if __name__ == "__main__":
    unittest.main()
