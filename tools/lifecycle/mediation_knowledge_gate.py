"""Reject unsupported claim permissions at artifact acceptance without generating or repairing agent decisions."""
from __future__ import annotations

import json
from pathlib import Path


def require(condition: bool, message: str = 'Knowledge gate denied') -> None:
    """Reject a violation even when Python optimization disables assert statements."""
    if not condition:
        raise AssertionError(message)


def load(path: Path) -> dict:
    """Read an explicit retained evidence object."""
    return json.loads(path.read_text())


def own_evidence(spec: dict, actor: str) -> set[str]:
    """Resolve the identifiers supplied only to one professional role."""
    return {text.split(':', 1)[0] for text in spec['roles'][actor]['private_evidence']}


def check_claims(response: dict, role: dict, evidence: set[str], messages: set[str]) -> None:
    """Validate declared permissions and bases while leaving semantic judgment to audit."""
    for claim in response['claims']:
        scope, standing = claim['competency'], claim['standing']
        require(standing in {'supplied_fact', 'role_judgment', 'attributed_advice', 'hypothesis'})
        require(scope in role['competencies'] + ['hypothesis', 'attributed_advice'], 'Claim scope denied')
        basis = set(claim['basis'])
        require(bool(basis) and basis <= evidence | messages | {'public.brief', 'public.cost_reference'}, 'Unknown claim basis')
        if scope == 'hypothesis':
            # A non-specialist may retain this cautious scope while attributing real advice.
            require(standing in {'hypothesis', 'attributed_advice'}, 'Hypothesis presented as established')
        if scope == 'attributed_advice':
            require(standing == 'attributed_advice', 'Attribution standing required')
        if scope == 'attributed_advice' or standing == 'attributed_advice':
            require(bool(basis & messages), 'Unattributed specialist advice')


def validate(folder: Path, spec: dict, plan: dict) -> dict:
    """Check readable invocation manifests and response claims before a freeze can be accepted."""
    responses = {p.name: load(p) for p in (folder / 'responses').glob('*.json')}
    all_messages = {x['message_id'] for x in responses.values()}
    tasks = sorted((load(p) for p in (folder / 'invocations').glob('*.json')),
                   key=lambda x: x['created_at'])
    known: dict[str, set[str]] = {}
    delivered: dict[str, set[str]] = {}
    checked = []
    for task in tasks:
        actor = task['actor']
        if actor not in spec['roles'] or 'response_file' not in task:
            continue
        evidence = known.setdefault(actor, own_evidence(spec, actor))
        messages = delivered.setdefault(actor, set())
        for name in task.get('public_inputs', []):
            incoming = responses[name]
            messages.add(incoming['message_id'])
            evidence.update(incoming['evidence_disclosed'])
        response = responses[task['response_file']]
        require(set(response['evidence_disclosed']) <= evidence, 'Private evidence access denied')
        check_claims(response, spec['roles'][actor], evidence, messages)
        evidence.update(response['evidence_disclosed'])
        messages.add(response['message_id'])
        checked.append(response['message_id'])
    require(set(checked) == all_messages, 'Response lacks readable invocation receipt')
    require(bool(plan['description']), 'Artifact description missing')
    disclosed = {e for response in responses.values() for e in response['evidence_disclosed']}
    for action in plan['actions']:
        require(action['authority_scope'] in spec['roles'][action['owner']]['competencies'], 'Action authority denied')
        require(set(action['evidence_refs']) <= disclosed | {'public.brief', 'public.cost_reference'}, 'Undisclosed action evidence')
    return {'version': 2, 'accepted_messages': checked,
            'meaning': 'Declared scope and evidence permissions passed; semantic expertise and actual tool access still require independent audit.'}
