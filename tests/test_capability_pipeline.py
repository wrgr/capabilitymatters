"""Check published pipeline assets preserve the requested draft label and resolve locally, including the coupled-loops card."""
from pathlib import Path
import re
import unittest
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1] / 'public' / 'capability-pipeline'

class PipelinePublicationTests(unittest.TestCase):
    """Protect the publication's wording and local asset references."""

    def test_draft_wording(self) -> None:
        """Keep Working draft while removing the instructor-review sentence."""
        page = (ROOT / 'cases.html').read_text()
        self.assertIn('Working draft.', page)
        self.assertNotIn('instructor review pending', page)
        self.assertIn('Refine → Understand', page)

    def test_assets_resolve(self) -> None:
        """Ensure extracted scripts, styles and activity documents exist."""
        for name in ['index.html', 'cases.html', 'simulation.html']:
            content = (ROOT / name).read_text()
            for ref in re.findall(r'(?:src|href)="([^"]+)"', content):
                if not ref.startswith(('https:', 'http:', '#')):
                    self.assertTrue((ROOT / urlsplit(ref).path).is_file(), ref)

    def test_coupled_loops_are_a_bottom_card(self) -> None:
        """Preserve continuous coupling and separate learner/system evidence below the cases."""
        page = (ROOT / 'cases.html').read_text()
        self.assertLess(page.index('id="cases-section"'), page.index('id="capability-coupled-loops"'))
        self.assertLess(page.index('id="capability-coupled-loops"'), page.index('<footer>'))
        for phrase in ['Joint practice is continuous', 'independent learner competence',
                       'adoption, effective use', 'subsequent revisions']:
            self.assertIn(phrase, page)
        for pair in ['Understand &amp; Map', 'Design &amp; Build',
                     'Instrument &amp; Deploy', 'Evaluate &amp; Refine']:
            self.assertIn(pair, page)
        self.assertIn('aria-labelledby="ccl-title ccl-description"', page)
        self.assertIn('cases.html?v=coupled-loops-1', (ROOT / 'index.html').read_text())

    def test_adventure_is_discoverable(self) -> None:
        """Keep the gallery and Experiments links pointed at the simulation tab."""
        repository = ROOT.parent.parent
        for name in ['problems-to-prototypes.astro', 'experiments.astro']:
            page = (repository / 'src' / 'pages' / name).read_text()
            self.assertIn('capability-pipeline/index.html#simulation', page)
        host = (ROOT / 'index.html').read_text()
        self.assertIn("location.hash==='#simulation'", host)

if __name__ == '__main__':
    unittest.main()
