"""Guard attribution and the boundary between the simulation and Karpathy's actual model."""
from pathlib import Path
from html.parser import HTMLParser
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Links(HTMLParser):
    """Collect links and element IDs to check the built companion's navigation."""

    def __init__(self) -> None:
        """Initialize collected attributes."""
        super().__init__()
        self.links: list[str] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Record local anchors and linked source material."""
        values = dict(attrs)
        if values.get('id'):
            self.ids.add(values['id'])
        if tag == 'a' and values.get('href'):
            self.links.append(values['href'])


class MicrogptPageTest(unittest.TestCase):
    """Check the generated artifact rather than an implementation snapshot."""

    def test_sources_and_boundaries(self) -> None:
        """The built page identifies source ownership and its simulated outputs."""
        html = (ROOT / 'dist/microgpt/index.html').read_text()
        for text in ('Andrej Karpathy', 'Andrew Ng', 'Dario Amodei',
                     'Fixed, invented scores', 'No trained model',
                     'does not reproduce', 'No endorsement',
                     'We have not established a learning effect',
                     'No camera, microphone, or eye-tracking data is collected',
                     'Import checkpoint', 'code-tray', 'help-dialog',
                     'simple-dialog', 'Explain to me with more straightforward language',
                     'Inspect every training and test example', 'name-comparison',
                     'Inspect every synthetic observation and its label', 'bias-data-rows',
                     'Names, stereotypes and fairness', 'English-alphabet model',
                     'Deliberately alter the labels', 'Balance representation'):
            self.assertIn(text, html)
        parsed = Links()
        parsed.feed(html)
        self.assertIn('https://karpathy.github.io/2026/02/12/microgpt/', parsed.links)
        for href in parsed.links:
            if href.startswith('#'):
                self.assertIn(href[1:], parsed.ids)
            elif href.startswith('/'):
                target = ROOT / 'dist' / href.lstrip('/')
                self.assertTrue(target.exists(), href)

    def test_discoverable(self) -> None:
        """Both entry points expose the new page."""
        for route in ('experiments', 'llm101'):
            self.assertIn('/microgpt/', (ROOT / f'dist/{route}/index.html').read_text())


if __name__ == '__main__':
    unittest.main()
