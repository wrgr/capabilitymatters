"""Render publication figures from source-checked dialogue and frozen intervention evidence."""
from __future__ import annotations

import argparse
import hashlib
import json
import textwrap
from html import escape
from pathlib import Path

from controlroom_results import outcomes

INK = '#172B3A'
MUTED = '#51616D'
LINE = '#C9D1D8'
ACCENT = '#1C5370'
PALE = '#EDF4F7'
GRAY = '#F5F7F8'


def verify_sources(root: Path, data: dict) -> None:
    """Reject changed source bytes or dialogue excerpts absent from the actual utterances."""
    for name, expected in data['source_hashes'].items():
        if hashlib.sha256((root / name).read_bytes()).hexdigest() != expected:
            raise ValueError(f'Source hash mismatch: {name}')
    case = root / 'experiments/competency-live/2026-11-04/controlroom'
    for row in data['dialogue_rows']:
        speeches = [json.loads((case / 'responses' / f'{s}.json').read_text())['speech']
                    for s in row['sources']]
        for quote in row['quotes']:
            if not any(quote in speech for speech in speeches):
                raise ValueError(f'Unsupported quotation: {quote}')
    frozen = (case / 'frozen-intervention.json').read_bytes()
    if hashlib.sha256(frozen).hexdigest() != data['freeze_sha256']:
        raise ValueError('Figure freeze differs from actual artifact')
    release = json.loads((case / 'deployment-release.json').read_text())
    for event, source in zip(data['events'], release['events'], strict=True):
        if (event['difficulty'], event['source_event']) != (source['difficulty'], source['event']):
            raise ValueError('Figure event differs from released condition')
    for row in data.get('setup_rows', []):
        for selection in row['packets']:
            packet = json.loads((root / selection['path']).read_text())
            if (selection['identity'], selection['private_evidence']) != (packet['identity'], packet['private_evidence']):
                raise ValueError('Setup evidence differs from actual role packet')
            if (row['budget'], row['core_ids']) != (packet['public']['budget'], packet['public']['core']):
                raise ValueError('Setup constraints differ from actual scenario')
            if row['consultant_id'] not in packet['public']['roster']:
                raise ValueError('Setup consultant absent from actual roster')
    if 'execution' in data:
        execution = data['execution']
        summary_path = root / execution['summary_path']
        summary = json.loads(summary_path.read_text())
        for key in ['primary_episodes', 'diagnostic_probes']:
            if execution[key] != summary[key]:
                raise ValueError('Figure differs from actual executable outcomes')
            for row in execution[key]:
                episode = json.loads((summary_path.parent / f'{row["scenario_id"]}.json').read_text())
                if outcomes(episode) != row['outcomes']:
                    raise ValueError('Figure outcome differs from recorded transitions')


def start(title: str, height: int, description: str) -> list[str]:
    """Begin a self-contained accessible SVG with a white print background."""
    return [f'<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="{height}" '
            f'viewBox="0 0 1200 {height}" role="img" aria-labelledby="title desc">',
            f'<title id="title">{escape(title)}</title><desc id="desc">{escape(description)}</desc>',
            '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" '
            'orient="auto"><path d="M0,0 L8,4 L0,8" fill="#51616D"/></marker></defs>',
            '<style>text{font-family:Arial,Helvetica,sans-serif}</style>',
            f'<rect width="1200" height="{height}" fill="white"/>']


def rect(parts: list[str], x: int, y: int, width: int, height: int, fill: str = 'white') -> None:
    """Add a structural rectangle without decorative effects."""
    parts.append(f'<rect x="{x}" y="{y}" width="{width}" height="{height}" '
                 f'fill="{fill}" stroke="{LINE}"/>')


def text(parts: list[str], x: int, y: int, value: str, size: int = 20,
         color: str = INK, weight: int = 400) -> None:
    """Add one escaped, selectable text line using baseline coordinates."""
    parts.append(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" '
                 f'font-weight="{weight}">{escape(value)}</text>')


def paragraph(parts: list[str], x: int, y: int, width: int, value: str,
              size: int = 20, color: str = INK, weight: int = 400) -> int:
    """Wrap a paragraph conservatively and return the next available baseline."""
    chars = max(10, int(width / (size * .53)))
    for line in textwrap.wrap(value, chars, break_long_words=False, break_on_hyphens=False):
        text(parts, x, y, line, size, color, weight)
        y += size + 6
    return y


def arrow(parts: list[str], x: int, y1: int, y2: int) -> None:
    """Connect consecutive stages in an implementation lane."""
    parts.append(f'<path d="M{x},{y1} V{y2}" fill="none" stroke="{MUTED}" '
                 'stroke-width="2" marker-end="url(#arrow)"/>')


def box(parts: list[str], x: int, y: int, title: str, body: str,
        width: int = 548, height: int = 120, fill: str = 'white') -> None:
    """Render one architecture stage with a bounded body area."""
    rect(parts, x, y, width, height, fill)
    text(parts, x + 18, y + 31, title, 23, INK, 600)
    end = paragraph(parts, x + 18, y + 61, width - 36, body, 20, MUTED)
    if end - 21 > y + height - 10:
        raise ValueError(f'Architecture text overflow: {title}')


def architecture() -> str:
    """Show the implemented deterministic and dynamic paths without conflating their outcomes."""
    p = start('Figure 1. Competency-mediation simulator architecture', 1138,
              'Two distinct implementations connect scenario inputs, design choices, a frozen artifact, '
              'stress events and evaluation. Executable deployment observes software states, not human outcomes.')
    text(p, 32, 40, 'Figure 1. From bounded expertise to testable design commitments', 28, INK, 600)
    text(p, 32, 72, 'Two evidence paths; executable deployment adds observed software consequences.', 20, MUTED)
    box(p, 32, 94, 'Authored scenario contract',
        'Roles, competency scopes, public evidence, authority and resources; private packets in dynamic mode.', 780, 116, GRAY)
    box(p, 840, 94, 'Stress events', 'Released after design freeze.', 328, 116, GRAY)
    rect(p, 32, 236, 548, 44, GRAY)
    rect(p, 620, 236, 548, 44, PALE)
    p.append(f'<path d="M422,210 V222 H306 V232 M422,222 H894 V232" '
             f'fill="none" stroke="{MUTED}" stroke-width="2" marker-end="url(#arrow)"/>')
    p.append(f'<path d="M1004,210 H1184 V766 H1172" fill="none" stroke="{MUTED}" '
             'stroke-width="2" stroke-dasharray="6 5" marker-end="url(#arrow)"/>')
    text(p, 50, 265, 'DETERMINISTIC DEMONSTRATION', 20, MUTED, 600)
    text(p, 638, 265, 'DYNAMIC DESIGN + EXECUTABLE TEST', 20, ACCENT, 600)
    box(p, 32, 300, 'Authored policy producer',
        'Seeded consultation and action rules; fixed costs and priorities. No live model dialogue.')
    box(p, 620, 300, 'Independent professional contexts',
        'Own private packets; actual public replies. Optional expert participates after a request.')
    box(p, 32, 458, 'Resource-constrained selection',
        'Programmed proposals and ranking select an action set within the authored budget.')
    box(p, 620, 458, '1. Bounded design mediation',
        'Claims, source IDs, authority, budget and exact core endorsements. Gate supplies no solution.')
    box(p, 32, 616, 'Frozen policy artifact',
        'Retain selected actions, owners, costs and a fixture hash.', height=106)
    box(p, 620, 616, 'Frozen team-authored intervention',
        'Retain actions, exclusions and release gates; exact bytes bound by SHA-256.', height=106)
    for x in [306, 894]:
        arrow(p, x, 420, 448)
        arrow(p, x, 578, 606)
        arrow(p, x, 722, 738)
        arrow(p, x, 788, 804)
    rect(p, 32, 744, 1136, 44, GRAY)
    text(p, 50, 773, 'RELEASE EVENTS AFTER FREEZE: apply easy / medium / hard separately; no redesign.', 20, INK, 600)
    box(p, 32, 814, 'Authored surrogate calculations',
        'Fixed action effects, shocks, mitigations and seed produce synthetic indices.')
    box(p, 620, 814, '2. Executable deployment tests',
        'Hash-bound rules drive timed states, channels and logs; traces yield actual software outcomes.')
    box(p, 32, 970, 'Replay and invariant checks',
        'Reproduce outputs; check costs, permissions, frozen hashes and matched event keys.', height=116)
    box(p, 620, 970, 'Separate design and execution audits',
        'Process review, source fidelity, replay and sensitivity checks; retained failures.', height=116)
    for x in [306, 894]:
        arrow(p, x, 934, 960)
    text(p, 32, 1120, 'Audit record: inputs, actual outputs, decisions and failures. Shared filesystem is not hard isolation.', 18, MUTED)
    return '\n'.join(p + ['</svg>'])


def dialogue_table(data: dict) -> str:
    """Render exact message excerpts beside the commitments they informed."""
    p = start('Table 2. Actual control-room dialogue and consequential decisions', 1142,
              'Selected verbatim excerpts from a seven-message conversation. Decision summaries are analysis; '
              'the learning scientist refines existing caution rather than originating it.')
    text(p, 32, 40, 'Table 2. Where the competencies entered the decision', 28, INK, 600)
    text(p, 32, 72, 'Control-room example: verbatim excerpts, with analytic decision summaries.', 20, MUTED)
    rect(p, 32, 94, 1136, 46, PALE)
    for x, label in [(48, 'Contribution'), (266, 'Actual dialogue excerpt'), (766, 'Decision / retained limit')]:
        text(p, x, 124, label, 21, INK, 600)
    for i, row in enumerate(data['dialogue_rows']):
        y = 140 + i * 180
        rect(p, 32, y, 1136, 180, 'white' if i % 2 == 0 else GRAY)
        end = paragraph(p, 48, y + 31, 188, row['competency'], 20, INK, 600)
        text(p, 48, end + 12, row['trace'], 19, ACCENT, 600)
        baseline = y + 30
        for quote in row['quotes']:
            baseline = paragraph(p, 266, baseline, 466, '\u201c' + quote + '\u201d', 21)
            baseline += 8
        decision_end = paragraph(p, 766, y + 30, 378, row['decision'], 20)
        if max(baseline - 8, decision_end) > y + 176:
            raise ValueError(f'Dialogue row overflow: {row["trace"]}')
    text(p, 32, 1072, 'O = operator; S = safety/systems engineer; L = learning scientist. Numbers identify actual turns.', 18, MUTED)
    text(p, 32, 1101, 'Full message IDs: controlroom-operator-01, controlroom-safety-01, controlroom-scientist-01,', 17, MUTED)
    text(p, 32, 1126, 'controlroom-operator-02, controlroom-safety-02, controlroom-safety-03. No dialogue was reconstructed.', 17, MUTED)
    return '\n'.join(p + ['</svg>'])


def setup_table(data: dict) -> str:
    """Make authored teams, private information, boundaries and resources explicit across cases."""
    p = start('Table 1. Setup of the three dynamic design scenarios', 1120,
              'Authored professional roles and evidence are separate from observed outcomes. '
              'Two core model contexts can request one consultant; authority and resources are bounded.')
    text(p, 32, 40, 'Table 1. Three settings with bounded expertise and consequential constraints', 27, INK, 600)
    text(p, 32, 72, 'Each case: two independent core contexts; one optional consultant (1 unit); one fresh process reviewer.', 20, MUTED)
    rect(p, 32, 94, 1136, 46, PALE)
    for x, label in [(48, 'Setting / competencies'), (428, 'Selected private facts'), (828, 'Authority / resources')]:
        text(p, x, 124, label, 20, INK, 600)
    for i, row in enumerate(data['setup_rows']):
        y = 140 + i * 300
        rect(p, 32, y, 1136, 300, 'white' if i % 2 == 0 else GRAY)
        text(p, 48, y + 32, row['label'], 22, ACCENT, 600)
        a = paragraph(p, 48, y + 66, 346, row['team'], 20)
        b = paragraph(p, 428, y + 32, 366, row['private_summary'], 20)
        b = paragraph(p, 428, b + 16, 366, row['refs'], 18, MUTED)
        c = paragraph(p, 828, y + 32, 310, row['boundary'], 20)
        c = paragraph(p, 828, c + 12, 310, row['resources'], 20)
        if max(a, b, c) > y + 292:
            raise ValueError(f'Setup row overflow: {row["case"]}')
    text(p, 32, 1072, 'Source: retained scenario and private role packets; text summarizes authored facts and scopes.', 18, MUTED)
    text(p, 32, 1100, 'Private evidence must be disclosed before others use it. Knowledge controls are instruction-bounded, not erasure.', 18, MUTED)
    return '\n'.join(p + ['</svg>'])


def value_table() -> str:
    """Connect the instrument's concrete outputs to proposed LERN uses without claiming benefits."""
    p = start('Table 3. Instrument outputs and their proposed value for LERN', 860,
              'A map of inspectable evidence, conditional requirements and proposed teaching, research and rehearsal uses. '
              'Educational effects and team superiority have not been measured.')
    text(p, 32, 40, 'Table 3. What becomes inspectable, and what LERN can do with it', 28, INK, 600)
    text(p, 32, 72, 'Uses are proposed applications; evidence consists of actual model dialogue and executed software states.', 20, MUTED)
    rect(p, 32, 94, 1136, 46, PALE)
    for x, label in [(48, 'Instrument output'), (346, 'Concrete evidence in this example'), (760, 'Proposed use / needed judgment')]:
        text(p, x, 124, label, 20, INK, 600)
    rows = [
        ('1. Expertise into decisions',
         'The operator withdraws separate unranked practice after the systems disclosure; the seven-unit compromise retains its learning-evidence limits.',
         'Teaching: explain how evidence and competing constraints changed the plan. Research: code coverage, utilization and integration.'),
        ('2. Frozen-design deployment trace',
         'Medium accepts stale data before a later stop. Hard refuses start. Radio loss after a stop prevents acknowledged handoff.',
         'Rehearsal: identify unmet demands and dependencies. Distinguish a correct stop, a working handoff and evidence of learning.'),
        ('Linked competency and coordination requirements',
         'The check must precede acceptance; a reference must be verified; a recipient must be reachable. Diagnosis and delayed transfer remain unassessed.',
         'Design review: ask who can supply each function, what authority/resources are required, and what an individual or team must integrate.')]
    for i, row in enumerate(rows):
        y = 140 + i * 216
        rect(p, 32, y, 1136, 216, 'white' if i % 2 == 0 else GRAY)
        ends = [paragraph(p, x, y + 34, width, value, 21 if col == 0 else 20,
                          ACCENT if col == 0 else INK, 600 if col == 0 else 400)
                for col, (x, width, value) in enumerate(zip([48, 346, 760], [264, 380, 378], row, strict=True))]
        if max(ends) > y + 206:
            raise ValueError(f'Value table overflow: {row[0]}')
    text(p, 32, 824, 'Needed functions may be held by an authorized individual or distributed across a team; no team advantage is estimated.', 18, MUTED)
    text(p, 32, 851, 'Scope: conditional modeled requirements. Human learning gains and operational readiness need separate validation.', 18, MUTED)
    return '\n'.join(p + ['</svg>'])


def execution_text(row: dict) -> str:
    """Derive the displayed result directly from the retained executable metrics."""
    result = row['outcomes']
    if not result['practice_started']:
        return 'Scope gate withheld start at 0 s. No practice, acceptance or handoff was exercised.'
    accepted = result['first_stale_acceptance_at_seconds']
    first = f'Stale item accepted at {accepted} s. ' if accepted is not None else 'No stale acceptance. '
    logs = ('Required local records complete.' if result['missing_required_local_records'] == []
            else 'Required local records incomplete.')
    return (first + f'Stop at {result["first_stop_at_seconds"]} s; acknowledgement at '
            f'{result["acknowledgement_at_seconds"]} s. Stale items: {result["stale_items_accepted"]}; '
            f'procedure violations: {result["protocol_violations"]}. ' + logs)


def stress_figure(data: dict) -> str:
    """Connect the unchanged frozen design to three executed state-transition outcomes."""
    p = start('Figure 2. The same frozen intervention under three stress conditions', 1000,
              'Actual software simulation observations under authored, uncalibrated actor/environment assumptions. '
              'Easy completes the procedure, medium accepts stale data, hard is withheld. No human learning is measured.')
    text(p, 32, 40, 'Figure 2. Executed consequences of the frozen control-room intervention', 28, INK, 600)
    text(p, 32, 72, 'Observed software states; virtual seconds from session start. Authored behavior is not human calibration.', 20, MUTED)
    rect(p, 32, 94, 1136, 100, PALE)
    text(p, 50, 126, 'ONE FROZEN PLAN: 7 / 8 units committed; 20-minute limit; both core endorsements.', 22, INK, 600)
    text(p, 50, 155, 'Aid 1 + stop/handoff 2 + staleness rehearsal 3 + consultation 1. Unranked practice omitted.', 20)
    text(p, 50, 182, 'SHA-256: ' + data['freeze_sha256'][:16] + '\u2026  |  start requires a checked reference and job aid.', 18, MUTED)
    rect(p, 32, 216, 1136, 46, GRAY)
    for x, label in [(48, 'Event'), (326, 'Observed execution'), (720, 'Success / failure and competency implication')]:
        text(p, x, 246, label, 20, INK, 600)
    for i, event in enumerate(data['events']):
        y = 262 + i * 216
        rect(p, 32, y, 1136, 216, 'white' if i % 2 == 0 else GRAY)
        text(p, 48, y + 32, event['difficulty'].upper(), 21, ACCENT, 600)
        a = paragraph(p, 48, y + 64, 246, event['event'], 20)
        row = data['execution']['primary_episodes'][i]
        b = paragraph(p, 326, y + 32, 358, execution_text(row), 21)
        c = paragraph(p, 720, y + 32, 420, data['execution_annotations'][event['difficulty']], 20)
        if max(a, b, c) > y + 208:
            raise ValueError(f'Stress row overflow: {event["difficulty"]}')
    text(p, 32, 940, 'Sensitivity: the same medium event with cue-first behavior accepts 0 stale items; this is not a training effect.', 18, MUTED)
    text(p, 32, 966, 'After-start radio-loss probe: handoff packet dropped; no acknowledgement. Primary hard remains a no-start test.', 18, MUTED)
    text(p, 32, 991, 'Source: three primary episodes + five diagnostic probes, exact traces and unchanged frozen hash. Diagnosis unassessed.', 17, MUTED)
    return '\n'.join(p + ['</svg>'])


def main() -> None:
    """Write five editable publication assets after checking retained source evidence."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    args = parser.parse_args()
    folder = args.root / 'docs/lifecycle/figures'
    data = json.loads((folder / 'competency-figure-sources.json').read_text())
    verify_sources(args.root, data)
    for name, content in [('competency-architecture.svg', architecture()),
                          ('competency-scenario-setup.svg', setup_table(data)),
                          ('controlroom-dialogue-table.svg', dialogue_table(data)),
                          ('controlroom-stress-test.svg', stress_figure(data)),
                          ('competency-value-add.svg', value_table())]:
        (folder / name).write_text(content + '\n')


if __name__ == '__main__':
    main()
