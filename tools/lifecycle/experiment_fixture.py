"""Produce clearly labeled offline records for checking the experiment pipeline without model calls."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from engine import LIST_FIELDS

FIXTURE_HTML = """<!doctype html><html lang="en"><meta charset="utf-8"><title>Technical dry-run candidate</title>
<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:18px system-ui;max-width:42rem;margin:2rem auto;padding:1rem;color:#183344}label,input,button,output{display:block;margin:1rem 0}input,button{font:inherit;padding:.6rem}strong{color:#8b3d14}</style>
<h1>Technical dry-run candidate</h1><p><strong>Offline fixture, not an agent-generated learning intervention.</strong></p>
<p>This interaction checks that a saved artifact can be replayed in the isolated preview. It makes no claim about learning or team performance.</p>
<label for="note">Write a fictional review note</label><input id="note" maxlength="200"><button id="show" type="button">Preview note</button><button id="clear" type="button">Clear</button><output id="result" aria-live="polite">No note yet.</output>
<script>const note=document.getElementById('note'),result=document.getElementById('result');document.getElementById('show').onclick=()=>{result.textContent=note.value||'No note yet.'};document.getElementById('clear').onclick=()=>{note.value='';result.textContent='No note yet.'};</script></html>"""


class DryRunProvider:
    """Exercise journal transport and replay without simulating competency effects."""
    mode = "experimental-dry-run"

    def call(self, role: str, stage: str, prompt: str, directory: Path, ordinal: int) -> tuple[dict, dict]:
        """Return a deterministic technical receipt with no scientific outcome claims."""
        context = json.loads(next(line.removeprefix("TURN_CONTEXT: ") for line in prompt.splitlines()
                                  if line.startswith("TURN_CONTEXT: ")))
        response = {field: [] for field in LIST_FIELDS}
        response.update({"message": f"Offline pipeline check: {context['actor']} at {stage}. No model was called.",
                         "artifact_title": f"Technical dry-run record: {stage}",
                         "artifact_body": "This is an offline execution fixture. The configuration, prompt, sequence, and generated record are retained for transport and replay verification. No team behavior, competency effect, or learning outcome was evaluated.",
                         "prototype_html": FIXTURE_HTML if context["coordinator"] and stage == "build" else "",
                         "decision": "Continue the fixed technical verification schedule. Scientific interpretation remains unavailable.",
                         "revisit_stage": "", "challenged_assumption": "",
                         "evidence_refs": context["prior_event_sequences"][-3:]})
        metadata = {"provider": "offline-fixture", "model_requested": "none", "actual_model": "none",
                    "scientific_evidence": False, "fresh_call": True, "response_reused": False,
                    "prompt_hash": hashlib.sha256(prompt.encode()).hexdigest(), "ordinal": ordinal}
        return response, metadata
