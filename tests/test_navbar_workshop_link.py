"""Guard the Workshop link in the top navigation.

File-content assertions (there is no JS test runner in this repo): they check
the Workshop tab is wired into NavBar with the right destination and opens in a
new tab, so a nav refactor can't silently drop or re-point it.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
NAV = REPO_ROOT / "src" / "components" / "NavBar.astro"

WORKSHOP_URL = "https://tinyurl.com/wgr-soe2026"


def _read_nav() -> str:
    """Read the NavBar component source."""
    return NAV.read_text(encoding="utf-8")


def test_workshop_tab_present() -> None:
    """The nav carries a Workshop tab pointing at the workshop URL."""
    nav = _read_nav()
    assert 'label: "Workshop"' in nav, "Workshop tab not wired into NavBar"
    assert WORKSHOP_URL in nav, f"Workshop link missing: {WORKSHOP_URL}"


def test_workshop_tab_is_external() -> None:
    """The Workshop tab is flagged external so it opens in a new tab."""
    nav = _read_nav()
    line = next(ln for ln in nav.splitlines() if WORKSHOP_URL in ln)
    assert "external: true" in line, "Workshop link must be marked external"


if __name__ == "__main__":
    test_workshop_tab_present()
    test_workshop_tab_is_external()
    print("navbar workshop link OK")
