"""Execute a frozen control-room procedure against an event-driven synthetic environment."""
from __future__ import annotations

import copy
import hashlib
import heapq
import json

from controlroom_contract import FrozenProgram


def freshness_status(display: dict, reference: dict | None) -> str:
    """Compare only operator-visible records, without an invented numerical age threshold."""
    if reference is None:
        return 'missing_reference'
    if display == reference:
        return 'current'
    if display['timestamp'] != reference['timestamp']:
        return 'contradiction'
    if display['state_id'] < reference['state_id']:
        return 'older_state'
    return 'indeterminate_match'


class DeploymentSimulator:
    """Maintain virtual time, operational state and a complete chained transition trace."""

    def __init__(self, program: FrozenProgram, model: dict, scenario: dict) -> None:
        """Create one independent episode without looking ahead at future failures."""
        self.program, self.model, self.scenario = program, model, scenario
        self.time = model['time_seconds']
        self.profile = model['behavior_profiles'][scenario['behavior_profile']]
        self.truth = copy.deepcopy(model['script_truth'])
        display = model['stale_display'] if scenario['initial']['sensor_stale'] else self.truth
        self.state = {'phase': 'preparing', 'flags': copy.deepcopy(scenario['initial']),
                      'display': copy.deepcopy(display), 'reference': None, 'reference_checked': False,
                      'aid_checked': False, 'practice_started': False, 'withheld': False,
                      'stopped': False, 'stop_at': None, 'inspection': None, 'accepted_items': [],
                      'handoff_payload': None, 'handoff_attempted': False, 'ack_at': None,
                      'paper_freshness': 'uncertain', 'paper_cleared_stop': False}
        self.queue: list[tuple[int, int, str, dict]] = []
        self.trace: list[dict] = []
        self.serial, self.clock = 0, 0
        self.previous = program.sha256
        self._schedule_contract()

    def schedule(self, at: int, kind: str, payload: dict | None = None) -> None:
        """Schedule a concrete event with stable ordering and no wall-clock waiting."""
        if at < self.clock or at > self.time['end']:
            raise ValueError('Event outside the executable time horizon')
        self.serial += 1
        heapq.heappush(self.queue, (at, self.serial, kind, payload or {}))

    def _schedule_contract(self) -> None:
        """Instantiate the funded time segments and independent environment timeline."""
        self.schedule(0, 'scope_gate')
        for key in ['reference_prepare', 'reference_check', 'aid_check']:
            self.schedule(self.time[key], key)
        self.schedule(self.time['practice_start'], 'practice_start')
        self.schedule(self.time['practice_start'] + self.profile['inspect_after_practice_start'], 'inspect')
        self.schedule(self.time['practice_start'] + self.profile['accept_after_practice_start'], 'accept')
        self.schedule(self.time['handoff'], 'handoff')
        self.schedule(self.time['handoff'] + 20, 'paper_check')
        self.schedule(self.time['end'], 'finish')
        for change in self.scenario['environment_changes']:
            self.schedule(change['at'], 'environment', change['set'])

    def _scope_gate(self, payload: dict) -> dict:
        """Enforce the actual dual authority and currently declared release scope."""
        excluded = sorted(set(self.scenario['declared_features']) - set(self.program.allowed_features))
        if excluded:
            self.state.update(withheld=True, phase='withheld')
        return {'result': 'start_withheld' if excluded else 'scope_permitted',
                'excluded_features': excluded, 'actual_endorsers': list(self.program.core_endorsers)}

    def _reference_prepare(self, payload: dict) -> dict:
        """Implement safety's authored local event record inside the funded briefing time."""
        if not self.state['flags']['reference_available']:
            return {'result': 'reference_missing'}
        self.state['reference'] = copy.deepcopy(self.truth)
        if not self.state['flags']['reference_correct']:
            self.state['reference']['state_id'] -= 1
        return {'result': 'reference_prepared', 'source': 'authored_local_event_record'}

    def _reference_check(self, payload: dict) -> dict:
        """Check safety's own scripted reference, not an independently verified physical clock."""
        valid = self.state['reference'] == self.truth
        self.state['reference_checked'] = valid
        return {'result': 'reference_check_passed' if valid else 'reference_check_failed'}

    def _aid_check(self, payload: dict) -> dict:
        """Check the realized aid's comparator, stop triggers and recipient before practice."""
        self.state['aid_checked'] = self.state['flags']['aid_check_passes']
        return {'result': 'aid_check_passed' if self.state['aid_checked'] else 'aid_check_failed',
                'procedure': 'compare_display_to_local_reference', 'recipient': 'safety',
                'stop_triggers': ['contradiction', 'older_state', 'missing_reference', 'indeterminate_match']}

    def _practice_start(self, payload: dict) -> dict:
        """Start only after the actual preparation events have passed their checks."""
        ready = self.state['reference_checked'] and self.state['aid_checked']
        self.state.update(practice_started=ready, withheld=not ready,
                          phase='active' if ready else 'withheld')
        return {'result': 'practice_started' if ready else 'start_withheld', 'preflight_passed': ready}

    def _stop(self, reason: str) -> dict:
        """Latch a stop without adding a restart or repair procedure."""
        if not self.state['stopped']:
            self.state['stop_at'] = self.clock
        self.state.update(stopped=True, phase='stopped')
        return {'result': 'stopped', 'reason': reason}

    def _inspect(self, payload: dict) -> dict:
        """Let the synthetic actor execute the aid using only visible display/reference fields."""
        status = freshness_status(self.state['display'], self.state['reference'])
        self.state['inspection'] = status
        return self._stop(status) if status != 'current' else {'result': 'freshness_passed'}

    def _accept(self, payload: dict) -> dict:
        """Execute an actor attempt; the world oracle independently records stale acceptance."""
        if self.state['stopped']:
            return {'result': 'acceptance_suppressed_by_stop'}
        if not self.state['flags']['ai_available']:
            return self._stop('ai_priority_unavailable')
        # A job aid is a procedure, not an unpurchased physical interlock.
        item = {'alarm': 'alarm-A', 'at': self.clock, 'display_used': copy.deepcopy(self.state['display']),
                'stale': self.state['display'] != self.truth,
                'checked_before_acceptance': self.state['inspection'] == 'current'}
        self.state['accepted_items'].append(item)
        return {'result': 'stale_item_accepted' if item['stale'] else 'current_item_accepted',
                'protocol_violation': not item['checked_before_acceptance']}

    def _handoff(self, payload: dict) -> dict:
        """Transmit the frozen fields once during the purchased handoff segment."""
        if not self.state['stopped']:
            return {'result': 'handoff_not_required'}
        report = {'alarm': 'alarm-A', 'last_known_values_uncertain': True,
                  'timestamp': self.state['display']['timestamp'], 'contradiction': self.state['inspection'],
                  'ai_priority': 'alarm-A' if self.state['flags']['ai_available'] else 'unavailable',
                  'stopped_status': True}
        self.state.update(handoff_attempted=True, handoff_payload=report)
        if not self.state['flags']['radio_available']:
            return {'result': 'handoff_packet_dropped', 'payload': report}
        self.schedule(self.clock + self.time['ack_delay'], 'acknowledge')
        return {'result': 'handoff_sent', 'payload': report}

    def _acknowledge(self, payload: dict) -> dict:
        """Require actual modeled channel and recipient availability for acknowledgement."""
        complete = set(self.state['handoff_payload']) == set(self.program.handoff_fields)
        ready = (self.state['flags']['radio_available'] and self.state['flags']['recipient_available']
                 and self.clock <= self.time['handoff_window_end'] and complete)
        if ready:
            self.state['ack_at'] = self.clock
        return {'result': 'handoff_acknowledged' if ready else 'handoff_unacknowledged',
                'required_fields_complete': complete}

    def _paper_check(self, payload: dict) -> dict:
        """Execute the frozen refusal to use uncertain paper values to clear a stop."""
        return {'result': 'uncertain_paper_cannot_clear_stop', 'stop_remains': self.state['stopped']}

    def _environment(self, payload: dict) -> dict:
        """Apply an external fault or restoration without giving the actor future information."""
        self.state['flags'].update(payload)
        return {'result': 'environment_changed', 'changes': payload}

    def _finish(self, payload: dict) -> dict:
        """Close at the frozen time limit without erasing earlier errors or inventing assessment."""
        if self.state['withheld']:
            terminal = 'withheld'
        elif self.state['stopped']:
            terminal = 'stopped_with_ack' if self.state['ack_at'] is not None else 'stopped_without_ack'
        else:
            terminal = 'completed_current_record_path'
        self.state['phase'] = terminal
        return {'result': terminal, 'independent_diagnosis_assessed': False, 'delayed_transfer_assessed': False}

    def _execute(self, kind: str, payload: dict) -> dict:
        """Dispatch events with no branch on difficulty labels or preset outcome fields."""
        if self.state['withheld'] and kind not in ['environment', 'finish']:
            return {'result': 'suppressed_after_withheld_start'}
        if kind in ['inspect', 'accept', 'handoff', 'paper_check'] and not self.state['practice_started']:
            return {'result': 'suppressed_before_practice'}
        handler = getattr(self, '_' + kind)
        return handler(payload)

    def run(self) -> dict:
        """Execute every scheduled transition and return raw software observations, not prose scores."""
        while self.queue:
            self.clock, _, kind, payload = heapq.heappop(self.queue)
            before = copy.deepcopy(self.state)
            observation = self._execute(kind, payload)
            event = {'seq': len(self.trace) + 1, 'at_seconds': self.clock, 'event': kind,
                     'input': payload, 'observation': observation, 'before': before,
                     'after': copy.deepcopy(self.state), 'previous_sha256': self.previous}
            encoded = json.dumps(event, sort_keys=True, separators=(',', ':')).encode()
            event['sha256'] = hashlib.sha256(encoded).hexdigest()
            self.previous = event['sha256']
            self.trace.append(event)
        return {'scenario_id': self.scenario['id'], 'difficulty': self.scenario['difficulty'],
                'kind': self.scenario['kind'], 'behavior_profile': self.scenario['behavior_profile'],
                'freeze_sha256': self.program.sha256, 'input': copy.deepcopy(self.scenario),
                'final_state': copy.deepcopy(self.state), 'trace': self.trace,
                'trace_tail_sha256': self.previous, 'evidence_kind': 'executed_software_simulation'}
