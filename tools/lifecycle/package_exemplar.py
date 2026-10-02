"""Package saved candidate source as normal sandbox-frame resources for portable replay."""
import json
from pathlib import Path
from engine import ROOT, WEB, verify

POLICY = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'"

def protected_html(source):
    # CSP is parsed before any supplied markup or script. A valid document shell
    # avoids relying on browser-specific support for srcdoc or blob navigations.
    import re
    meta = '<meta http-equiv="Content-Security-Policy" content="' + POLICY + '">'
    if re.search(r"<head\b[^>]*>", source, re.I):
        return re.sub(r"(<head\b[^>]*>)", lambda m: m.group(1) + meta, source, count=1, flags=re.I)
    source = re.sub(r"<!doctype[^>]*>", "", source, flags=re.I)
    return '<!doctype html><html><head>' + meta + '</head><body>' + source + '</body></html>'

def package(filename):
    run = json.loads(Path(filename).read_text())
    verify(run)
    directory = WEB / "artifacts"
    directory.mkdir(exist_ok=True)
    for event in run["events"]:
        if event["kind"] == "artifact" and event["payload"]["content"].get("prototype_html"):
            payload = event["payload"]
            (directory / (payload["content_hash"] + ".html")).write_text(protected_html(payload["content"]["prototype_html"]))

if __name__ == "__main__":
    import sys
    for filename in sys.argv[1:]: package(filename)
