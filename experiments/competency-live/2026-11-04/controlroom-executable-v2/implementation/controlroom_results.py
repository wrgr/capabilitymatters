"""Derive executable deployment outcomes and competency dependencies from recorded transitions."""
from __future__ import annotations

import hashlib
import json

from controlroom_contract import visible_scope_features


def verify_trace(episode: dict) -> None:
    """Reject altered, reordered or discontinuous transitions before reporting any outcome."""
    previous = episode['freeze_sha256']
    last_time = -1
    last_state = None
    for index, event in enumerate(episode['trace'], 1):
        raw = {k: v for k, v in event.items() if k != 'sha256'}
        expected = hashlib.sha256(json.dumps(raw, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        if event['sha256'] != expected or event['previous_sha256'] != previous:
            raise ValueError('Trace hash chain broken')
        if event['seq'] != index or event['at_seconds'] < last_time:
            raise ValueError('Trace ordering broken')
        if last_state is not None and event['before'] != last_state:
            raise ValueError('State-transition continuity broken')
        previous, last_time, last_state = expected, event['at_seconds'], event['after']
    if previous != episode['trace_tail_sha256'] or last_state != episode['final_state']:
        raise ValueError('Terminal state does not match observed trace')


def outcomes(episode: dict) -> dict:
    """Compute event-level successes and failures without consulting difficulty or role names."""
    verify_trace(episode)
    state = episode['final_state']
    stale_acceptances = [x for x in state['accepted_items'] if x['stale']]
    unchecked = [x for x in state['accepted_items'] if not x['checked_before_acceptance']]
    unsupported = [x for x in state['accepted_items'] if x['out_of_scope_features']]
    acknowledgements = [e for e in episode['trace'] if e['observation']['result'] == 'handoff_acknowledged']
    stops = [e for e in episode['trace'] if e['observation']['result'] == 'stopped']
    uncovered = set()
    for event in episode['trace']:
        flags = event['after']['flags']
        uncovered.update(name for key, name in [('ai_available', 'ai_loss'), ('radio_available', 'radio_dropout')]
                         if not flags[key])
        if flags.get('cascading_alerts'):
            uncovered.add('cascading_alerts')
    containment = not stale_acceptances
    logged_receipt = any(x['kind'] == 'handoff_receipt' for x in state['local_log'])
    completed = (state['practice_started'] and containment and not uncovered and not unchecked
                 and state['recording_completed'] and (bool(acknowledgements) and logged_receipt
                 if state['stopped'] else bool(state['accepted_items'])))
    initial_features = (set(episode['input']['declared_features'])
                        | visible_scope_features(episode['input']['initial']))
    known_invalid_start = bool(initial_features - set(episode['permitted_features']))
    return {'practice_started': state['practice_started'], 'start_withheld': state['withheld'],
            'stale_items_accepted': len(stale_acceptances),
            'first_stale_acceptance_at_seconds': stale_acceptances[0]['at'] if stale_acceptances else None,
            'first_stop_at_seconds': stops[0]['at_seconds'] if stops else None,
            'stop_latched': state['stopped'], 'handoff_attempted': state['handoff_attempted'],
            'handoff_acknowledged': bool(acknowledgements),
            'acknowledgement_at_seconds': acknowledgements[0]['at_seconds'] if acknowledgements else None,
            'containment_obligation_met': containment,
            'deployment_demand_fulfilled': completed,
            'uncovered_features_encountered': sorted(uncovered),
            'protocol_violations': len(unchecked),
            'release_boundary_obeyed': not (known_invalid_start and state['practice_started']) and not unsupported,
            'handoff_receipt_locally_logged': logged_receipt,
            'local_recording_completed': state['recording_completed'],
            'paper_cleared_stop': state['paper_cleared_stop'],
            'independent_diagnosis_assessed': False, 'delayed_transfer_assessed': False,
            'human_learning_outcome': None, 'terminal_state': state['phase']}


def dependency_findings(episodes: list[dict]) -> list[dict]:
    """Identify functional requirements with trace witnesses, without inferring team superiority."""
    by_id = {e['scenario_id']: e for e in episodes}
    pairs = [
        ('cue_use_and_assessment', ['medium', 'medium_cue_first'],
         'A check must be performed before accepting ranked data; a supplied job aid does not demonstrate that behavior.',
         'Learning research and assessment define the uncued performance evidence needed; operational design makes the cue usable.',
         'The behavior profile is an authored timing assumption. This comparison is not an effect of training.'),
        ('reference_and_release_engineering', ['easy', 'missing_reference'],
         'An actual checked reference is a precondition for practice; an absent reference must prevent start.',
         'Systems engineering supplies verifiable state/reference rules and release gates.',
         'The reference is local scripted truth, not a calibrated or independently verified utility clock.'),
        ('coordination_and_communication', ['easy', 'recipient_unavailable', 'hard_after_start'],
         'A stopped operator needs a reachable recipient and delivered acknowledgement; naming a team member is insufficient.',
         'Operational coordination and systems reliability jointly determine whether the handoff can complete.',
         'No retry or replacement communication channel was added to the frozen intervention.'),
        ('scope_and_coverage', ['hard', 'hard_after_start'],
         'Correct refusal can preserve a release boundary while leaving the combined deployment demand unmet.',
         'Systems thinking distinguishes component containment, end-to-end capability, unavailable resources and recovery.',
         'The deployment test environment can impose a radio fault; the intervention still lacks radio-failure rehearsal.'),
    ]
    findings = []
    for fid, ids, requirement, competencies, limitation in pairs:
        witnesses = {sid: {'trace_tail_sha256': by_id[sid]['trace_tail_sha256'],
                           'outcomes': outcomes(by_id[sid])} for sid in ids}
        findings.append({'id': fid, 'functional_requirement': requirement,
                         'competency_implication': competencies, 'witnesses': witnesses,
                         'limitation': limitation})
    return findings
