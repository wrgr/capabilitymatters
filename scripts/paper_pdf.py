"""Render a canonical community paper as a readable, linked PDF."""

import hashlib
import re
from html import escape
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable, KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parent.parent
INK = colors.HexColor("#162d40")
ACCENT = colors.HexColor("#23677b")
WIDTH = 7 * inch


def inline(text: str) -> str:
    """Convert the paper's inline Markdown subset to safe ReportLab markup."""
    text = text.translate(str.maketrans({"–": "-", "—": "-", "‑": "-", "’": "'", "‘": "'", "“": '"', "”": '"'}))
    text = escape(text)
    text = re.sub(r"\[([^\]]+)\]\((https?://[^)]+)\)",
                  r'<a href="\2" color="#23677b">\1</a>', text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    text = re.sub(r"`([^`]+)`", r'<font name="Courier">\1</font>', text)
    return re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<i>\1</i>", text)


def make_styles() -> dict[str, ParagraphStyle]:
    """Define a compact, consistent hierarchy for the reading edition."""
    base = getSampleStyleSheet()
    common = dict(textColor=INK, alignment=TA_LEFT, allowWidows=0, allowOrphans=0)
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


def content_blocks(text: str, styles: dict, strapline: str) -> list:
    """Render only the canonical paper's supported blocks, preserving order."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    story = [Paragraph(strapline, styles["h3"]),
             HRFlowable(width=WIDTH, thickness=2, color=ACCENT), Spacer(1, 16)]
    subtitle = True
    blocks = re.split(r"\n\s*\n", text.strip())
    consumed = set()
    for index, block in enumerate(blocks):
        if index in consumed:
            continue
        image = re.fullmatch(r"!\[([^\]]*)\]\((/[^)]+)\)", block.strip())
        if image:
            from svglib.svglib import svg2rlg
            image_path = (ROOT / "public" / image[2].lstrip("/")).resolve()
            if not image_path.is_relative_to((ROOT / "public").resolve()) or image_path.suffix != ".svg":
                raise ValueError("Unsupported paper figure: " + image[2])
            drawing = svg2rlg(str(image_path))
            scale = WIDTH / drawing.width
            drawing.scale(scale, scale)
            drawing.width, drawing.height = drawing.width * scale, drawing.height * scale
            figure = [drawing]
            if index + 1 < len(blocks) and blocks[index + 1].startswith("*Figure "):
                figure.append(Paragraph(inline(blocks[index + 1]), styles["body"]))
                consumed.add(index + 1)
            story.append(KeepTogether(figure))
            continue
        if block.startswith("| "):
            story.append(make_table(block.splitlines(), styles))
            continue
        if re.match(r"^\d+\. ", block):
            for entry in re.split(r"\n(?=\d+\. )", block):
                story.append(Paragraph(inline(entry.replace("\n", " ")), styles["ref"]))
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


def build(source: Path, output: Path, *, authors: str, strapline: str, running_title: str, url: str) -> None:
    """Build from canonical Markdown and bind PDF metadata to its source hash."""
    text = source.read_text()
    title = re.search(r"^# (.+)$", text, re.M)[1]
    subtitle = re.search(r"^## (.+)$", text, re.M)[1]
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()

    def page_chrome(canvas: object, doc: object) -> None:
        """Add paper identity and page numbers without covering content."""
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#ccd5dc"))
        canvas.line(54, 42, 558, 42)
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(INK)
        canvas.drawString(54, 29, title.upper() + "  |  Working paper for community discussion")
        canvas.drawRightString(558, 29, str(doc.page))
        canvas.linkURL(url, (54, 23, 510, 39))
        if doc.page > 1:
            canvas.setFont("Helvetica", 8)
            canvas.drawString(54, 763, authors)
            canvas.drawRightString(558, 763, running_title)
        canvas.restoreState()

    output.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(output), pagesize=(612, 792), leftMargin=54,
                            rightMargin=54, topMargin=48, bottomMargin=57,
                            title=title + ": " + subtitle, author=authors,
                            subject="Canonical manuscript SHA-256: " + source_hash)
    doc.build(content_blocks(text, make_styles(), strapline),
              onFirstPage=page_chrome, onLaterPages=page_chrome)
    print(output)
