"""Exercise stateful deployment failures, scope gates, provenance and assumption sensitivity."""
import copy
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools/lifecycle'))
from controlroom_contract import compile_program, handoff_complete, read_json
from controlroom_results import outcomes, verify_trace
from controlroom_simulator import DeploymentSimulator, freshness_status


class DeploymentTest(unittest.TestCase):
    """Test transitions and counterexamples rather than authored narrative labels."""

    def setUp(self) -> None:
        """Load the unmodified frozen plan and explicit synthetic environment contract."""
        self.model = read_json(ROOT / 'src/data/lifecycle/controlroom-deployment-v2.json')
        self.program = compile_program(ROOT, self.model)

    def run_case(self, sid: str, change: dict | None = None) -> dict:
        """Execute an independent episode, optionally perturbing a declared condition."""
        scenario = copy.deepcopy(next(s for s in self.model['scenarios'] if s['id'] == sid))
        if change:
            scenario.update(change)
        result = DeploymentSimulator(self.program, self.model, scenario).run()
        result['outcomes'] = outcomes(result)
        return result

    def test_easy_stops_before_acceptance_and_receives_ack(self) -> None:
        """Observe completed containment/handoff while keeping diagnosis unassessed."""
        o = self.run_case('easy')['outcomes']
        self.assertTrue(o['practice_started'])
        self.assertEqual((o['stale_items_accepted'], o['first_stop_at_seconds'],
                          o['acknowledgement_at_seconds']), (0, 184, 785))
        self.assertTrue(o['deployment_demand_fulfilled'])
        self.assertFalse(o['independent_diagnosis_assessed'])

    def test_medium_records_error_before_later_containment(self) -> None:
        """A late check cannot erase an actual stale-data acceptance."""
        o = self.run_case('medium')['outcomes']
        self.assertEqual((o['stale_items_accepted'], o['first_stale_acceptance_at_seconds'],
                          o['first_stop_at_seconds']), (1, 186, 192))
        self.assertTrue(o['handoff_acknowledged'])
        self.assertFalse(o['containment_obligation_met'])
        self.assertFalse(o['deployment_demand_fulfilled'])

    def test_behavior_sensitivity_is_not_a_training_effect(self) -> None:
        """The same medium environment succeeds under the explicit alternative actor policy."""
        self.assertEqual(self.run_case('medium_cue_first')['outcomes']['stale_items_accepted'], 0)
        self.assertTrue(self.run_case('medium_cue_first')['outcomes']['deployment_demand_fulfilled'])

    def test_hard_refuses_start_without_claiming_demand_fulfilled(self) -> None:
        """The actual scope gate prevents start but does not confer combined-failure capability."""
        o = self.run_case('hard')['outcomes']
        self.assertTrue(o['start_withheld'])
        self.assertFalse(o['practice_started'])
        self.assertFalse(o['deployment_demand_fulfilled'])
        self.assertTrue(o['release_boundary_obeyed'])

    def test_hard_after_start_drops_handoff_and_never_invents_retry(self) -> None:
        """A real channel fault prevents acknowledgement even though the recipient is named."""
        run = self.run_case('hard_after_start')
        self.assertTrue(run['outcomes']['practice_started'])
        self.assertTrue(run['outcomes']['stop_latched'])
        self.assertFalse(run['outcomes']['handoff_acknowledged'])
        self.assertFalse(run['outcomes']['deployment_demand_fulfilled'])
        self.assertEqual(sum(e['event'] == 'handoff' for e in run['trace']), 1)
        self.assertTrue(run['final_state']['flags']['radio_available'])

    def test_recipient_and_channel_are_both_needed(self) -> None:
        """Handoff completion changes when physical availability changes, not when a label does."""
        self.assertFalse(self.run_case('recipient_unavailable')['outcomes']['handoff_acknowledged'])
        scenario = copy.deepcopy(next(s for s in self.model['scenarios'] if s['id'] == 'hard_after_start'))
        scenario['environment_changes'][0]['set']['radio_available'] = True
        run = self.run_case('hard_after_start', scenario)
        self.assertTrue(run['outcomes']['handoff_acknowledged'])
        self.assertFalse(run['outcomes']['deployment_demand_fulfilled'])

    def test_missing_or_corrupt_reference_blocks_start(self) -> None:
        """Execute actual failed preflight checks rather than assume a reference exists."""
        self.assertTrue(self.run_case('missing_reference')['outcomes']['start_withheld'])
        initial = copy.deepcopy(self.model['scenarios'][0]['initial'])
        initial['reference_correct'] = False
        self.assertFalse(self.run_case('easy', {'initial': initial})['outcomes']['practice_started'])

    def test_failed_aid_check_blocks_start(self) -> None:
        """An unrealized job-aid implementation is not counted as a passed gate."""
        initial = copy.deepcopy(self.model['scenarios'][0]['initial'])
        initial['aid_intact'] = False
        self.assertTrue(self.run_case('easy', {'initial': initial})['outcomes']['start_withheld'])

    def test_current_values_are_not_automatically_stopped(self) -> None:
        """A current-record control prevents rewarding a controller that always refuses."""
        o = self.run_case('fresh_sensor_control')['outcomes']
        self.assertFalse(o['stop_latched'])
        self.assertFalse(o['handoff_attempted'])
        self.assertTrue(o['deployment_demand_fulfilled'])

    def test_difficulty_is_not_an_outcome_switch(self) -> None:
        """Renaming the difficulty cannot change the executed operational result."""
        self.assertEqual(self.run_case('medium')['outcomes'],
                         self.run_case('medium', {'difficulty': 'easy'})['outcomes'])

    def test_replay_and_episode_isolation(self) -> None:
        """The same event inputs reproduce complete traces after other episodes execute."""
        first = self.run_case('easy')
        self.run_case('medium')
        self.assertEqual(first, self.run_case('easy'))
        self.assertLessEqual(max(e['at_seconds'] for e in first['trace']), 1200)

    def test_trace_tampering_is_rejected(self) -> None:
        """The metrics observer rejects a forged successful state."""
        run = self.run_case('medium')
        run['trace'][0]['after']['ack_at'] = 1
        with self.assertRaisesRegex(ValueError, 'hash chain'):
            verify_trace(run)

    def test_frozen_identity_mapping_and_scope_cannot_change(self) -> None:
        """Reject a repaired plan, unsupported rule or expanded release boundary."""
        for field, value in [('frozen_sha256', '0' * 64),
                             ('allowed_initial_features', ['sensor_staleness', 'radio_dropout'])]:
            changed = copy.deepcopy(self.model)
            changed[field] = value
            with self.assertRaises(ValueError):
                compile_program(ROOT, changed)
        changed = copy.deepcopy(self.model)
        changed['action_mapping']['stop-and-handoff']['source_clause'] += ' Retry by phone.'
        with self.assertRaisesRegex(ValueError, 'Clause changed'):
            compile_program(ROOT, changed)

    def test_missing_actual_authority_is_rejected(self) -> None:
        """A declared participant name is not a substitute for actual exact-byte endorsement."""
        def withheld(path: Path) -> dict:
            """Return a fresh negative endorsement without touching the retained file."""
            value = read_json(path)
            if path.name == 'safety-03.json':
                value['endorsed'] = False
            return value
        with patch('controlroom_contract.read_json', side_effect=withheld):
            with self.assertRaisesRegex(ValueError, 'endorsement missing'):
                compile_program(ROOT, self.model)

    def test_comparison_uses_actual_fields_and_no_age_threshold(self) -> None:
        """Exercise all four frozen discrepancy triggers independently."""
        ref = self.model['script_truth']
        self.assertEqual(freshness_status(ref, ref), 'current')
        self.assertEqual(freshness_status(ref, None), 'missing_reference')
        for field, value, expected in [('timestamp', 99, 'contradiction'),
                                       ('state_id', 6, 'older_state'),
                                       ('value', 5, 'indeterminate_match')]:
            display = dict(ref, **{field: value})
            self.assertEqual(freshness_status(display, ref), expected)

    def test_handoff_contains_value_and_meaningful_fields(self) -> None:
        """Reject a key-complete empty packet and retain the actual last-known value."""
        run = self.run_case('easy')
        packet = run['final_state']['handoff_payload']
        self.assertEqual(packet['last_known_values'], {'value': 9, 'freshness': 'uncertain'})
        self.assertTrue(handoff_complete(packet, self.program.handoff_fields))
        malformed = {name: None for name in self.program.handoff_fields}
        self.assertFalse(handoff_complete(malformed, self.program.handoff_fields))
        packet['stopped_status'] = False
        self.assertFalse(handoff_complete(packet, self.program.handoff_fields))

    def test_initial_fault_cannot_hide_behind_scope_declaration(self) -> None:
        """Observe actual known faults as well as declared features at the release gate."""
        initial = copy.deepcopy(self.model['scenarios'][0]['initial'])
        initial['cascading_alerts'] = True
        o = self.run_case('easy', {'initial': initial})['outcomes']
        self.assertFalse(o['practice_started'])
        self.assertTrue(o['release_boundary_obeyed'])

    def test_emerging_staleness_changes_actual_display(self) -> None:
        """A real post-start sensor transition produces a discrepancy and stop."""
        change = [{'at': 182, 'set': {'sensor_stale': True}}]
        run = self.run_case('fresh_sensor_control', {'environment_changes': change})
        self.assertEqual(run['final_state']['display'], self.model['stale_display'])
        self.assertEqual(run['outcomes']['first_stop_at_seconds'], 184)

    def test_unchecked_current_acceptance_is_not_procedure_success(self) -> None:
        """Data correctness alone does not erase failure to perform the required check."""
        o = self.run_case('fresh_sensor_control', {'behavior_profile': 'ranking_first'})['outcomes']
        self.assertEqual(o['stale_items_accepted'], 0)
        self.assertEqual(o['protocol_violations'], 1)
        self.assertFalse(o['deployment_demand_fulfilled'])

    def test_local_logging_is_realized_separately_from_external_trace(self) -> None:
        """Success needs participant-owned records and an executed recording segment."""
        run = self.run_case('easy')
        kinds = {x['kind'] for x in run['final_state']['local_log']}
        self.assertTrue({'script_reference', 'freshness_comparison', 'handoff_receipt',
                         'final_observations'} <= kinds)
        self.assertTrue(run['outcomes']['local_recording_completed'])
        self.assertTrue(any(e['event'] == 'recording_start' and e['at_seconds'] == 1080
                            for e in run['trace']))
        changes = [{'at': 190, 'set': {'local_log_available': False}}]
        failure = self.run_case('easy', {'environment_changes': changes})['outcomes']
        self.assertTrue(failure['handoff_acknowledged'])
        self.assertFalse(failure['local_recording_completed'])
        self.assertFalse(failure['deployment_demand_fulfilled'])

    def test_aid_check_inspects_realized_content_and_actor_identification(self) -> None:
        """A named aid is insufficient when a required element is missing or cannot be located."""
        scenario = copy.deepcopy(self.model['scenarios'][0])
        sim = DeploymentSimulator(self.program, self.model, scenario)
        sim.state['aid']['recipient'] = ''
        self.assertFalse(outcomes(sim.run())['practice_started'])
        initial = copy.deepcopy(scenario['initial'])
        initial['operator_can_locate_aid_elements'] = False
        self.assertFalse(self.run_case('easy', {'initial': initial})['outcomes']['practice_started'])

    def test_scope_is_checked_again_when_practice_starts(self) -> None:
        """A fault arriving after initial admission but before practice prevents start."""
        changes = [{'at': 170, 'set': {'cascading_alerts': True}}]
        run = self.run_case('easy', {'environment_changes': changes})
        self.assertFalse(run['outcomes']['practice_started'])
        self.assertTrue(run['outcomes']['release_boundary_obeyed'])
        start = next(e for e in run['trace'] if e['event'] == 'practice_start')
        self.assertIn('cascading_alerts', start['observation']['excluded_features_at_start'])

    def test_brief_logger_loss_cannot_erase_missing_intermediate_records(self) -> None:
        """A final report and acknowledged handoff do not replace missing comparison/stop logs."""
        changes = [{'at': 183, 'set': {'local_log_available': False}},
                   {'at': 185, 'set': {'local_log_available': True}}]
        run = self.run_case('easy', {'environment_changes': changes})
        self.assertTrue(run['outcomes']['handoff_acknowledged'])
        self.assertTrue(run['outcomes']['local_recording_completed'])
        self.assertFalse(run['outcomes']['deployment_demand_fulfilled'])
        self.assertEqual(run['outcomes']['missing_required_local_records'], ['freshness_comparison', 'stop'])
        final = run['final_state']['local_log'][-1]['data']['unmet_criteria']
        self.assertEqual(final['missing_intermediate_records'], ['freshness_comparison', 'stop'])

    def test_recording_segment_cannot_be_moved_into_another_funded_segment(self) -> None:
        """Keep all four frozen stage boundaries fixed, including the final recording start."""
        changed = copy.deepcopy(self.model)
        changed['time_seconds']['recording_start'] = 1000
        with self.assertRaisesRegex(ValueError, 'allocation changed'):
            compile_program(ROOT, changed)


if __name__ == '__main__':
    unittest.main()
