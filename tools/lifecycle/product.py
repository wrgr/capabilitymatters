"""Package a runnable candidate, requirements and evidence as a portable product handoff."""
import hashlib
import html
import io
import json
from pathlib import Path
import zipfile

def product_files(run):
    from engine import verify, snapshot
    from package_exemplar import protected_html
    verify(run)
    artifacts = snapshot(run, len(run["events"]))["artifacts"]
    build = artifacts.get("build")
    if not build or not build["content"].get("prototype_html", "").strip():
        raise ValueError("A product handoff requires an executable Build artifact")
    files = {
        "candidate.html": protected_html(build["content"]["prototype_html"]),
        "project-journal.json": json.dumps(run, indent=2, ensure_ascii=False),
        "artifacts.json": json.dumps(artifacts, indent=2, ensure_ascii=False),
        "requirements.md": "\n\n".join("# " + stage.title() + "\n\n" + artifact["content"]["body"] for stage, artifact in artifacts.items()),
        "README.md": f"# {run['seed']['title']}\n\nRunnable candidate product from Capability Matters.\n\nOpen candidate.html in a browser using fictional input. Review requirements.md, artifacts.json and project-journal.json together. The journal preserves the source discussion, dissent, scenarios and revisions.\n\nRun: {run['id']}\nBuild content hash: {build['content_hash']}\n\nRelease state: candidate. Human pilot approval, affected-person review, accessibility and field evidence remain separate requirements. Generated code and local interaction checks do not establish learning, transfer or flourishing.\n",
    }
    checks = [e for e in run["events"] if e["kind"] == "verification" and e["payload"].get("status") == "technical_checks_passed"]
    manifest = {"schema_version": 1, "product_name": run["seed"]["title"], "release_state": "candidate",
        "run_id": run["id"], "run_head_hash": run["events"][-1]["hash"], "build_content_hash": build["content_hash"],
        "build_revision": build["revision"], "entrypoint": "candidate.html",
        "human_pilot": "pending", "field_outcomes": "unknown", "technical_verification_events": [e["seq"] for e in checks],
        "role_profiles": run.get("role_profiles", {"status": "Legacy role prompts; no proficiency profile was recorded or retrospectively assigned."}),
        "files": {name: hashlib.sha256(text.encode()).hexdigest() for name, text in files.items()}}
    files["manifest.json"] = json.dumps(manifest, indent=2, ensure_ascii=False)
    return files

def zip_bytes(run):
    result = io.BytesIO()
    with zipfile.ZipFile(result, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, text in product_files(run).items():
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, text.encode())
    return result.getvalue()

def write_product(run, directory):
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=True)
    for name, text in product_files(run).items():
        (directory / name).write_text(text)
    (directory / "product.zip").write_bytes(zip_bytes(run))
    title = html.escape(run["seed"]["title"])
    (directory / "index.html").write_text(f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title} · Candidate product</title><style>body{{font:17px/1.6 system-ui;background:#fefdf8;color:#182031;max-width:1100px;margin:auto;padding:24px}}iframe{{width:100%;height:800px;border:1px solid #ccd5dc}}a{{color:#28596c}}nav a{{display:inline-block;margin-right:20px}}</style></head><body><nav><a href="/lifecycle-lab/">Capability Matters lifecycle</a><a href="/lifecycle-lab/replay/">Replay the project</a><a href="product.zip" download>Download product bundle</a></nav><h1>{title}</h1><p>Runnable candidate product. The bundle includes the executable tool, requirements, versioned artifacts, project journal and handoff manifest. Human review and field evidence remain pending.</p><iframe src="candidate.html" title="Generated candidate product" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe><p><a href="manifest.json">Inspect the product manifest</a></p></body></html>''')
    return directory
