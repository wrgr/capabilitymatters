"""Build the Show Your Work PDF from the canonical LENS community paper."""
from paper_pdf import ROOT, build

if __name__ == "__main__":
    build(ROOT / "src/papers/show-your-work.md", ROOT / "public/papers/show-your-work.pdf",
          authors="William Gray-Roncal and James Diamond", strapline="LENS  /  COMMUNITY PAPER",
          running_title="Capability, learner-system performance, and human flourishing",
          url="https://capabilitymatters.org/show-your-work/")
