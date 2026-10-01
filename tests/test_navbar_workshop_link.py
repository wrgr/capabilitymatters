"""Guard the simplified navigation and preserve access to existing content."""
from pathlib import Path
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[1]

class PrimaryLinks(HTMLParser):
    """Read primary-navigation destinations from generated pages."""
    def __init__(self) -> None:
        """Initialize navigation collection."""
        super().__init__()
        self.primary = False
        self.links: list[str] = []
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Collect links only within the two primary menus."""
        a = dict(attrs)
        if tag == 'nav':
            self.primary = a.get('aria-label', '').startswith('Primary')
        if tag == 'a' and self.primary:
            self.links.append(a['href'])
    def handle_endtag(self, tag: str) -> None:
        """End the current navigation scope."""
        if tag == 'nav':
            self.primary = False

def test_primary_navigation() -> None:
    """Desktop and mobile menus expose the same five valid destinations."""
    expected = ['/', '/case-studies/', '/experiments/', '/problems-to-prototypes/', '/about/']
    for route in ['', 'case-studies', 'experiments', 'problems-to-prototypes', 'about']:
        parser = PrimaryLinks()
        parser.feed((ROOT / 'dist' / route / 'index.html').read_text())
        assert parser.links == expected * 2, (route, parser.links)
    assert (ROOT / 'dist/field-notes/index.html').is_file()

def test_home_guide() -> None:
    """The home guide explains the three collections in the built page."""
    home = (ROOT / 'dist/index.html').read_text()
    for text in ['Explore Capability Matters', 'Read the evidence', 'Explore a lab or project', 'Work from a capability gap']:
        assert text in home, text

if __name__ == '__main__':
    test_primary_navigation()
    test_home_guide()
    print('navigation and home guide OK')
