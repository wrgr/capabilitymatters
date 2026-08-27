"""Guard the LENS print sheets, their web edition, and the links to their rendered PDFs.

File-content assertions (there is no JS test runner in this repo): they pin the
print sources, their vendored fonts, the generated PDFs and their page counts,
and the homepage links — so a refactor cannot leave the homepage pointing at a
PDF that is no longer built, and cannot silently drop the copy the sheets exist
to carry.
"""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SRC_DIR = REPO_ROOT / "slick-sheet"
OVERVIEW = SRC_DIR / "lens-slick-sheet.html"
COMPANION = SRC_DIR / "lens-what-you-will-do.html"
COMPANION_PAGE = REPO_ROOT / "src" / "pages" / "about" / "what-you-will-do.astro"

# source -> (rendered PDF, expected page count). Mirrors the table in
# scripts/build-slick-sheet.sh; the two must not drift apart.
SHEETS = {
    OVERVIEW: (REPO_ROOT / "public" / "LENS_Overview_Aug2026.pdf", 1),
    COMPANION: (REPO_ROOT / "public" / "LENS_What_You_Will_Do_Aug2026.pdf", 2),
}


def _page_count(pdf: Path) -> int:
    """Count page objects in a PDF.

    `/Type /Page` also prefixes `/Type /Pages` (the page tree node), so the
    negative lookahead keeps the tree node out of the count.
    """
    return len(re.findall(rb"/Type\s*/Page(?![s])", pdf.read_bytes()))


def test_sources_and_renders_exist() -> None:
    """Every sheet source, the build script, and every rendered PDF ship."""
    assert (REPO_ROOT / "scripts" / "build-slick-sheet.sh").is_file(), "build script missing"
    for source, (pdf, _) in SHEETS.items():
        assert source.is_file(), f"sheet source missing: {source.name}"
        assert pdf.is_file(), f"rendered PDF missing: {pdf.name}"
        assert pdf.read_bytes().startswith(b"%PDF"), f"{pdf.name} is not a PDF"


def test_renders_hold_their_page_counts() -> None:
    """Each sheet fills its pages exactly; copy edits must not add a page."""
    for source, (pdf, expected) in SHEETS.items():
        actual = _page_count(pdf)
        assert actual == expected, (
            f"{pdf.name} rendered to {actual} pages, expected {expected} "
            f"(trim {source.name} or re-balance its pages)"
        )


def test_build_script_covers_every_source() -> None:
    """The build script renders every sheet source in the directory."""
    script = (REPO_ROOT / "scripts" / "build-slick-sheet.sh").read_text(encoding="utf-8")
    for source in SHEETS:
        assert source.stem in script, f"build script does not render {source.name}"


def test_fonts_are_vendored() -> None:
    """Fonts are local files, so rendering does not depend on network access."""
    fonts = SRC_DIR / "fonts"
    for name in (
        "dm-sans-latin.woff2",
        "instrument-serif-latin.woff2",
        "instrument-serif-italic-latin.woff2",
    ):
        assert (fonts / name).is_file(), f"vendored font missing: {name}"
    for source in SHEETS:
        assert "fonts.googleapis.com" not in source.read_text(encoding="utf-8"), (
            f"{source.name} must not fetch fonts over the network"
        )


def test_overview_carries_the_five_competencies() -> None:
    """All five competency names appear, in the v2.5 names and order."""
    html = OVERVIEW.read_text(encoding="utf-8")
    names = [
        "Systems Analysis",
        "Iterative Development",
        "Human-System Collaboration",
        "Test and Evaluation",
        "Navigating Sociotechnical Constraints",
    ]
    positions = [html.find(name) for name in names]
    for name, pos in zip(names, positions):
        assert pos != -1, f"competency missing from the overview: {name}"
    assert positions == sorted(positions), "competencies are out of program order"


def test_companion_addresses_both_sibling_concentrations() -> None:
    """The companion exists to answer the LXD and AILE crossing questions."""
    html = COMPANION.read_text(encoding="utf-8")
    assert "learning experience design" in html, "no LXD crossing on the companion"
    assert "AI leadership in education" in html, "no AILE crossing on the companion"
    assert "capstone" in html.lower(), "companion does not mention the capstone"


def test_homepage_links_the_overview() -> None:
    """The homepage CTA points at the overview PDF the build script writes."""
    page = (REPO_ROOT / "src" / "pages" / "index.astro").read_text(encoding="utf-8")
    assert "LENS_Overview_Aug2026.pdf" in page, "homepage does not link the overview PDF"
    assert "LENS_Overview_May2026.pdf" not in page, "homepage still links the superseded overview"


def test_companion_page_carries_the_same_content() -> None:
    """The web edition of the companion exists and says what the PDF says."""
    page = COMPANION_PAGE.read_text(encoding="utf-8")
    assert "LENS_What_You_Will_Do_Aug2026.pdf" in page, "companion page does not offer the PDF"
    for phrase in (
        "learning experience design",
        "AI leadership in education",
        "Attribute the gap",
        "capstone",
    ):
        assert phrase in page, f"companion page is missing: {phrase}"


def test_companion_page_is_unlisted() -> None:
    """The page is live but deliberately not surfaced yet.

    Delete this test when the program announces it — at which point the
    robots meta comes off and the nav/homepage links go on.
    """
    page = COMPANION_PAGE.read_text(encoding="utf-8")
    assert 'content="noindex' in page, "unlisted page lost its noindex"
    nav = (REPO_ROOT / "src" / "components" / "NavBar.astro").read_text(encoding="utf-8")
    home = (REPO_ROOT / "src" / "pages" / "index.astro").read_text(encoding="utf-8")
    # Match the route in link position only — both files mention it in comments
    # explaining that it is deliberately not linked.
    linked = re.compile(r"""(href=|url\s*=|\bhref\b)[^\n]{0,80}what-you-will-do""")
    for name, source in (("nav", nav), ("homepage", home)):
        assert not linked.search(source), f"companion page is linked from the {name}"


if __name__ == "__main__":
    test_sources_and_renders_exist()
    test_renders_hold_their_page_counts()
    test_build_script_covers_every_source()
    test_fonts_are_vendored()
    test_overview_carries_the_five_competencies()
    test_companion_addresses_both_sibling_concentrations()
    test_homepage_links_the_overview()
    test_companion_page_carries_the_same_content()
    test_companion_page_is_unlisted()
    print("print sheets OK")
