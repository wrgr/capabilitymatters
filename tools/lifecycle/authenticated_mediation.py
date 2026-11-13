"""Retain and verify authenticated subagent experiments without generating participant speech."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from datetime import datetime, timezone
from mediation_knowledge_gate import require, validate


def now() -> str:
    """Return an explicit UTC receipt time."""
    return datetime.now(timezone.utc).isoformat()


def digest(value: bytes) -> str:
    """Hash exact retained bytes rather than a reconstructed object."""
    return hashlib.sha256(value).hexdigest()


def read(path: Path) -> dict:
    """Read a retained JSON object."""
    return json.loads(path.read_text())


def write_new(path: Path, value: dict) -> None:
    """Write a new receipt and reject accidental replacement."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x') as handle:
        json.dump(value, handle, indent=2, ensure_ascii=False)
        handle.write('\n')


def register(folder: Path, actor: str, agent_id: str) -> None:
    """Record the returned collaboration identity without inventing model resolution."""
    write_new(folder / 'provenance' / f'{actor}.json', {
        'description': 'Runtime identity receipt for an actual Codex collaboration subagent.',
        'actor': actor, 'agent_id': agent_id, 'registered_at': now(),
        'backend': 'Codex authenticated collaboration tools', 'fork_turns': 'none',
        'model_selection': 'inherited parent runtime; no override',
        'resolved_model_id': None, 'model_resolution_limitation':
        'Launch tool does not expose model; later rollout transcript records runtime model and effort. Provider checkpoint and temperature remain undisclosed.',
        'api_key_used': False, 'github_actions_execution': False,
        'isolation': 'Separate conversation; shared filesystem; packet access is instruction-bounded.'})


def freeze(folder: Path, draft: Path, endorsements: list[str]) -> None:
    """Seal the team-authored artifact before releasing any deployment event."""
    spec = read(folder / 'spec.json')
    plan = read(draft)
    require(plan['case_id'] == spec['case_id'], 'Wrong case')
    require(len(endorsements) == len(spec['core']), 'Missing core endorsement')
    content = draft.read_bytes()
    approvals = [read(folder / 'responses' / name) for name in endorsements]
    require({x['actor'] for x in approvals} == set(spec['core']), 'Wrong endorsers')
    require(all(x['endorsed'] is True and x['artifact_sha256'] == digest(content)
                for x in approvals), 'Draft not endorsed exactly')
    require(sum(x['cost'] for x in plan['actions']) <= spec['budget'], 'Budget exceeded')
    require(plan['budget_spent'] == sum(x['cost'] for x in plan['actions']), 'Inconsistent cost')
    require(all(type(x['cost']) is int and x['cost'] >= 0 and x['owner'] in spec['roles'] for x in plan['actions']))
    require(all(x['source_messages'] for x in plan['actions']), 'Missing contribution trace')
    messages = {read(p)['message_id'] for p in (folder / 'responses').glob('*.json')}
    require(all(set(x['source_messages']) <= messages for x in plan['actions']), 'Unknown message')
    gate = validate(folder, spec, plan) if spec.get('knowledge_gate_version') == 2 else None
    target = folder / 'frozen-intervention.json'
    with target.open('xb') as handle:
        handle.write(content)
    write_new(folder / 'freeze-receipt.json', {
        'description': 'Exact team artifact freeze; transport does not repair its content.',
        'frozen_at': now(), 'sha256': digest(content), 'source': str(draft),
        'endorsement_files': endorsements,
        'knowledge_gate': gate,
        'events_sha256': digest((folder / 'sealed-events.json').read_bytes())})


def reveal(folder: Path) -> None:
    """Release precommitted stress conditions only after an intact freeze exists."""
    receipt = read(folder / 'freeze-receipt.json')
    require(digest((folder / 'frozen-intervention.json').read_bytes()) == receipt['sha256'])
    require(digest((folder / 'sealed-events.json').read_bytes()) == receipt['events_sha256'])
    write_new(folder / 'deployment-release.json', {
        'description': 'All stress conditions are independent applications of the same frozen plan.',
        'released_at': now(), 'freeze_sha256': receipt['sha256'],
        'events': read(folder / 'sealed-events.json')['events'],
        'no_repair': True, 'evidence_kind': 'model_reasoned_synthetic_deployment'})


def verify(folder: Path) -> dict:
    """Check evidence integrity and retain failures instead of converting them to success."""
    failures = []
    spec = read(folder / 'spec.json')
    receipt = read(folder / 'freeze-receipt.json')
    release = read(folder / 'deployment-release.json')
    checks = {
        'freeze_intact': digest((folder / 'frozen-intervention.json').read_bytes()) == receipt['sha256'],
        'events_precommitted': digest((folder / 'sealed-events.json').read_bytes()) == receipt['events_sha256'],
        'freeze_before_release': receipt['frozen_at'] < release['released_at'],
        'three_levels': [x['difficulty'] for x in release['events']] == ['easy', 'medium', 'hard'],
        'all_core_registered': all((folder / 'provenance' / f'{x}.json').exists() for x in spec['core']),
        'independent_review': (folder / 'evaluation.json').exists(),
        'deployment_recorded': (folder / 'deployment.json').exists(),
        'core_transcripts_retained': all((folder / 'runtime-transcripts' / f'{x}-rollout.json').exists()
                                         for x in spec['core']),
    }
    if checks['core_transcripts_retained']:
        starts = [read(folder / 'runtime-transcripts' / f'{x}-rollout.json')['provenance']['timestamp']
                  for x in spec['core']]
        checks['events_before_agents'] = datetime.fromisoformat(read(folder / 'sealed-events.json')['created_at']) < min(
            datetime.fromisoformat(x.replace('Z', '+00:00')) for x in starts)
    if spec.get('knowledge_gate_version') == 2:
        validate(folder, spec, read(folder / 'frozen-intervention.json'))
        checks['declared_permissions_rechecked'] = True
    if checks['deployment_recorded']:
        deployment = read(folder / 'deployment.json')
        checks['deployment_uses_same_freeze'] = deployment['freeze_sha256'] == receipt['sha256']
        checks['deployment_has_three_levels'] = [x['difficulty'] for x in deployment['events']] == ['easy', 'medium', 'hard']
    if checks['independent_review']:
        evaluation = read(folder / 'evaluation.json')
        checks['reviewer_is_separate'] = evaluation['evaluator_agent'] not in {
            read(p)['agent_id'] for p in (folder / 'provenance').glob('*.json')
            if p.stem != 'evaluator'}
    for key, passed in checks.items():
        if not passed:
            failures.append(key)
    files = sorted(p for p in folder.rglob('*') if p.is_file() and p.name != 'verification.json')
    return {'description': 'Integrity checks, not a certificate of expertise or ecological validity.',
            'verified_at': now(), 'checks': checks, 'failures': failures,
            'inventory': [{'path': str(p.relative_to(folder)), 'sha256': digest(p.read_bytes())} for p in files]}


def main() -> None:
    """Expose evidence operations without a model provider or scripted policy agent."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['register', 'freeze', 'reveal', 'verify'])
    parser.add_argument('folder', type=Path)
    parser.add_argument('extra', nargs='*')
    args = parser.parse_args()
    try:
        if args.operation == 'register':
            register(args.folder, *args.extra)
        elif args.operation == 'freeze':
            freeze(args.folder, Path(args.extra[0]), args.extra[1:])
        elif args.operation == 'reveal':
            reveal(args.folder)
        else:
            result = verify(args.folder)
            write_new(args.folder / 'verification.json', result)
            print(json.dumps({'checks': result['checks'], 'failures': result['failures']}))
            if result['failures']:
                raise SystemExit(1)
    except Exception as error:
        write_new(args.folder / 'technical-failures' / f'{now()}.json', {
            'description': 'Failed evidence operation retained without repair.',
            'operation': args.operation, 'arguments': args.extra,
            'error_type': type(error).__name__, 'error': str(error)})
        raise


if __name__ == '__main__':
    main()
