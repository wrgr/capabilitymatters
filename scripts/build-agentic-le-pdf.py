"""Build the Agentic LE PDF from its canonical, source-grounded methods paper."""
from paper_pdf import ROOT, build

if __name__ == "__main__":
    build(ROOT / "src/papers/learning-engineering-teams.md", ROOT / "public/agentic-le/paper/paper.pdf",
          authors="William Gray-Roncal and Jodi Lis", strapline="AGENTIC LE  /  METHODS PAPER",
          running_title="Agentic simulation, collaboration, and learning from project outcomes",
          url="https://capabilitymatters.org/agentic-le/paper/")
