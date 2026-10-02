"""Loopback-only local runner. Hosted deployments serve the saved replay separately."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import argparse
import json
from pathlib import Path
import threading
import uuid
from datetime import datetime, timezone
from engine import ROOT, REPO, WEB, RUNS, Journal, SEED, validate_seed, CodexProvider, execute, verify
from exemplar import ScriptedProvider

LOCK = threading.Lock()
ACTIVE = None

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(REPO / "dist"), **kwargs)

    def send_json(self, value, status=200):
        body = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/":
            self.send_response(302)
            self.send_header("Location", "/lifecycle-lab/replay/")
            self.end_headers()
            return
        if self.path.startswith("/api/prototypes/"):
            key = self.path.removeprefix("/api/prototypes/")
            if len(key) != 64 or any(c not in "0123456789abcdef" for c in key):
                return self.send_json({"error": "Invalid artifact hash"}, 400)
            from package_exemplar import protected_html, POLICY
            for path in RUNS.glob("*/run.json"):
                run = json.loads(path.read_text())
                for event in run["events"]:
                    if event["kind"] == "artifact" and event["payload"]["content_hash"] == key:
                        body = protected_html(event["payload"]["content"].get("prototype_html", "")).encode()
                        self.send_response(200)
                        self.send_header("Content-Type", "text/html; charset=utf-8")
                        self.send_header("Content-Security-Policy", POLICY)
                        self.send_header("Content-Length", str(len(body)))
                        self.end_headers()
                        return self.wfile.write(body)
            return self.send_json({"error": "Artifact not found"}, 404)
        if self.path == "/api/status":
            return self.send_json({"local_runner": True, "active_run": ACTIVE, "providers": ["scripted", "codex"]})
        if self.path.startswith("/api/products/"):
            run_id = self.path.removeprefix("/api/products/").removesuffix(".zip")
            if not run_id or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in run_id):
                return self.send_json({"error": "Invalid run identity"}, 400)
            path = RUNS / run_id / "run.json"
            if not path.exists():
                return self.send_json({"error": "Run not found"}, 404)
            from product import zip_bytes
            try:
                body = zip_bytes(json.loads(path.read_text()))
            except ValueError as error:
                return self.send_json({"error": str(error)}, 409)
            self.send_response(200)
            self.send_header("Content-Type", "application/zip")
            self.send_header("Content-Disposition", 'attachment; filename="' + run_id + '-product.zip"')
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if self.path.startswith("/api/runs/"):
            run_id = self.path.removeprefix("/api/runs/")
            if not run_id or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in run_id):
                return self.send_json({"error": "Invalid run identity"}, 400)
            path = RUNS / run_id / "run.json"
            if not path.exists():
                return self.send_json({"error": "Run not found"}, 404)
            return self.send_json(json.loads(path.read_text()))
        if self.path.startswith("/api/"):
            return self.send_json({"error": "Unknown operation"}, 404)
        return super().do_GET()

    def do_POST(self):
        global ACTIVE
        # Browser same-origin requirement also blocks cross-origin DNS-rebinding origins.
        expected_origin = f"http://127.0.0.1:{self.server.server_port}"
        host = self.headers.get("Host", "")
        if host != f"127.0.0.1:{self.server.server_port}" or self.headers.get("Origin") != expected_origin:
            return self.send_json({"error": "Start runs from the local workbench"}, 403)
        if self.path != "/api/runs":
            return self.send_json({"error": "Unknown operation"}, 404)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 40000 or not self.headers.get("Content-Type", "").startswith("application/json"):
                raise ValueError("A bounded JSON request is required")
            body = json.loads(self.rfile.read(length))
            seed = validate_seed(body.get("seed"))
            mode = body.get("provider")
            if mode not in ("scripted", "codex"):
                raise ValueError("Choose scripted or codex explicitly")
            parent = body.get("parent")
            if parent is not None and (not isinstance(parent, dict) or set(parent) != {"run_id", "event_hash"} or not all(isinstance(v, str) and len(v) <= 200 for v in parent.values())):
                raise ValueError("Invalid parent provenance")
            provider = CodexProvider() if mode == "codex" else ScriptedProvider()
            if mode == "scripted" and seed != SEED:
                raise ValueError("Scripted mode uses the fixed workforce seed; choose live mode for a new idea")
            with LOCK:
                if ACTIVE:
                    return self.send_json({"error": "A run is already active", "run_id": ACTIVE}, 409)
                run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + "-" + provider.mode + "-" + uuid.uuid4().hex[:6]
                journal = Journal(RUNS / run_id, seed, provider.mode, parent)
                ACTIVE = run_id
            def work():
                global ACTIVE
                try:
                    execute(journal, provider)
                    from product import write_product
                    write_product(journal.run, journal.path / "product")
                except Exception as error:
                    if journal.events[-1]["kind"] != "failure":
                        journal.append("failure", "refine", "implementation", {"message": str(error), "error_type": type(error).__name__, "note": "Product packaging failed; earlier events retained."})
                finally:
                    with LOCK:
                        ACTIVE = None
            threading.Thread(target=work, daemon=True).start()
            self.send_json({"run_id": run_id}, 202)
        except (ValueError, TypeError, RuntimeError) as error:
            self.send_json({"error": str(error)}, 400)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8767)
    args = parser.parse_args()
    if not (REPO / "dist/lifecycle-lab/replay/index.html").is_file():
        parser.error("Build the Capability Matters site first: npm run build")
    print(f"Capability Lifecycle Lab: http://127.0.0.1:{args.port}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
