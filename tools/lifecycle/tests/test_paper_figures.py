"""Protect publication quotations, frozen identity and event provenance against accidental alteration."""
import copy
import json
import sys
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools/lifecycle'))
from paper_figures import architecture, dialogue_table, setup_table, stress_figure, value_table, verify_sources


class PaperFigureTest(unittest.TestCase):
    """Test source fidelity rather than assert that a proposed intervention succeeds."""

    def setUp(self) -> None:
        """Load the figure's actual source and selection manifest."""
        self.data = json.loads((ROOT / 'docs/lifecycle/figures/competency-figure-sources.json').read_text())

    def test_actual_sources_and_svg(self) -> None:
        """Accept retained source bytes and render five accessible, valid publication assets."""
        verify_sources(ROOT, self.data)
        for content in [architecture(), setup_table(self.data), dialogue_table(self.data),
                        stress_figure(self.data), value_table()]:
            element = ET.fromstring(content)
            self.assertEqual(element.attrib['role'], 'img')
            self.assertIsNotNone(element.find('{http://www.w3.org/2000/svg}desc'))

    def test_invented_dialogue_rejected(self) -> None:
        """Reject speech not actually uttered even when the source hashes remain valid."""
        changed = copy.deepcopy(self.data)
        changed['dialogue_rows'][0]['quotes'][0] = 'We proved every novice was ready.'
        with self.assertRaisesRegex(ValueError, 'Unsupported quotation'):
            verify_sources(ROOT, changed)

    def test_forged_scenario_evidence_rejected(self) -> None:
        """Setup summaries retain the actual private packet selection rather than invented facts."""
        changed = copy.deepcopy(self.data)
        changed['setup_rows'][0]['packets'][0]['private_evidence'][0] = 'Everyone is certified.'
        with self.assertRaisesRegex(ValueError, 'actual role packet'):
            verify_sources(ROOT, changed)

    def test_wrong_frozen_identity_rejected(self) -> None:
        """Prevent the figure from silently referring to a repaired or different design."""
        changed = copy.deepcopy(self.data)
        changed['freeze_sha256'] = '0' * 64
        with self.assertRaisesRegex(ValueError, 'freeze differs'):
            verify_sources(ROOT, changed)

    def test_changed_deployment_condition_rejected(self) -> None:
        """Reject a substituted hard event while preserving the original evidence."""
        changed = copy.deepcopy(self.data)
        changed['events'][2]['source_event'] = 'No communications failure occurs.'
        with self.assertRaisesRegex(ValueError, 'event differs'):
            verify_sources(ROOT, changed)

    def test_forged_executable_outcome_rejected(self) -> None:
        """A publication figure cannot silently turn an executed failure into success."""
        changed = copy.deepcopy(self.data)
        changed['execution']['primary_episodes'][1]['outcomes']['deployment_demand_fulfilled'] = True
        with self.assertRaisesRegex(ValueError, 'actual executable outcomes'):
            verify_sources(ROOT, changed)

    def test_manuscript_scope(self) -> None:
        """Keep unrelated explorations and development diary material outside the main paper."""
        paper = (ROOT / 'docs/lifecycle/competency-mediation-paper-v3.md').read_text()
        for excluded in ['dynamic-flower', 'flower-team-study', 'failed pilot',
                         'gate amendment', 'permission-review', 'sixteen subagent']:
            self.assertNotIn(excluded, paper.lower())
        self.assertIn('Our thesis is', paper)
        self.assertIn('12 distinct subagent conversations', paper)


if __name__ == '__main__':
    unittest.main()
