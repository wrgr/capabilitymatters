"""Revisit Design with a real specialist team and file-writing implementation.

The immutable parent supplies earlier framing/mapping, not new field evidence.
This is a targeted refinement, not a second eight-stage lifecycle claim.
"""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import uuid
from engine import Journal, CodexProvider, RUNS, record_turn, snapshot, verify, validate_seed
from role_profiles import load_contract
from file_build import file_build, accept_file
from product import write_product


def refine_case(seed, parent, domain_profile, export):
    verify(parent)
    provider = CodexProvider()
    run_id = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-live-codex-' + uuid.uuid4().hex[:6]
    journal = Journal(RUNS / run_id, validate_seed(seed), provider.mode,
        parent={'run_id': parent['id'], 'event_hash': parent['events'][-1]['hash']},
        role_profiles=load_contract(domain_profile))
    old = snapshot(parent, len(parent['events']))['artifacts']
    context = journal.append('verification', 'understand', 'orchestrator', {
        'status': 'preserved_parent_context',
        'parent_run_id': parent['id'], 'parent_head_hash': parent['events'][-1]['hash'],
        'prior_artifacts': {key: {'content_hash': val['content_hash'], 'revision': val['revision'], 'body': val['content']['body']} for key, val in old.items() if key in ('understand', 'model', 'design')},
        'message': 'Public parent framing/mapping/design are background for a targeted Design refinement. They are preserved records, not newly generated contributions, reviewed requirements, human approvals or field results. The new seed proposes a stronger user experience; specialist agents must challenge and adapt it. Understand/Map/Instrument/Deploy are not rerun unless a named earlier requirement is invalidated.'})
    print(f'Run retained at {journal.path}', flush=True)
    try:
        journal.append('stage_started', 'design', 'orchestrator', {'status': 'targeted_refinement', 'parent_context_seq': context['seq'], 'human_approval': 'not supplied'})
        for role in ('domain', 'systems', 'design', 'learning', 'responsible'):
            record_turn(journal, provider, role, 'design', context['seq'])
        record_turn(journal, provider, 'orchestrator', 'design', context['seq'])
        challenge = record_turn(journal, provider, 'scenario', 'design')
        review = record_turn(journal, provider, 'orchestrator', 'design', challenge['seq'])
        target = review['payload']['response']['revisit_stage'] or 'design'
        if target not in ('understand', 'model', 'design'):
            raise ValueError('Design scenario cannot revisit a future stage')
        decision = record_turn(journal, provider, 'orchestrator', target, challenge['seq']) if target != 'design' else review
        journal.append('revision_link', target, 'orchestrator', {'scenario_seq': challenge['seq'], 'review_seq': review['seq'], 'decision_seq': decision['seq'], 'return_stage': target, 'resume_stage': 'design'})
        journal.append('stage_completed', 'design', 'orchestrator', {'status': 'rehearsed targeted refinement'})
        journal.append('stage_started', 'build', 'orchestrator', {'status': 'scoped file implementation', 'human_approval': 'not supplied'})
        contribution, source, workspace = file_build(journal, provider)
        run = accept_file(journal, provider, contribution, source)
        write_product(run, journal.path / 'product')
        export.write_text(json.dumps(run, indent=2, ensure_ascii=False))
        print(json.dumps({'run_directory': str(journal.path), 'events': len(journal.events), 'workspace': str(workspace), 'status': 'awaiting scoped browser and measurement review'}), flush=True)
        return run
    except Exception as error:
        if journal.events[-1]['kind'] != 'failure':
            journal.append('failure', journal.events[-1]['stage'], 'orchestrator', {'error_type': type(error).__name__, 'message': str(error)})
        raise


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--seed', type=Path, required=True)
    p.add_argument('--parent', type=Path, required=True)
    p.add_argument('--domain-profile', required=True)
    p.add_argument('--export', type=Path, required=True)
    a = p.parse_args()
    refine_case(json.loads(a.seed.read_text()), json.loads(a.parent.read_text()), a.domain_profile, a.export)
