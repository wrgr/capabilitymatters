"""Check the built paper's reading route, section links, and paired downloads."""

from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class PaperParser(HTMLParser):
    """Collect document anchors and links without requiring browser dependencies."""

    def __init__(self) -> None:
        """Initialize the bounded metadata collected by this check."""
        super().__init__()
        self.ids: set[str] = set()
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Collect named targets and anchor destinations from the built page."""
        attr = dict(attrs)
        if attr.get("id"):
            self.ids.add(attr["id"])
        if tag == "a" and attr.get("href"):
            self.links.append(attr["href"])


def test_paper_build() -> None:
    """Ensure the paper and downloads resolve in the generated site."""
    page = ROOT / "dist/show-your-work/index.html"
    assert page.is_file(), "Run npm run build before this check"
    parser = PaperParser()
    parser.feed(page.read_text())
    anchors = [link[1:] for link in parser.links if link.startswith("#")]
    assert len(anchors) >= 11
    assert set(anchors) <= parser.ids, "A table-of-contents link has no target"
    for name in ("show-your-work.pdf", "show-your-work-august-2026.pdf"):
        assert f"/papers/{name}" in parser.links
        data = (ROOT / "dist/papers" / name).read_bytes()
        assert data.startswith(b"%PDF-") and len(data) > 10000
    assert 'import { Content, getHeadings } from "../papers/show-your-work.md"' in (
        ROOT / "src/pages/show-your-work.astro").read_text()
    assert 'src/papers/show-your-work.md' in (
        ROOT / "scripts/build-show-your-work-pdf.py").read_text()


if __name__ == "__main__":
    test_paper_build()
    print("Show Your Work page and downloads OK")
