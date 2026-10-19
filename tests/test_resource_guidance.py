"""Prove new routes and incomplete or fake guidance fail the publication requirement."""
import importlib.util
import json
import re
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('resource_guidance', REPO / 'scripts/check-resource-guidance.py')
guidance = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = guidance
spec.loader.exec_module(guidance)


class ResourceGuidanceTests(unittest.TestCase):
    """Test the actual HTML renderer and default-required discovery without a page allowlist."""
    @classmethod
    def setUpClass(cls) -> None:
        """Generate one real card, keeping fixtures aligned with maintained markup."""
        cls.card = subprocess.check_output(['node', '--input-type=module', '-e',
            "import {renderResourceAbout} from './src/lib/resource-about.mjs'; process.stdout.write(renderResourceAbout('microgpt'));"],
            cwd=REPO, text=True)

    def test_actual_card_and_nested_heading_level(self) -> None:
        """Accept the maintained renderer and Field Notes' nested headings."""
        self.assertEqual(guidance.inspect_html(self.card), [])
        self.assertEqual(guidance.inspect_html(self.card.replace('h2>', 'h3>')), [])

    def test_every_new_route_is_required_without_registration(self) -> None:
        """Catch new Astro-like, standalone and client-only pages anywhere in the build."""
        with TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ['unregistered-lab/index.html', 'new-game/play.html', 'outside-known-sections.htm']:
                path = root / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text('<h1>New resource</h1><div id="root"></div>')
            errors = guidance.check_build(root, {})
            self.assertEqual(len(errors), 3)
            for name in ['unregistered-lab/index.html', 'new-game/play.html', 'outside-known-sections.htm']:
                self.assertTrue(any(error.startswith(name + ': missing') for error in errors))
            self.assertEqual(len(guidance.discover(root, {})), 3)
            for path in root.rglob('*'):
                if not path.is_file():
                    continue
                path.write_text('<h1>New resource</h1>' + self.card)
            self.assertEqual(guidance.check_build(root, {}), [])

    def test_missing_and_unfinished_sections_fail(self) -> None:
        """Reject missing headings, empty explanations and placeholder content."""
        variants = [self.card.replace(heading, 'Different heading') for heading in guidance.HEADINGS]
        variants += [self.card.replace('<p>', '<p>TODO: ', 1),
                     self.card.replace('<li>', '<li>TBD ', 1),
                     self.card.replace('<section>', '<div>', 1),
                     re.sub(r'(<ol><li>.*?</li>).*?</ol>', r'\1</ol>', self.card, flags=re.S)]
        for html in variants:
            with self.subTest(html=html[:80]):
                self.assertTrue(guidance.inspect_html(html))

    def test_comments_code_and_hidden_fallbacks_cannot_satisfy_the_rule(self) -> None:
        """Require actual readable elements instead of source strings or inert templates."""
        for html in ['<!--' + self.card + '-->', '<script>' + json.dumps(self.card) + '</script>',
                     '<template>' + self.card + '</template>', '<noscript>' + self.card + '</noscript>',
                     '<div hidden>' + self.card + '</div>']:
            self.assertTrue(guidance.inspect_html(html))

    def test_each_present_card_is_checked_and_must_start_collapsed(self) -> None:
        """One good guide cannot conceal a broken guide in a resource collection."""
        opened = self.card.replace('<details ', '<details open ', 1)
        self.assertTrue(guidance.inspect_html(opened))
        self.assertTrue(guidance.inspect_html(self.card + opened))

    def test_exceptions_are_exact_reviewed_paths_and_clients_stay_in_browser_inventory(self) -> None:
        """Prevent broad directory exclusions and accidental client-resource exemptions."""
        with TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'index.html').write_text('<h1>Orientation</h1>')
            (root / 'client.html').write_text('<div id="root"></div>')
            policy = {'exemptions': {'index.html': 'Site orientation'},
                      'client_rendered': {'client.html': 'Required browser check'}}
            self.assertEqual(guidance.check_build(root, policy), [])
            self.assertEqual(guidance.discover(root, policy),
                             [{'file': 'client.html', 'route': '/client.html', 'client_rendered': True}])
            for invalid in [{'exemptions': {'*.html': 'Broad bypass'}},
                            {'exemptions': {'index.html': ''}},
                            {'exemptions': {'removed.html': 'Stale'}},
                            {'exemptions': {'index.html': 'Bypass'}, 'client_rendered': {'index.html': 'Client'}}]:
                with self.assertRaises(ValueError):
                    guidance.discover(root, invalid)


if __name__ == '__main__':
    unittest.main()
