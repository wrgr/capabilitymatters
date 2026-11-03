"""Verify provider receipts and local CLI execution using offline fixtures without model calls."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dynamic_contract import load_catalog, make_config
from dynamic_flower import parser
from dynamic_journal import create, load
from dynamic_provider import CodexProvider, ProviderAlreadyInvoked, inspect_receipt
from dynamic_runtime import request_turn
from test_dynamic_flow import HTML, evidence_for, response


class DynamicProviderTests(unittest.TestCase):
    """Keep actual errors, provider activity, and configuration notices distinguishable."""

    def setUp(self) -> None:
        """Allocate a temporary raw-receipt location for each offline assertion."""
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.path = Path(self.temporary.name) / "provider.jsonl"

    def _receipt(self, events: list[dict]) -> dict:
        self.path.write_text("\n".join(json.dumps(e) for e in events) + "\n")
        return inspect_receipt(self.path)

    def test_known_configuration_notices_remain_visible(self) -> None:
        """Only narrowly recognized notices can coexist with a completed response."""
        notices = json.loads((ROOT / "tests/fixtures/codex-configuration-warnings.json").read_text())
        if isinstance(notices, dict):
            notices = notices["events"]
        result = self._receipt([*notices, {"type": "turn.completed", "usage": {"input_tokens": 10, "cached_input_tokens": 4, "output_tokens": 5}}])
        self.assertTrue(result["completed"])
        self.assertEqual(len(result["configuration_warnings"]), len(notices))
        self.assertEqual(result["usage"]["cached_input_tokens"], 4)

    def test_tool_use_real_errors_and_missing_completion_reject(self) -> None:
        """A response-only prompt never substitutes for checking the receipt."""
        completion = {"type": "turn.completed", "usage": {}}
        for event in ({"type": "item.completed", "item": {"type": "command_execution", "command": "echo test"}},
                      {"type": "error", "message": "Provider failed"},
                      {"type": "item.completed", "item": {"type": "error", "message": "Real failure"}}):
            with self.subTest(event=event), self.assertRaisesRegex(ValueError, "receipt rejected"):
                self._receipt([event, completion])
        with self.assertRaisesRegex(ValueError, "completed=0"):
            self._receipt([])

    def test_provider_command_is_isolated_fresh_and_explicit(self) -> None:
        """Inspect a mocked subprocess command without invoking any live model."""
        catalog = load_catalog()
        config = make_config(catalog, "feedback_handoff", "generalist")
        directory = Path(self.temporary.name) / "live-command-fixture"
        create(directory, config, catalog, "live")
        request = request_turn(directory)
        captured = {}

        def fake_run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess:
            """Write a clearly synthetic receipt in place of executing a subprocess."""
            captured["command"] = command
            kwargs["stdout"].write(json.dumps({"type": "turn.completed", "usage": {"input_tokens": 1, "output_tokens": 1}}) + "\n")
            Path(command[command.index("-o") + 1]).write_text(json.dumps(response("question", ["generalist"])))
            return subprocess.CompletedProcess(command, 0)

        with patch("dynamic_provider.shutil.which", return_value="/fake/codex"), patch("dynamic_provider.subprocess.run", side_effect=fake_run):
            provider = CodexProvider("explicit-model", executable="/fake/codex", effort="low")
            value, provenance = provider.call(directory, request)
            with self.assertRaises(ProviderAlreadyInvoked):
                provider.call(directory, request)
        command = captured["command"]
        self.assertIn("--ephemeral", command)
        self.assertEqual(command[command.index("--sandbox") + 1], "read-only")
        self.assertTrue(command[command.index("-C") + 1].endswith("calls/0001/isolated"))
        self.assertEqual(value["kind"], "question")
        self.assertEqual(provenance["reasoning_effort"], "low")
        self.assertEqual(provenance["tool_items"], [])


class DynamicCliTests(unittest.TestCase):
    """Exercise actual CLI file exchange without invoking a provider or browser."""

    def test_cli_fixture_lifecycle_preserves_origin(self) -> None:
        """Configuration, addressed implementation, freeze, and evidence import form a runnable workflow."""
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            config_path, directory = root / "configuration.json", root / "cli-fixture"

            def invoke(*arguments: str) -> dict:
                """Invoke the local CLI and retain a machine-readable successful response."""
                process = subprocess.run([sys.executable, str(ROOT / "dynamic_flower.py"), *arguments],
                                         text=True, capture_output=True, check=False)
                self.assertEqual(process.returncode, 0, process.stdout + process.stderr)
                return json.loads(process.stdout)

            invoke("config", "--case", "feedback_handoff", "--condition", "generalist", "--output", str(config_path))
            invoke("create", "--config", str(config_path), "--output", str(directory), "--mode", "fixture")
            message_path = root / "response.json"
            message_path.write_text(json.dumps(response("question", ["generalist"])))
            question = invoke("advance", "--run", str(directory), "--response", str(message_path))
            message_path.write_text(json.dumps(response("implementation", ["facilitator"], reply_to=[question["payload"]["message_id"]],
                                                       artifact={"html": HTML, "change_summary": "CLI fixture", "parent_version": None})))
            invoke("advance", "--run", str(directory), "--response", str(message_path))
            frozen = invoke("freeze", "--run", str(directory))
            self.assertEqual(frozen["payload"]["evidence_kind"], "fixture")
            evidence = evidence_for(load(directory), "feedback_handoff_easy", "unavailable")
            source = root / "evidence.json"
            source.write_text(json.dumps(evidence))
            invoke("observe", "--run", str(directory), "--evidence", str(source))
            state = invoke("inspect", "--run", str(directory))
            self.assertEqual(state["phase"], "deploy_test")
            self.assertEqual(state["turns"]["design_develop"], 2)
            self.assertEqual(state["evaluations"], [])

    def test_cli_requires_explicit_provider_and_model_flags(self) -> None:
        """An ordinary fixture command cannot accidentally select a live provider."""
        args = parser().parse_args(["run", "--run", "/tmp/example", "--max-calls", "4", "--provider", "codex",
                                   "--model", "chosen-model", "--executable", "/opt/codex/bin/codex", "--effort", "low"])
        self.assertEqual(args.executable, "/opt/codex/bin/codex")
        self.assertEqual(args.model, "chosen-model")
        self.assertEqual(args.max_calls, 4)


if __name__ == "__main__":
    unittest.main()
