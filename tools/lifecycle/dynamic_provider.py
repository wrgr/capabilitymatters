"""Invoke an explicitly selected local provider while retaining receipts and rejecting tool activity."""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import time
from pathlib import Path

from dynamic_contract import require, text_hash

DISABLED_FEATURES = ("shell_tool", "unified_exec", "apps", "browser_use", "browser_use_external",
                     "computer_use", "multi_agent", "skill_search")


class ProviderAlreadyInvoked(ValueError):
    """Signal that another invocation owns this request without consuming it again."""


def _configuration_notice(item: dict) -> bool:
    if item.get("type") != "error" or not isinstance(item.get("message"), str):
        return False
    patterns = [
        re.escape("Codex is ignoring 1 unrecognized configuration setting. Check for typos or deprecated settings.\n  user (")
        + r"[^\r\n]+" + re.escape("): `features.experimental_use_rmcp_client` is ignored."),
        re.escape("`[features].imagegenext` is deprecated. Use `[features].image_generation` instead. (Enable it with `--enable image_generation` or `[features].image_generation` in config.toml. See https://developers.openai.com/codex/config-basic#feature-flags for details.)"),
        re.escape("Under-development features enabled: local_thread_store_compression. Under-development features are incomplete and may behave unpredictably. To suppress this warning, set `suppress_unstable_features_warning = true` in ")
        + r"[^\r\n]+" + re.escape("/config.toml."),
    ]
    return any(re.fullmatch(pattern, item["message"]) for pattern in patterns)


def inspect_receipt(path: Path) -> dict:
    """Verify completion and report actual tool activity rather than trusting prompt instructions."""
    events = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    completed = [event for event in events if event.get("type") == "turn.completed"]
    tools, errors, warnings = [], [], []
    for event in events:
        item = event.get("item", {})
        notice = _configuration_notice(item)
        if notice:
            warnings.append(item["message"])
        if event.get("type") in {"error", "turn.failed"} or (item.get("type") == "error" and not notice):
            errors.append(event)
        if event.get("type", "").startswith("item.") and item.get("type") not in {"agent_message", "reasoning", "error"}:
            tools.append(event)
    require(len(completed) == 1 and not tools and not errors,
            f"Provider receipt rejected: completed={len(completed)}, tool_items={len(tools)}, errors={len(errors)}")
    return {"completed": True, "tool_items": [], "errors": [], "configuration_warnings": warnings,
            "usage": completed[0].get("usage", {}),
            "receipt_sha256": text_hash(path.read_text(encoding="utf-8"))}


class CodexProvider:
    """Use fresh response-only invocations in an isolated read-only working directory."""

    def __init__(self, model: str, executable: str = "codex", timeout_seconds: int = 240, effort: str = "low") -> None:
        """Require an explicit model and local executable without introducing environment switches."""
        require(bool(model.strip()), "Live calls require an explicit model")
        resolved = shutil.which(executable)
        require(resolved is not None, "The selected Codex CLI executable is unavailable")
        require(1 <= timeout_seconds <= 900, "Invalid provider timeout")
        require(effort in {"low", "medium", "high", "xhigh"}, "Unknown reasoning effort")
        self.model = model
        self.executable = resolved
        self.timeout_seconds = timeout_seconds
        self.effort = effort

    def call(self, directory: Path, request: dict) -> tuple[dict, dict]:
        """Make one uncached fresh call, preserving response, receipt, and stderr exactly."""
        folder = directory / "calls" / f"{request['payload']['ordinal']:04d}"
        if (folder / "provider.jsonl").exists():
            raise ProviderAlreadyInvoked("This request already invoked a provider; preserve its receipt")
        isolated = folder / "isolated"
        try:
            isolated.mkdir(exist_ok=False)
        except FileExistsError as error:
            raise ProviderAlreadyInvoked("This request already has a claimed invocation") from error
        output = folder / "provider-response.json"
        command = [self.executable, "exec", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check",
                   "--color", "never", "--json", "-C", str(isolated.resolve()), "--model", self.model,
                   "-c", f'model_reasoning_effort="{self.effort}"',
                   "--output-schema", str((folder / "schema.json").resolve()), "-o", str(output.resolve())]
        for feature in DISABLED_FEATURES:
            command.extend(["--disable", feature])
        command.append("-")
        prompt = (folder / "prompt.txt").read_text(encoding="utf-8")
        require(text_hash(prompt) == request["payload"]["prompt_sha256"], "Retained prompt changed")
        started = time.monotonic()
        with (folder / "provider.jsonl").open("x", encoding="utf-8") as receipt, (folder / "provider.stderr.txt").open("x", encoding="utf-8") as stderr:
            process = subprocess.run(command, input=prompt, text=True, stdout=receipt, stderr=stderr,
                                     timeout=self.timeout_seconds, check=False)
        require(process.returncode == 0, f"Provider exited {process.returncode}; exact files retained in calls/{request['payload']['ordinal']:04d}")
        metadata = inspect_receipt(folder / "provider.jsonl")
        response = json.loads(output.read_text(encoding="utf-8"))
        return response, {**metadata, "provider": "codex", "model": self.model, "fresh_invocation": True,
                          "reasoning_effort": self.effort,
                          "evidence_kind": "live_model", "elapsed_ms": round((time.monotonic() - started) * 1000),
                          "raw_response_sha256": text_hash(output.read_text(encoding="utf-8"))}
