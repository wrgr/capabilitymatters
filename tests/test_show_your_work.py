"""Check both canonical paper routes, section links, PDFs, and evidence audit."""

from html.parser import HTMLParser
from pathlib import Path
import hashlib
import json
from urllib.parse import urlsplit

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
    paths = [urlsplit(link).path for link in parser.links]
    assert "/papers/show-your-work.pdf" in paths
    assert "/papers/show-your-work-august-2026.pdf" not in paths
    assert "August" not in (ROOT / "src/papers/show-your-work.md").read_text()
    data = (ROOT / "dist/papers/show-your-work.pdf").read_bytes()
    assert data.startswith(b"%PDF-") and len(data) > 10000
    assert 'import { Content, getHeadings } from "../papers/show-your-work.md"' in (
        ROOT / "src/pages/show-your-work.astro").read_text()
    assert 'src/papers/show-your-work.md' in (
        ROOT / "scripts/build-show-your-work-pdf.py").read_text()


def test_agentic_paper_build() -> None:
    """Keep the unlisted methods paper, PDF, and all three source records together."""
    page = (ROOT / "dist/agentic-le/paper/index.html").read_text()
    parser = PaperParser()
    parser.feed(page)
    assert "Learning Engineering in Action" in page
    assert 'content="noindex, nofollow"' in page
    assert {link[1:] for link in parser.links if link.startswith("#")} <= parser.ids
    paths = {urlsplit(link).path for link in parser.links}
    assert {"/agentic-le/paper/paper.pdf", "/agentic-le/paper/manuscript.md", "/agentic-le/paper/evidence.json"} <= paths
    base = ROOT / "dist/agentic-le/paper"
    data = (base / "paper.pdf").read_bytes()
    assert data.startswith(b"%PDF-") and len(data) > 10000
    source = (ROOT / "src/papers/learning-engineering-teams.md").read_bytes()
    assert (base / "manuscript.md").read_bytes() == source
    audit = json.loads((base / "evidence.json").read_text())
    assert audit["manuscript_sha256"] == hashlib.sha256(source).hexdigest()
    assert audit["pdf_sha256"] == hashlib.sha256(data).hexdigest()
    assert {case["id"] for case in audit["cases"]} == {"workforce", "school-science", "library-access"}
    inventory = json.loads((ROOT / "dist/agentic-le/cases.json").read_text())["cases"]
    for case in audit["cases"]:
        original = next(c for c in inventory if c["id"] == case["id"])
        journal = (ROOT / "public/agentic-le/replay" / original["journal"]).read_bytes()
        assert hashlib.sha256(journal).hexdigest() == case["journal_sha256"]


if __name__ == "__main__":
    test_paper_build()
    test_agentic_paper_build()
    print("Both paper routes, PDFs, and three-case evidence audit OK")
