"""Guard the case-study render against drift from the casebook source of record.

File-content assertions (there is no JS test runner in this repo). Two things
regress silently and are expensive to notice: a corrected fact from a casebook
revision pass reaching the frontmatter but not the site-voice lead beside it,
and a load-bearing caveat reaching the page but not the AI prompt that carries
the same case off-site. These pin both.
"""

from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SRC = REPO_ROOT / "src"
CASES = SRC / "content" / "case-studies"


def _read(rel: str) -> str:
    """Read a source file under src by relative path."""
    return (SRC / rel).read_text(encoding="utf-8")


def _case(slug: str) -> str:
    """Read one case-study MDX file by slug."""
    return (CASES / f"{slug}.mdx").read_text(encoding="utf-8")


def _lead(slug: str) -> str:
    """Read only the MDX body — the site-voice lead, below the frontmatter."""
    return _case(slug).split("\n---\n", 1)[1]


def test_objective_tier_is_leo_not_clo() -> None:
    """The concentration-objective tier is LEO; CLO now names the course tier."""
    for mdx in CASES.glob("*.mdx"):
        text = mdx.read_text(encoding="utf-8")
        assert "cloAnchor" not in text, f"{mdx.name} still uses the retired cloAnchor"
        assert "CLO-" not in text, f"{mdx.name} still cites a CLO- code"
    detail = _read("pages/case-studies/[slug].astro")
    assert "d.leoAnchor" in detail, "detail page does not render the LEO anchor"


def test_every_case_carries_the_three_anchors() -> None:
    """Each case keeps its LENS, induced and LEO anchors."""
    for mdx in CASES.glob("*.mdx"):
        text = mdx.read_text(encoding="utf-8")
        for field in ("lensAnchor:", "inducedAnchor:", "leoAnchor:"):
            assert field in text, f"{mdx.name} is missing {field}"


def test_competing_readings_and_scope_limit_render() -> None:
    """The book's competing readings and scope limit reach the detail page."""
    detail = _read("pages/case-studies/[slug].astro")
    assert "d.competingReadings.length > 0" in detail, "competing readings not rendered"
    assert "d.scopeLimit &&" in detail, "scope limit not rendered"
    andon = _case("toyota-production-system-andon-cord")
    assert "competingReadings:" in andon, "Andon lost its competing readings"
    assert "scopeLimit:" in andon, "Andon lost its scope limit"


def test_ask_ai_prompt_carries_every_caveat() -> None:
    """The prompt dossier carries each caveat the page shows, unsoftened."""
    ask = _read("components/AskAI.astro")
    for marker in (
        "IN BRIEF",
        "DISCLOSURE",
        "EVIDENCE TIER",
        "COMPETING READINGS",
        "SCOPE LIMIT",
    ):
        assert marker in ask, f"AI prompt dossier is missing {marker}"
    assert "do not pick a winner" in ask, "prompt lets the tutor adjudicate rivals"
    assert "keep the hedge" in ask, "prompt does not instruct the tutor to keep hedges"


def test_ask_ai_is_passed_the_caveats_everywhere_it_appears() -> None:
    """Both AskAI call sites pass the fields, so the card prompt isn't thinner."""
    for page in ("pages/case-studies/index.astro", "pages/case-studies/[slug].astro"):
        markup = _read(page)
        for prop in ("competingReadings=", "scopeLimit=", "summary=", "coi="):
            assert prop in markup, f"{page} does not pass {prop} to AskAI"


def test_leads_match_the_corrected_mechanisms() -> None:
    """Site-voice leads carry the corrections, not the superseded folk reading."""
    andon = _lead("toyota-production-system-andon-cord")
    assert "Pulling it does not stop the line" in andon, "Andon lead teaches the folk mechanism"
    crm = _lead("crew-resource-management-and-cast")
    assert "portfolio figure" in crm, "CRM lead still credits the 83% to CRM alone"
    # Fogarty named stress, task fixation and unconscious distortion of data.
    # "Confirmation bias" is the book's framing of the display's design test in
    # lensApproach, never a finding of the report — so pin the lead, not the file.
    vincennes = _lead("uss-vincennes-and-iran-air-flight-655")
    assert "functioned as designed" in vincennes, "Vincennes lead misstates the Fogarty finding"
    assert "confirmation bias" not in vincennes, "lead attributes confirmation bias to Fogarty"
    darpa = _lead("darpa-digital-tutor-compressing-years")
    assert "for the sponsor" in darpa, "Digital Tutor lead still calls the IDA study independent"


if __name__ == "__main__":
    test_objective_tier_is_leo_not_clo()
    test_every_case_carries_the_three_anchors()
    test_competing_readings_and_scope_limit_render()
    test_ask_ai_prompt_carries_every_caveat()
    test_ask_ai_is_passed_the_caveats_everywhere_it_appears()
    test_leads_match_the_corrected_mechanisms()
    print("case-study sync OK")
