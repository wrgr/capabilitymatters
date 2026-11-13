"""Export public agent exchanges and provenance from a local Codex rollout without private reasoning."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from authenticated_mediation import digest, now, write_new


def public_record(row: dict) -> dict | None:
    """Keep task dialogue and tool records while excluding internal runtime instructions."""
    payload = row.get('payload', {})
    if row['type'] != 'response_item':
        return None
    kind = payload.get('type')
    allowed = kind in {'agent_message', 'custom_tool_call', 'custom_tool_call_output',
                       'function_call', 'function_call_output'}
    if kind == 'message':
        allowed = payload.get('role') in {'user', 'assistant'}
    if not allowed:
        return None
    # Passthrough fields can contain service/account identifiers, not participant speech.
    clean = {k: v for k, v in payload.items()
             if k != 'internal_chat_message_metadata_passthrough'}
    return {'timestamp': row.get('timestamp'), 'payload': clean}


def export(folder: Path, actor: str, source: Path) -> None:
    """Retain complete public exchanges and the runtime's declared model selection."""
    content = source.read_bytes()
    rows = [json.loads(line) for line in content.splitlines()]
    meta = next(x['payload'] for x in rows if x['type'] == 'session_meta')
    contexts = [x for x in rows if x['type'] == 'turn_context']
    provenance = {k: meta.get(k) for k in ['id', 'parent_thread_id', 'agent_path',
                                          'cli_version', 'model_provider', 'timestamp']}
    turns = [{'timestamp': x.get('timestamp'),
              **{k: x['payload'].get(k) for k in ['turn_id', 'model', 'effort']}}
             for x in contexts]
    records = [record for row in rows if (record := public_record(row)) is not None]
    write_new(folder / 'runtime-transcripts' / f'{actor}-rollout.json', {
        'description': 'Exact public input/output and tool records; private reasoning, runtime developer instructions and account passthrough identifiers excluded.',
        'exported_at': now(), 'source_basename': source.name, 'source_sha256': digest(content),
        'actor': actor, 'provenance': provenance, 'turn_contexts': turns, 'records': records,
        'limitations': ['Runtime model label is recorded, not an independently attested provider checkpoint.',
                       'No provider API response IDs or sampling temperature are exposed.',
                       'Task turns can contain multiple internal model continuations; do not count them as API calls.']})


def main() -> None:
    """Export one explicitly selected experiment subagent's retained rollout."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder', type=Path)
    parser.add_argument('actor')
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    export(args.folder, args.actor, args.source)


if __name__ == '__main__':
    main()
