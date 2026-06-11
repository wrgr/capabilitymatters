"""Build src/data registry and paper-id snapshots from a wrgr/lecommons checkout.

Reads all YAML files in landscape/resources/<type>/ subdirectories of the
lecommons checkout (set LECOMMONS_DIR, default ../lecommons) and writes:

  - src/data/programs_people_registry.json — flat registry for graph.astro
  - src/data/landscape_paper_ids.json      — paper resource_ids for ref validation

Both outputs are committed snapshots: rerun this script and commit the diff
whenever the lecommons landscape corpus changes. Do not hand-edit the outputs.

Requires PyYAML (see scripts/requirements.txt).
"""

import json
from pathlib import Path

import yaml

from lecommons_paths import lecommons_dir

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_FILE = REPO_ROOT / "src" / "data" / "programs_people_registry.json"
PAPER_IDS_FILE = REPO_ROOT / "src" / "data" / "landscape_paper_ids.json"

# Subdirectories in landscape/resources/ to include in the registry
# (papers are excluded — too large; only their ids are snapshotted, for
# provenance-ref validation).
INCLUDE_TYPES = {"people", "organizations", "grey_literature", "programs",
                 "conferences", "tools", "journals", "standards", "history_timeline"}


def load_yaml_record(path: Path) -> dict:
    """Load a YAML record file to a dict."""
    return yaml.safe_load(path.read_text(encoding="utf-8")) or {}


def normalise_secondary_topics(raw) -> list[str]:
    """Normalise secondary_topics to a list of strings."""
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(t).strip() for t in raw if t]
    if isinstance(raw, str):
        return [t.strip() for t in raw.replace(",", " ").split() if t.strip()]
    return []


def record_to_registry_entry(record: dict, subdir: str) -> dict | None:
    """Convert a landscape YAML record to a flat registry entry."""
    rid = record.get("resource_id") or record.get("id")
    if not rid:
        return None

    content_type = record.get("content_type", subdir.upper()[:2])
    name = (
        record.get("name")
        or record.get("title")
        or record.get("event")
        or rid
    )
    url = record.get("url") or record.get("doi") or ""
    if url and record.get("doi") and not url.startswith("http"):
        url = f"https://doi.org/{url}"

    description = record.get("description") or record.get("significance") or ""
    primary_topic = record.get("primary_topic") or "T00"
    secondary_topics = normalise_secondary_topics(record.get("secondary_topics"))

    entry: dict = {
        "resource_id": rid,
        "content_type": content_type,
        "status": record.get("status") or "APPROVED",
        "name": name,
        "url": url,
        "primary_topic": primary_topic,
        "secondary_topics": secondary_topics,
        "description": description,
    }

    # Include extra fields for people
    if content_type == "PP":
        for field in ("affiliation", "era", "role", "years"):
            if record.get(field):
                entry[field] = record[field]

    return entry


def build_registry(resources_dir: Path) -> tuple[list[dict], list[str]]:
    """Consolidate landscape YAML files into registry entries, collecting errors."""
    entries: list[dict] = []
    seen_ids: set[str] = set()
    errors: list[str] = []

    for subdir in sorted(INCLUDE_TYPES):
        subdir_path = resources_dir / subdir
        if not subdir_path.is_dir():
            continue
        for yf in sorted(subdir_path.glob("*.yaml")):
            try:
                record = load_yaml_record(yf)
                entry = record_to_registry_entry(record, subdir)
                if entry is None:
                    errors.append(f"No resource_id in {yf.name}")
                    continue
                rid = entry["resource_id"]
                if rid in seen_ids:
                    errors.append(f"Duplicate resource_id {rid} in {yf.name}")
                    continue
                seen_ids.add(rid)
                entries.append(entry)
            except Exception as exc:
                errors.append(f"Error reading {yf}: {exc}")

    return entries, errors


def collect_paper_ids(resources_dir: Path) -> list[str]:
    """Collect resource_ids from landscape paper YAMLs for ref validation."""
    ids: set[str] = set()
    for yf in sorted((resources_dir / "papers").glob("*.yaml")):
        record = load_yaml_record(yf)
        rid = record.get("resource_id") or record.get("id")
        if rid:
            ids.add(str(rid))
    return sorted(ids)


def main() -> None:
    """Write both snapshot files from the lecommons landscape corpus."""
    resources_dir = lecommons_dir() / "landscape" / "resources"

    entries, errors = build_registry(resources_dir)
    OUTPUT_FILE.write_text(
        json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Registry built: {len(entries)} entries → {OUTPUT_FILE}")

    paper_ids = collect_paper_ids(resources_dir)
    PAPER_IDS_FILE.write_text(
        json.dumps(paper_ids, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Paper ids: {len(paper_ids)} → {PAPER_IDS_FILE}")

    if errors:
        print(f"\nWarnings ({len(errors)}):")
        for e in errors[:20]:
            print(f"  {e}")
        if len(errors) > 20:
            print(f"  ... and {len(errors) - 20} more")


if __name__ == "__main__":
    main()
