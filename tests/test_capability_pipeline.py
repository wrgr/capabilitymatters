"""Check published pipeline assets preserve the requested draft label and resolve locally."""
from pathlib import Path
import re
import unittest

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
                    self.assertTrue((ROOT / ref).is_file(), ref)

if __name__ == '__main__':
    unittest.main()
