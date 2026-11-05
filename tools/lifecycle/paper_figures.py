"""Render publication figures from source-checked dialogue and frozen intervention evidence."""
from __future__ import annotations

import argparse
import hashlib
import json
import textwrap
from html import escape
from pathlib import Path

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
              'withheld stress events and evaluation. Neither path observes real human outcomes.')
    text(p, 32, 40, 'Figure 1. From bounded expertise to testable design commitments', 28, INK, 600)
    text(p, 32, 72, 'Two implementations; distinct configurations and evidence classes.', 20, MUTED)
    box(p, 32, 94, 'Authored scenario contract',
        'Roles, competency scopes, public evidence, authority and resources; private packets in dynamic mode.', 780, 116, GRAY)
    box(p, 840, 94, 'Stress events', 'Withheld during dynamic design.', 328, 116, GRAY)
    rect(p, 32, 236, 548, 44, GRAY)
    rect(p, 620, 236, 548, 44, PALE)
    p.append(f'<path d="M422,210 V222 H306 V232 M422,222 H894 V232" '
             f'fill="none" stroke="{MUTED}" stroke-width="2" marker-end="url(#arrow)"/>')
    p.append(f'<path d="M1004,210 H1184 V766 H1172" fill="none" stroke="{MUTED}" '
             'stroke-width="2" stroke-dasharray="6 5" marker-end="url(#arrow)"/>')
    text(p, 50, 265, 'DETERMINISTIC DEMONSTRATION', 20, MUTED, 600)
    text(p, 638, 265, 'DYNAMIC AGENT EXAMPLES', 20, ACCENT, 600)
    box(p, 32, 300, 'Authored policy producer',
        'Seeded consultation and action rules; fixed costs and priorities. No live model dialogue.')
    box(p, 620, 300, 'Independent professional contexts',
        'Own private packets; actual public replies. Optional expert participates after a request.')
    box(p, 32, 458, 'Resource-constrained selection',
        'Programmed proposals and ranking select an action set within the authored budget.')
    box(p, 620, 458, 'Dialogue and declared-permission gate',
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
    box(p, 620, 814, 'Model-reasoned stress projections',
        'Apply the frozen plan: supported actions, conditions, unmet demands and unknown outcomes.')
    box(p, 32, 970, 'Replay and invariant checks',
        'Reproduce outputs; check costs, permissions, frozen hashes and matched event keys.', height=116)
    box(p, 620, 970, 'Fresh independent model review',
        'Process and result separately; semantic expertise audit and retained failure records.', height=116)
    for x in [306, 894]:
        arrow(p, x, 934, 960)
    text(p, 32, 1120, 'Audit record: inputs, actual outputs, decisions and failures. Shared filesystem is not hard isolation.', 18, MUTED)
    return '\n'.join(p + ['</svg>'])


def dialogue_table(data: dict) -> str:
    """Render exact message excerpts beside the commitments they informed."""
    p = start('Table 1. Actual control-room dialogue and consequential decisions', 1142,
              'Selected verbatim excerpts from a seven-message conversation. Decision summaries are analysis; '
              'the learning scientist refines existing caution rather than originating it.')
    text(p, 32, 40, 'Table 1. Where the competencies entered the decision', 28, INK, 600)
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


def stress_figure(data: dict) -> str:
    """Connect one unchanged frozen design to the three actual retained stress projections."""
    p = start('Figure 2. The same frozen intervention under three stress conditions', 1000,
              'Model-reasoned tests, not observed utility or learner outcomes. The hard event exceeds '
              'scope and requires no start; missing start checks remain unknown in easy and medium.')
    text(p, 32, 40, 'Figure 2. What the frozen control-room intervention could support', 28, INK, 600)
    text(p, 32, 72, 'Model-reasoned stress tests; execution, diagnosis and transfer were not observed.', 20, MUTED)
    rect(p, 32, 94, 1136, 100, PALE)
    text(p, 50, 126, 'ONE FROZEN PLAN: 7 / 8 units committed; 20-minute limit; both core endorsements.', 22, INK, 600)
    text(p, 50, 155, 'Aid 1 + stop/handoff 2 + staleness rehearsal 3 + consultation 1. Unranked practice omitted.', 20)
    text(p, 50, 182, 'SHA-256: ' + data['freeze_sha256'][:16] + '\u2026  |  start requires a checked reference and job aid.', 18, MUTED)
    rect(p, 32, 216, 1136, 46, GRAY)
    for x, label in [(48, 'Event'), (326, 'Supported response'), (720, 'Revealed limit / independent review')]:
        text(p, x, 246, label, 20, INK, 600)
    for i, event in enumerate(data['events']):
        y = 262 + i * 216
        rect(p, 32, y, 1136, 216, 'white' if i % 2 == 0 else GRAY)
        text(p, 48, y + 32, event['difficulty'].upper(), 21, ACCENT, 600)
        a = paragraph(p, 48, y + 64, 246, event['event'], 20)
        b = paragraph(p, 326, y + 32, 358, event['supported'], 21)
        c = paragraph(p, 720, y + 32, 420, event['gap'], 20)
        c = paragraph(p, 720, c + 12, 420, event['review'], 19, MUTED)
        if max(a, b, c) > y + 208:
            raise ValueError(f'Stress row overflow: {event["difficulty"]}')
    text(p, 32, 946, 'Source: retained deployment and fresh model review for the exact frozen artifact. No repair between events.', 18, MUTED)
    text(p, 32, 976, 'Ratings concern plan sufficiency; a correct no-start boundary does not establish successful performance.', 18, MUTED)
    return '\n'.join(p + ['</svg>'])


def main() -> None:
    """Write the three editable SVG assets after checking all retained figure evidence."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    args = parser.parse_args()
    folder = args.root / 'docs/lifecycle/figures'
    data = json.loads((folder / 'competency-figure-sources.json').read_text())
    verify_sources(args.root, data)
    for name, content in [('competency-architecture.svg', architecture()),
                          ('controlroom-dialogue-table.svg', dialogue_table(data)),
                          ('controlroom-stress-test.svg', stress_figure(data))]:
        (folder / name).write_text(content + '\n')


if __name__ == '__main__':
    main()
