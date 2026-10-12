"""Offline loopback transport checks; never invokes a live model or a browser."""
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
from engine import SEED, verify


class LocalRunnerTests(unittest.TestCase):
    def test_explicit_domain_binding_and_invalid_profile(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(server, 'RUNS', Path(folder)), patch.object(server, 'ACTIVE', None):
            listener = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
            thread = threading.Thread(target=listener.serve_forever, daemon=True)
            thread.start()
            try:
                def post(profile):
                    connection = http.client.HTTPConnection('127.0.0.1', listener.server_port, timeout=5)
                    connection.request('POST', '/api/runs', json.dumps({'seed': SEED, 'provider': 'scripted', 'domain_profile': profile}), {'Content-Type': 'application/json', 'Origin': f'http://127.0.0.1:{listener.server_port}'})
                    response = connection.getresponse();result = response.status, json.loads(response.read());connection.close();return result
                status, body = post('implementation')
                self.assertEqual(status, 400)
                self.assertIn('Domain binding', body['error'])
                self.assertEqual(list(Path(folder).iterdir()), [])
                status, body = post('workforce-domain')
                self.assertEqual(status, 202)
                deadline = time.monotonic() + 5
                while server.ACTIVE and time.monotonic() < deadline:
                    time.sleep(.01)
                self.assertIsNone(server.ACTIVE)
                run = json.loads((Path(folder) / body['run_id'] / 'run.json').read_text())
                self.assertTrue(verify(run))
                self.assertEqual(run['role_profiles']['roles']['domain']['profile_id'], 'workforce-domain')
                self.assertEqual(run['events'][0]['payload']['role_profiles'], run['role_profiles'])
                self.assertEqual(run['events'][-1]['kind'], 'completed')
            finally:
                listener.shutdown();listener.server_close();thread.join(timeout=2)
