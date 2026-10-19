"""Require substantive native resource guidance on every new built page by default."""
from dataclasses import dataclass, field
from html.parser import HTMLParser
import argparse
import json
from pathlib import Path
import re
import sys

REPO = Path(__file__).resolve().parents[1]
POLICY = REPO / 'src/data/resource-page-policy.json'
HEADINGS = ('What is this resource?', 'How should I use it?',
            'How does this connect to LENS and learning engineering?')
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())


@dataclass
class Element:
    """Retain actual HTML elements so comments and script strings cannot satisfy the rule."""
    tag: str
    attrs: dict[str, str | None] = field(default_factory=dict)
    children: list = field(default_factory=list)
    parent: 'Element | None' = field(default=None, repr=False)


class PageHTML(HTMLParser):
    """Build a small element tree using Python's dependency-free HTML parser."""
    def __init__(self) -> None:
        """Start an empty document and element stack."""
        super().__init__(convert_charrefs=True)
        self.root = Element('document')
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Attach an element and enter its content unless it is a void tag."""
        node = Element(tag, dict(attrs), parent=self.stack[-1])
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        """Handle explicitly self-closing HTML or SVG elements."""
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        """Leave the matching element while tolerating optional HTML closures."""
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data: str) -> None:
        """Keep text at its actual place in the document."""
        self.stack[-1].children.append(data)


def elements(node: Element) -> list[Element]:
    """Visit real descendants while excluding executable and inert template content."""
    if node.tag in {'script', 'style', 'template', 'noscript'}:
        return []
    return [node] + [descendant for child in node.children if isinstance(child, Element)
                     for descendant in elements(child)]


def prose(node: Element) -> str:
    """Normalize readable text without counting source code as guidance."""
    if node.tag in {'script', 'style', 'template'}:
        return ''
    return ' '.join(' '.join(prose(child) if isinstance(child, Element) else child
                            for child in node.children).split())


def meaningful(text: str, minimum: int) -> bool:
    """Reject empty, minimal or explicitly unfinished guidance."""
    return len(text) >= minimum and not re.search(r'\b(TODO|FIXME|TBD|lorem ipsum)\b', text, re.I)


def check_card(card: Element) -> list[str]:
    """Require a collapsed disclosure and three substantive, correctly ordered sections."""
    errors = []
    node = card
    while node:
        if 'hidden' in node.attrs or node.attrs.get('aria-hidden') == 'true':
            errors.append('guidance must not be hidden')
        node = node.parent
    if 'open' in card.attrs:
        errors.append('guidance must start collapsed')
    if not (card.attrs.get('data-resource-about') or '').strip():
        errors.append('guidance needs a resource identifier')
    summary = [node for node in card.children if isinstance(node, Element) and node.tag == 'summary']
    if len(summary) != 1 or not prose(summary[0]).startswith('About this resource'):
        errors.append('guidance needs the About this resource summary')
    headings = [node for node in elements(card) if node.tag in {'h2', 'h3'}]
    if tuple(prose(node) for node in headings) != HEADINGS:
        return errors + ['guidance needs all three standard section headings in order']
    for index, heading in enumerate(headings):
        section = heading.parent
        if section.tag != 'section':
            errors.append(f'{HEADINGS[index]} needs its own section')
            continue
        paragraphs = ' '.join(prose(node) for node in elements(section) if node.tag == 'p')
        if index in (0, 2) and not meaningful(paragraphs, 40 if index == 0 else 80):
            errors.append(f'{HEADINGS[index]} needs a substantive explanation')
        if index == 1:
            lists = [node for node in elements(section) if node.tag == 'ol']
            steps = [node for item in lists for node in item.children
                     if isinstance(node, Element) and node.tag == 'li']
            if len(steps) < 2 or any(not meaningful(prose(step), 20) for step in steps):
                errors.append('How should I use it? needs at least two practical use steps')
    return errors


def inspect_html(html: str) -> list[str]:
    """Find missing cards and validate every disclosure actually present in a page."""
    parser = PageHTML()
    parser.feed(html)
    cards = [node for node in elements(parser.root)
             if node.tag == 'details' and 'resource-about' in (node.attrs.get('class') or '').split()]
    if not cards:
        return ['missing About this resource card; add ResourceAbout after the introduction']
    return [f'{card.attrs.get("data-resource-about", "unnamed")}: {error}'
            for card in cards for error in check_card(card)]


def discover(root: Path, policy: dict) -> list[dict]:
    """Default every built HTML page to required, with exact-path reviewed exceptions only."""
    pages = sorted(path.relative_to(root).as_posix() for path in root.rglob('*') if path.is_file() and path.suffix.lower() in {'.html', '.htm'})
    if not pages:
        raise ValueError('No built HTML pages found; run npm run build first')
    exemptions, clients = policy.get('exemptions', {}), policy.get('client_rendered', {})
    if set(exemptions) & set(clients):
        raise ValueError('Client-rendered resources must not also be exempted')
    for name, reason in {**exemptions, **clients}.items():
        if not reason.strip() or '*' in name or '..' in Path(name).parts or name.startswith('/'):
            raise ValueError(f'Exception needs an exact relative path and review reason: {name}')
        if name not in pages:
            raise ValueError(f'Stale resource-page policy path: {name}')
    return [{'file': name, 'route': '/' + (name[:-10] if name == 'index.html' or name.endswith('/index.html') else name), 'client_rendered': name in clients}
            for name in pages if name not in exemptions]


def check_build(root: Path, policy: dict) -> list[str]:
    """Fail publication for any undisclosed static resource, including newly added routes."""
    return [f'{page["file"]}: {error}' for page in discover(root, policy) if not page['client_rendered']
            for error in inspect_html((root / page['file']).read_text())]


def main() -> None:
    """Expose the publication check and the same discovered inventory to browser tests."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=REPO / 'dist')
    parser.add_argument('--list-resources', action='store_true')
    parser.add_argument('--check-html', action='store_true', help='Validate rendered HTML from stdin')
    args = parser.parse_args()
    if args.check_html:
        errors = inspect_html(sys.stdin.read())
        if errors:
            parser.exit(1, 'Rendered resource guidance failed:\n' + '\n'.join(errors) + '\n')
        return
    policy = json.loads(POLICY.read_text())
    try:
        pages = discover(args.root, policy)
        if args.list_resources:
            print(json.dumps(pages))
            return
        errors = check_build(args.root, policy)
    except ValueError as error:
        parser.exit(1, f'Resource guidance check failed: {error}\n')
    if errors:
        parser.exit(1, 'Resource guidance check failed:\n' + '\n'.join(errors) + '\n')
    print(f'Resource guidance required: {len(pages)} resources discovered; '
          f'{sum(not page["client_rendered"] for page in pages)} static pages checked; '
          f'{sum(page["client_rendered"] for page in pages)} client-rendered pages require browser verification.')


if __name__ == '__main__':
    main()
