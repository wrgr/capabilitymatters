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
        self.assertIn('Evaluate (7) → Understand (1)', page)

    def test_seven_step_cycle(self) -> None:
        """Require challenge entry, a direct 7→1 loop, central refinement and capability action."""
        page = (ROOT / 'cases.html').read_text()
        diagram = page.split('<svg class="diagram-svg"', 1)[1].split('</svg>', 1)[0]
        self.assertEqual(re.findall(r'class="num"[^>]*>([0-9]+)</text>', diagram),
                         [str(i) for i in range(1, 8)])
        self.assertIn('data-from="evaluate" data-to="understand"', diagram)
        self.assertIn('class="challenge-arrow" data-from="challenge" data-to="understand"', diagram)
        self.assertIn('class="refine-node" id="refine"', diagram)
        self.assertIn('data-from="capability" data-to="problem"', diagram)
        self.assertNotIn('start-star', page)
        script = (ROOT / 'cases.js').read_text()
        self.assertNotIn('All eight steps', script)
        self.assertNotIn("class=\"idx\">0'+(i+1)", script)

    def test_approach_in_primary_navigation(self) -> None:
        """Expose the approach in the shared desktop/mobile navigation."""
        nav = (ROOT.parent.parent / 'src/components/NavBar.astro').read_text()
        self.assertRegex(nav, r'capability-pipeline/index.html#cases", label: "Approach"')
        host = (ROOT / 'index.html').read_text()
        self.assertIn('← Capability Matters', host)
        self.assertIn('Approach — The Capability Pipeline', host)

    def test_assets_resolve(self) -> None:
        """Resolve static assets and cross-links to Astro resource routes."""
        for name in ['index.html', 'cases.html', 'simulation.html']:
            content = (ROOT / name).read_text()
            for ref in re.findall(r'(?:src|href)="([^"]+)"', content):
                if not ref.startswith(('https:', 'http:', '#')):
                    path = urlsplit(ref).path
                    target = ROOT.parent / path.lstrip("/") if path.startswith("/") else ROOT / path
                    route = ROOT.parents[1] / 'src/pages' / path.strip('/')
                    self.assertTrue(target.is_file() or (path.endswith('/') and
                        (route.with_suffix('.astro').is_file() or (route / 'index.astro').is_file())), ref)

    def test_coupled_loops_are_a_bottom_card(self) -> None:
        """Preserve continuous coupling and separate learner/system evidence below the cases."""
        page = (ROOT / 'cases.html').read_text()
        self.assertLess(page.index('id="cases-section"'), page.index('id="capability-coupled-loops"'))
        self.assertLess(page.index('id="capability-coupled-loops"'), page.index('<footer>'))
        for phrase in ['Joint practice is continuous', 'independent learner competence',
                       'adoption, effective use', 'subsequent revisions']:
            self.assertIn(phrase, page)
        for pair in ['Understand &amp; Map', 'Design &amp; Build',
                     'Instrument &amp; Deploy', 'Evaluate — return to Understand']:
            self.assertIn(pair, page)
        self.assertIn('aria-labelledby="ccl-title ccl-description"', page)
        frame = re.search(r'<iframe[^>]+id="cases"[^>]+src="([^"]+)"', (ROOT / 'index.html').read_text())
        self.assertIsNotNone(frame)
        self.assertEqual(urlsplit(frame.group(1)).path, 'cases.html')
        self.assertTrue(urlsplit(frame.group(1)).query, 'Published case frame needs an asset release version')

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
