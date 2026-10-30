"""Exercise the GUI's local experiment transport using offline runs and a temporary record store."""
import http.client
import json
from pathlib import Path
import sys
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from engine import verify
from experiment_config import default_config
from experiment_runtime import create_experiment, execute_experiment, ExperimentRunError


class ExperimentApiTests(unittest.TestCase):
    """Check transport and provenance without invoking an authenticated model provider."""

    def setUp(self) -> None:
        """Start an ephemeral loopback service isolated from retained user runs."""
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.patch_root = patch.object(server, "RUNS", self.root)
        self.patch_active = patch.object(server, "ACTIVE", None)
        self.patch_root.start()
        self.patch_active.start()
        self.addCleanup(self.patch_root.stop)
        self.addCleanup(self.patch_active.stop)
        self.listener = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        self.thread = threading.Thread(target=self.listener.serve_forever, daemon=True)
        self.thread.start()
        self.addCleanup(self._stop)

    def _stop(self) -> None:
        self._wait()
        self.listener.shutdown()
        self.listener.server_close()
        self.thread.join(timeout=2)

    def _wait(self) -> None:
        deadline = time.monotonic() + 12
        while server.ACTIVE and time.monotonic() < deadline:
            time.sleep(.02)
        self.assertIsNone(server.ACTIVE, "The bounded offline task must terminate")

    def _request(self, method: str, path: str, body: dict | None = None, origin: bool = True) -> tuple[int, dict]:
        connection = http.client.HTTPConnection("127.0.0.1", self.listener.server_port, timeout=10)
        headers = {"Content-Type": "application/json"}
        if origin:
            headers["Origin"] = f"http://127.0.0.1:{self.listener.server_port}"
        connection.request(method, path, None if body is None else json.dumps(body), headers)
        response = connection.getresponse()
        result = response.status, json.loads(response.read())
        connection.close()
        return result

    def test_gui_config_and_run_preserve_exact_experiment(self) -> None:
        """Resolve and execute the exported GUI configuration through real HTTP endpoints."""
        status, catalog = self._request("GET", "/api/experiments/catalog")
        self.assertEqual(status, 200)
        config = catalog["default_config"]
        config["omit_competencies"] = ["measurement"]
        status, resolved = self._request("POST", "/api/experiments/resolve", {"config": config})
        self.assertEqual(status, 200)
        status, response = self._request("POST", "/api/experiments/runs", {"config": config})
        self.assertEqual(status, 202)
        self._wait()
        status, run = self._request("GET", "/api/runs/" + response["run_id"])
        self.assertEqual(status, 200)
        self.assertTrue(verify(run))
        self.assertEqual(run["experiment"]["config_hash"], resolved["config_hash"])
        self.assertEqual(run["events"][-1]["payload"]["status"], "dry_run_completed")
        self.assertEqual(len(self._request("GET", "/api/experiments/runs")[1]["runs"]), 1)

    def test_origins_validation_and_live_availability_are_explicit(self) -> None:
        """Reject untrusted origins, malformed configuration, and unavailable live execution."""
        config = default_config()
        self.assertEqual(self._request("POST", "/api/experiments/runs", {"config": config}, False)[0], 403)
        self.assertEqual(self._request("POST", "/api/experiments/resolve", {"config": {}})[0], 400)
        config["execution"].update(provider="codex", model="test-model")
        with patch("experiment_api.capabilities", return_value={"codex_installed": False, "live_enabled": False}):
            status, body = self._request("POST", "/api/experiments/runs", {"config": config})
        self.assertEqual(status, 400)
        self.assertIn("not installed", body["error"])
        self.assertEqual(list(self.root.iterdir()), [])

    def test_gui_batch_has_four_traceable_conditions(self) -> None:
        """Keep the four-condition comparison linked to independently verified run journals."""
        config = default_config()
        config["execution"]["repetitions"] = 1
        status, response = self._request("POST", "/api/experiments/batches", {"config": config, "matrix": True})
        self.assertEqual(status, 202)
        self._wait()
        status, batch = self._request("GET", "/api/experiments/batches/" + response["batch_id"])
        self.assertEqual(status, 200)
        self.assertEqual(batch["status"], "completed")
        self.assertEqual({row["condition"] for row in batch["runs"]}, {"A", "B", "C", "D"})
        self.assertEqual(len({row["run_id"] for row in batch["runs"]}), 4)
        for row in batch["runs"]:
            run = self._request("GET", "/api/runs/" + row["run_id"])[1]
            self.assertTrue(verify(run))
            self.assertEqual(run["events"][-1]["hash"], row["run_head_hash"])

    def test_cancel_only_targets_active_record(self) -> None:
        """Preserve a cancellation request without accepting arbitrary file paths or other records."""
        journal = create_experiment(default_config(), self.root)
        server.ACTIVE = journal.run["id"]
        try:
            self.assertEqual(self._request("POST", "/api/experiments/cancel", {"id": "../outside"})[0], 400)
            self.assertEqual(self._request("POST", "/api/experiments/cancel", {"id": "another-run"})[0], 409)
            self.assertEqual(self._request("POST", "/api/experiments/cancel", {"id": journal.run["id"]})[0], 202)
            with self.assertRaises(ExperimentRunError):
                execute_experiment(journal)
            self.assertEqual(journal.events[-1]["kind"], "cancelled")
            self.assertTrue(verify(journal.run))
        finally:
            server.ACTIVE = None


if __name__ == "__main__":
    unittest.main()
