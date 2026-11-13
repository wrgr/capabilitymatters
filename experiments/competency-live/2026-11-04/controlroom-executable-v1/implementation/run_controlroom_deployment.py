"""Run and retain reproducible executable deployment episodes for the unchanged frozen intervention."""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from controlroom_contract import compile_program, read_json
from controlroom_results import dependency_findings, outcomes
from controlroom_simulator import DeploymentSimulator


def sha(path: Path) -> str:
    """Hash exact implementation or evidence bytes for a retained execution receipt."""
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_new(path: Path, data: dict) -> None:
    """Retain each result once without overwriting a prior execution or failure."""
    with path.open('x') as handle:
        json.dump(data, handle, indent=2, ensure_ascii=False)
        handle.write('\n')


def execute(root: Path, model_path: Path, folder: Path) -> dict:
    """Run every declared episode after pinning code and inputs, then report derived observations."""
    folder.mkdir(parents=True, exist_ok=False)
    model = read_json(model_path)
    program = compile_program(root, model)
    implementation = [Path(__file__).parent / name for name in [
        'controlroom_contract.py', 'controlroom_simulator.py', 'controlroom_results.py',
        'run_controlroom_deployment.py']]
    receipt = {'description': 'Implementation/input receipt written before the first deployment episode.',
               'started_at': datetime.now(timezone.utc).isoformat(), 'freeze_sha256': program.sha256,
               'model_sha256': sha(model_path), 'implementation_sha256': {p.name: sha(p) for p in implementation},
               'model_is_retrospective': True, 'new_design_agent_calls': 0,
               'evidence_kind': 'executed_software_simulation',
               'limitation': model['interpretation']}
    write_new(folder / 'execution-receipt.json', receipt)
    episodes = []
    try:
        for scenario in model['scenarios']:
            episode = DeploymentSimulator(program, model, scenario).run()
            episode['outcomes'] = outcomes(episode)
            write_new(folder / f'{scenario["id"]}.json', episode)
            episodes.append(episode)
        summary = summarize(program.sha256, model, episodes)
        write_new(folder / 'summary.json', summary)
        write_new(folder / 'competency-dependencies.json', {
            'description': 'Trace-supported functional competency and coordination requirements, not team-versus-individual effects.',
            'findings': dependency_findings(episodes),
            'team_vs_individual': 'These functions could be distributed across a team or held by an appropriately competent and authorized individual. No matched individual design or team-size effect was tested.'})
        if sha(root / model['frozen_path']) != program.sha256:
            raise ValueError('Frozen input changed during executable deployment')
        return summary
    except Exception as error:
        write_new(folder / 'execution-failure.json', {'description': 'Actual failed executable deployment retained without repair.',
                  'error_type': type(error).__name__, 'error': str(error), 'completed_episodes': len(episodes)})
        raise


def summarize(freeze: str, model: dict, episodes: list[dict]) -> dict:
    """Separate primary results, diagnostic probes and authored assumptions in one compact index."""
    rows = [{'scenario_id': e['scenario_id'], 'difficulty': e['difficulty'], 'kind': e['kind'],
             'behavior_profile': e['behavior_profile'], 'trace_tail_sha256': e['trace_tail_sha256'],
             'outcomes': e['outcomes']} for e in episodes]
    return {'description': 'Observed software-state outcomes of one unchanged frozen intervention, not written deployment projections or human observations.',
            'model_id': model['model_id'], 'freeze_sha256': freeze,
            'evidence_kind': 'executed_software_simulation', 'primary_episodes': [r for r in rows if r['kind'] == 'primary'],
            'diagnostic_probes': [r for r in rows if r['kind'] != 'primary'],
            'assumptions': model['assumptions'], 'objectives': model['objectives'],
            'interpretation': model['interpretation'], 'replay': 'Fixed model and implementation reproduce episode traces and outcomes; wall-clock receipt timestamps differ.'}


def main() -> None:
    """Expose an API-key-free simulator CLI with explicit model and new output paths."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--model', type=Path, default=Path('src/data/lifecycle/controlroom-deployment-v1.json'))
    parser.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    result = execute(args.root, args.model, args.out)
    print(json.dumps({'primary_episodes': result['primary_episodes'],
                      'diagnostic_probe_count': len(result['diagnostic_probes'])}, indent=2))


if __name__ == '__main__':
    main()
