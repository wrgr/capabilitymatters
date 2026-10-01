"""Guard the Experiments page and its nav wiring.

File-content assertions check
that the experiments page exists, renders a card grid from its inline data, and
is linked from the top nav — so a refactor can't silently drop the tab or its
cards.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SRC = REPO_ROOT / "src"


def _read(rel: str) -> str:
    """Read a source file under src by relative path."""
    return (SRC / rel).read_text(encoding="utf-8")


def test_experiments_page_exists() -> None:
    """The experiments page exists and renders a card grid from inline data."""
    page = _read("pages/experiments.astro")
    assert "experiments" in page, "experiments data array missing"
    assert 'class="card"' in page, "no card markup on experiments page"
    assert '"_blank"' in page, "external projects retain new-tab behavior"


def test_experiments_page_lists_each_experiment() -> None:
    """Every experiment URL is present so none is silently dropped."""
    page = _read("pages/experiments.astro")
    for url in (
        "capabilitymatters.org/llm101",
        "calibratedjudgment.org",
        "experttrace.org",
        "neurotrailblazers.org",
        "wrgr.github.io/pop",
    ):
        assert url in page, f"experiment link missing: {url}"


def test_personal_site_is_in_about() -> None:
    """The personal site remains discoverable without counting as an experiment."""
    assert 'https://will.grayroncal.com' in _read('pages/about.astro')
    assert 'title: "Will Gray-Roncal"' not in _read('pages/experiments.astro')


def test_experiment_groups() -> None:
    """Built cards are grouped exactly once by purpose, with reading separate."""
    html = (REPO_ROOT / 'dist/experiments/index.html').read_text()
    for group in ('labs', 'research', 'creative'):
        assert f'id="{group}"' in html
    assert html.count('class="card"') == 8
    assert 'Supporting reading' in html


def test_rainbow_bug_has_credit_and_job_aid() -> None:
    """The game and companion download are published with Julian's credit."""
    page = _read("pages/experiments.astro")
    assert 'url: "/rainbow-bug/"' in page
    assert "Julian, age 6" in page
    assert "creative partner" in page
    assert 'href={exp.jobAid.url} download' in page
    assert (REPO_ROOT / "public/vibe-coding-job-aid.docx").is_file()
    for name in ("index.html", "game.js", "style.css", "assets/boy-happy.png",
                 "assets/boy-idle.png", "assets/boy-sad.png", "assets/boy-sheet.png"):
        assert (REPO_ROOT / "public/rainbow-bug" / name).is_file()


def test_experiments_linked_from_nav() -> None:
    """The top nav links to the experiments tab."""
    nav = _read("components/NavBar.astro")
    assert 'slug: "experiments"' in nav, "experiments tab not wired into NavBar"


def test_featured_paper_banner() -> None:
    """The featured paper links to the HTML reading edition."""
    page = _read("pages/experiments.astro")
    assert "featured-banner" in page, "featured paper banner markup missing"
    assert "/show-your-work/" in page, (
        "featured paper link missing"
    )


if __name__ == "__main__":
    test_experiments_page_exists()
    test_experiments_page_lists_each_experiment()
    test_personal_site_is_in_about()
    test_rainbow_bug_has_credit_and_job_aid()
    test_experiments_linked_from_nav()
    test_featured_paper_banner()
    test_experiment_groups()
    print("experiments page OK")
