"""Bind a transparent executable adapter to the exact team-endorsed control-room intervention."""
from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path


RULES = {
    'timestamp-job-aid': ('aid_check', 'compare_display_to_authored_reference', 'mark_paper_uncertain'),
    'stop-and-handoff': ('latched_stop', 'send_required_fields', 'require_acknowledgement'),
    'sensor-staleness-rehearsal': ('prepare_reference', 'prestart_check', 'sensor_staleness_scope_only',
                                  'local_log', 'twenty_minute_limit'),
    'completed-scientist-consultation': ('no_diagnosis_certification', 'no_delayed_transfer_claim'),
}


@dataclass(frozen=True)
class FrozenProgram:
    """Executable permissions derived from this versioned manual clause-to-rule adapter."""

    sha256: str
    committed_units: int
    allowed_features: tuple[str, ...]
    core_endorsers: tuple[str, ...]
    handoff_fields: tuple[str, ...] = ('alarm', 'last_known_values', 'timestamp',
                                     'contradiction', 'ai_priority', 'stopped_status')
    diagnosis_assessment_funded: bool = False
    delayed_probe_funded: bool = False


def require(condition: bool, message: str) -> None:
    """Fail closed without relying on optimization-sensitive assertions."""
    if not condition:
        raise ValueError(message)


def read_json(path: Path) -> dict:
    """Read one explicit JSON object without changing retained evidence."""
    return json.loads(path.read_text())


def validate_model(model: dict) -> None:
    """Reject invalid timing and behavior inputs before any simulation is executed."""
    require(model['model_id'] == 'controlroom-deployment-v2', 'Unknown deployment model')
    require(model['allowed_initial_features'] == ['sensor_staleness'], 'Adapter cannot expand frozen scope')
    time = model['time_seconds']
    require([time[k] for k in ['practice_start', 'handoff', 'handoff_window_end', 'recording_start', 'end']]
            == [180, 780, 1080, 1080, 1200], 'Frozen 3/10/5/2-minute allocation changed')
    require(0 <= time['reference_prepare'] < time['reference_check'] < time['aid_check']
            < time['practice_start'], 'Preflight must fit inside the funded briefing segment')
    require(0 < time['ack_delay'] <= 300, 'Invalid acknowledgement delay')
    for profile in model['behavior_profiles'].values():
        require(all(type(v) is int and 0 < v < 600 for v in profile.values()), 'Invalid behavior timing')
    ids = [s['id'] for s in model['scenarios']]
    require(len(ids) == len(set(ids)), 'Duplicate episode ID')
    for scenario in model['scenarios']:
        require(scenario['behavior_profile'] in model['behavior_profiles'], 'Unknown behavior profile')
        require(all(type(v) is bool for v in scenario['initial'].values()), 'Initial flags must be Boolean')
        for change in scenario['environment_changes']:
            require(type(change['at']) is int and 0 <= change['at'] <= time['end'], 'Invalid event time')
            require(all(type(v) is bool for v in change['set'].values()), 'Environment flags must be Boolean')
            require(set(change['set']) <= {'sensor_stale', 'ai_available', 'radio_available',
                    'recipient_available', 'cascading_alerts', 'local_log_available', 'senior_available'},
                    'Unsupported environment transition')


def visible_scope_features(flags: dict) -> set[str]:
    """Identify current observable faults without reading future event schedules."""
    features = set()
    for flag, feature in [('ai_available', 'ai_loss'), ('radio_available', 'radio_dropout')]:
        if not flags[flag]:
            features.add(feature)
    if flags.get('cascading_alerts'):
        features.add('cascading_alerts')
    return features


def handoff_complete(report: dict | None, fields: tuple[str, ...]) -> bool:
    """Require meaningful actual values, explicit uncertainty and a stopped-status report."""
    if not isinstance(report, dict) or set(report) != set(fields):
        return False
    values = report['last_known_values']
    if not isinstance(values, dict) or values.get('freshness') != 'uncertain':
        return False
    value = values.get('value')
    if type(value) not in (int, float) or not math.isfinite(value):
        return False
    return (isinstance(report['alarm'], str) and bool(report['alarm'])
            and type(report['timestamp']) in (int, float) and math.isfinite(report['timestamp'])
            and isinstance(report['contradiction'], str) and report['contradiction'] != 'current'
            and bool(report['contradiction']) and isinstance(report['ai_priority'], str)
            and bool(report['ai_priority']) and report['stopped_status'] is True)


def required_local_records(stopped: bool, acknowledged: bool) -> set[str]:
    """Name the frozen operational records needed for a completed started exercise."""
    names = {'script_reference', 'reference_check', 'aid_check', 'freshness_comparison',
             'final_observations'}
    if stopped:
        names.add('stop')
    if acknowledged:
        names.add('handoff_receipt')
    return names


def compile_program(root: Path, model: dict) -> FrozenProgram:
    """Validate exact bytes, actual endorsements and every clause-to-rule mapping."""
    validate_model(model)
    raw = (root / model['frozen_path']).read_bytes()
    digest = hashlib.sha256(raw).hexdigest()
    receipt = read_json(root / model['receipt_path'])
    require(digest == model['frozen_sha256'] == receipt['sha256'], 'Frozen intervention hash changed')
    artifact = json.loads(raw)
    actions = {a['id']: a for a in artifact['actions']}
    require(set(actions) == set(model['action_mapping']) == set(RULES), 'Action coverage differs from frozen plan')
    for aid, mapping in model['action_mapping'].items():
        require(mapping['source_clause'] == actions[aid]['action'], f'Clause changed: {aid}')
        require(tuple(mapping['rules']) == RULES[aid], f'Unsupported adapter rule: {aid}')
    require(artifact['budget_spent'] == sum(a['cost'] for a in actions.values()) == 7, 'Frozen cost changed')
    approvals = [read_json(root / model['case_path'] / 'responses' / name)
                 for name in receipt['endorsement_files']]
    require({a['actor'] for a in approvals} == {'operator', 'safety'}, 'Actual joint authority missing')
    require(all(a['endorsed'] is True and a['artifact_sha256'] == digest for a in approvals),
            'Exact-byte endorsement missing')
    release = read_json(root / model['release_path'])
    primary = [s for s in model['scenarios'] if s['kind'] == 'primary']
    require([(s['difficulty'], s['source_event']) for s in primary]
            == [(e['difficulty'], e['event']) for e in release['events']], 'Original event description changed')
    return FrozenProgram(digest, artifact['budget_spent'], tuple(model['allowed_initial_features']),
                         tuple(sorted(a['actor'] for a in approvals)))
