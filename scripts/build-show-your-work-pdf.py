"""Build the Capability Matters reading PDF from the canonical community paper."""
from paper_pdf import ROOT, build

if __name__ == "__main__":
    build(ROOT / "src/papers/show-your-work.md", ROOT / "public/papers/show-your-work.pdf",
          authors="William Gray-Roncal and James Diamond", strapline="CAPABILITY MATTERS  /  COMMUNITY PAPER",
          running_title="Learning Engineering in Next-Generation Systems",
          url="https://capabilitymatters.org/show-your-work/")
