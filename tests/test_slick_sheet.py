"""Guard the LENS slick sheet and the homepage link to its rendered PDF.

File-content assertions (there is no JS test runner in this repo): they pin the
print source, its vendored fonts, the generated one-page PDF, and the homepage
link — so a refactor cannot leave the homepage pointing at a PDF that is no
longer built, and cannot silently drop the competency copy the sheet exists to
carry.
"""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SHEET = REPO_ROOT / "slick-sheet" / "lens-slick-sheet.html"
PDF = REPO_ROOT / "public" / "LENS_Overview_Aug2026.pdf"


def test_sheet_source_and_render_exist() -> None:
    """The HTML source, its build script, and the rendered PDF all ship."""
    assert SHEET.is_file(), "slick sheet source missing"
    assert (REPO_ROOT / "scripts" / "build-slick-sheet.sh").is_file(), "build script missing"
    assert PDF.is_file(), "rendered slick sheet PDF missing"
    assert PDF.read_bytes().startswith(b"%PDF"), "slick sheet PDF is not a PDF"


def test_sheet_fonts_are_vendored() -> None:
    """Fonts are local files, so the render does not depend on network access."""
    fonts = REPO_ROOT / "slick-sheet" / "fonts"
    for name in (
        "dm-sans-latin.woff2",
        "instrument-serif-latin.woff2",
        "instrument-serif-italic-latin.woff2",
    ):
        assert (fonts / name).is_file(), f"vendored font missing: {name}"
    assert "fonts.googleapis.com" not in SHEET.read_text(encoding="utf-8"), (
        "sheet must not fetch fonts over the network"
    )


def test_sheet_carries_the_five_competencies() -> None:
    """All five competency names appear, in the v2.5 names and order."""
    html = SHEET.read_text(encoding="utf-8")
    names = [
        "Systems Analysis",
        "Iterative Development",
        "Human-System Collaboration",
        "Test and Evaluation",
        "Navigating Sociotechnical Constraints",
    ]
    positions = [html.find(name) for name in names]
    for name, pos in zip(names, positions):
        assert pos != -1, f"competency missing from slick sheet: {name}"
    assert positions == sorted(positions), "competencies are out of program order"


def test_sheet_is_a_single_page() -> None:
    """The layout targets one US-Letter page; the render must stay at one.

    Counts page objects rather than trusting the layout: `/Type /Page` also
    prefixes `/Type /Pages` (the page tree node), so the negative lookahead
    keeps the tree node out of the count.
    """
    pages = re.findall(rb"/Type\s*/Page(?![s])", PDF.read_bytes())
    assert len(pages) == 1, f"slick sheet rendered to {len(pages)} pages, expected 1"


def test_homepage_links_the_rendered_pdf() -> None:
    """The homepage CTA points at the PDF the build script actually writes."""
    page = (REPO_ROOT / "src" / "pages" / "index.astro").read_text(encoding="utf-8")
    assert "LENS_Overview_Aug2026.pdf" in page, "homepage does not link the current overview PDF"
    assert "LENS_Overview_May2026.pdf" not in page, "homepage still links the superseded overview"


if __name__ == "__main__":
    test_sheet_source_and_render_exist()
    test_sheet_fonts_are_vendored()
    test_sheet_carries_the_five_competencies()
    test_sheet_is_a_single_page()
    test_homepage_links_the_rendered_pdf()
    print("slick sheet OK")
