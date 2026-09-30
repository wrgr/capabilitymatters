"""Render the canonical Show Your Work Markdown as a readable, linked PDF."""

import re
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "src/papers/show-your-work.md"
OUTPUT = ROOT / "public/papers/show-your-work.pdf"
INK = colors.HexColor("#162d40")
ACCENT = colors.HexColor("#23677b")
WIDTH = 7 * inch


def inline(text: str) -> str:
    """Convert the paper's inline Markdown subset to safe ReportLab markup."""
    text = escape(text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)",
                  r'<a href="\2" color="#23677b">\1</a>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)


def make_styles() -> dict[str, ParagraphStyle]:
    """Define a compact, consistent hierarchy for the reading edition."""
    base = getSampleStyleSheet()
    common = dict(textColor=INK, alignment=TA_LEFT)
    return {
        "body": ParagraphStyle("PaperBody", fontName="Times-Roman", fontSize=11,
                               leading=15, spaceAfter=9, **common),
        "title": ParagraphStyle("PaperTitle", fontName="Helvetica-Bold", fontSize=32,
                                leading=36, spaceAfter=10, **common),
        "subtitle": ParagraphStyle("PaperSubtitle", fontName="Times-Roman", fontSize=18,
                                   leading=23, spaceAfter=18, **common),
        "h2": ParagraphStyle("PaperH2", fontName="Helvetica-Bold", fontSize=15,
                             leading=19, spaceBefore=17, spaceAfter=9, keepWithNext=True, **common),
        "h3": ParagraphStyle("PaperH3", fontName="Helvetica-Bold", fontSize=11.5,
                             leading=15, spaceBefore=12, spaceAfter=7, keepWithNext=True, **common),
        "cell": ParagraphStyle("PaperCell", fontName="Times-Roman", fontSize=9.4,
                               leading=12.4, **common),
        "ref": ParagraphStyle("PaperRef", parent=base["BodyText"], fontName="Times-Roman",
                              fontSize=9.3, leading=12, spaceAfter=4, **common),
    }


def make_table(lines: list[str], styles: dict) -> Table:
    """Lay out a Markdown table with repeated headers and wrapped cells."""
    rows = [[cell.strip() for cell in line.strip().strip("|").split("|")]
            for line in lines if not re.fullmatch(r"[\s|:\-]+", line)]
    data = [[Paragraph(inline(cell), styles["cell"]) for cell in row] for row in rows]
    widths = [WIDTH * .22, WIDTH * .39, WIDTH * .39] if len(rows[0]) == 3 else [WIDTH * .25, WIDTH * .75]
    table = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT", spaceAfter=13,
                  splitByRow=0)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e5eef2")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f6f8fa")]),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), .4, colors.HexColor("#ccd5dc")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return table


def content_blocks(text: str, styles: dict) -> list:
    """Render only the canonical paper's supported blocks, preserving order."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    story = [Paragraph("LENS  /  GROUNDING PAPER", styles["h3"]),
             HRFlowable(width=WIDTH, thickness=2, color=ACCENT), Spacer(1, 16)]
    subtitle = True
    blocks = re.split(r"\n\s*\n", text.strip())
    for index, block in enumerate(blocks):
        if block.startswith("| "):
            story.append(make_table(block.splitlines(), styles))
            continue
        match = re.match(r"^(#{1,3}) (.*)", block, flags=re.S)
        if match:
            level, value = len(match[1]), match[2]
            style = "title" if level == 1 else "h2" if level == 2 else "h3"
            if level == 2 and subtitle:
                style, subtitle = "subtitle", False
            story.append(Paragraph(inline(value), styles[style]))
        else:
            style = "ref" if re.match(r"^\d+\. ", block) else "body"
            paragraph = Paragraph(inline(block.replace("\n", " ")), styles[style])
            # Keep each table with the sentence that introduces its purpose.
            paragraph.keepWithNext = index + 1 < len(blocks) and blocks[index + 1].startswith("| ")
            story.append(paragraph)
    return story


def page_chrome(canvas: object, doc: object) -> None:
    """Add stable version information and page numbers without covering text."""
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor("#ccd5dc"))
    canvas.line(54, 42, 558, 42)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(INK)
    canvas.drawString(54, 29, "SHOW YOUR WORK  |  Working draft, September 30, 2026")
    canvas.drawRightString(558, 29, str(doc.page))
    canvas.linkURL("https://capabilitymatters.org/show-your-work/", (54, 23, 380, 39))
    if doc.page > 1:
        canvas.setFont("Helvetica", 8)
        canvas.drawString(54, 763, "William Gray-Roncal and James Diamond")
        canvas.drawRightString(558, 763, "Functional evidence for capability and learning")
    canvas.restoreState()


def main() -> None:
    """Build the PDF from the same Markdown imported by the website."""
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=(612, 792), leftMargin=54,
                            rightMargin=54, topMargin=48, bottomMargin=57,
                            title="Show Your Work: Functional Evidence for Claims About Capability and Learning",
                            author="William Gray-Roncal and James Diamond")
    doc.build(content_blocks(SOURCE.read_text(), make_styles()),
              onFirstPage=page_chrome, onLaterPages=page_chrome)
    print(OUTPUT)


if __name__ == "__main__":
    main()
