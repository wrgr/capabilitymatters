import copy
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from engine import Journal, SEED, execute, verify, WEB
from exemplar import ScriptedProvider
from product import product_files, zip_bytes
from role_profiles import load_contract, resolve_profile, REGISTRY, FRAMEWORK

class ProfileProductTests(unittest.TestCase):
    def setUp(self):
        self.registry = json.loads(REGISTRY.read_text())
        self.framework = json.loads(FRAMEWORK.read_text())

    def test_inherited_domain_retains_duties_and_unverified_status(self):
        profile = resolve_profile(self.registry, self.framework, "workforce-domain")
        self.assertEqual(profile["lineage"], ["contributor", "specialist", "domain", "workforce-domain"])
        self.assertEqual(profile["proficiency_targets"]["D4"], "awareness")
        self.assertIn("unverified", profile["demonstrated_proficiency"])
        profile["duties"].append("mutated")
        self.assertNotIn("mutated", resolve_profile(self.registry, self.framework, "domain")["duties"])

    def test_diverse_cases_bind_distinct_domain_duties_without_gaining_authority(self):
        for key, duty in [("school-science-domain", "grading"), ("library-access-domain", "passwords")]:
            profile = load_contract(key)["roles"]["domain"]
            self.assertEqual(profile["lineage"], ["contributor", "specialist", "domain", key])
            self.assertIn(duty, " ".join(profile["duties"]) + profile["competency"])
            self.assertIn("unverified", profile["demonstrated_proficiency"])
            self.assertIn("Preserve dissent", " ".join(profile["duties"]))

    def test_cycle_unknown_parent_target_and_authority_are_rejected(self):
        for field, value in [("extends", "missing"), ("extends", "workforce-domain"), ("proficiency_targets", {"D9": "applied"}), ("proficiency_targets", {"D1": "certified"}), ("permissions", ["approve_pilot"])]:
            registry = copy.deepcopy(self.registry)
            registry["profiles"]["workforce-domain"][field] = value
            with self.assertRaises(ValueError):
                resolve_profile(registry, self.framework, "workforce-domain")

    def test_domain_selection_pins_profile_and_metadata(self):
        contract = load_contract("workforce-domain")
        with tempfile.TemporaryDirectory() as folder:
            journal = Journal(Path(folder)/"run", dict(SEED), "scripted-simulation", role_profiles=contract)
            self.assertEqual(journal.run["role_profiles"]["roles"]["domain"]["profile_id"], "workforce-domain")
            self.assertTrue(verify(journal.run))
            bad = copy.deepcopy(journal.run)
            bad["role_profiles"]["registry_version"] = "altered"
            with self.assertRaisesRegex(ValueError, "Role profile"):
                verify(bad)
        with self.assertRaisesRegex(ValueError, "Domain binding"):
            load_contract("orchestrator")

    def test_legacy_journals_remain_valid_without_retroactive_targets(self):
        for name in ["exemplar.json", "live-exemplar.json"]:
            run = json.loads((WEB/name).read_text())
            self.assertTrue(verify(run))
            self.assertNotIn("role_profiles", run)

    def test_published_cases_keep_distinct_journals_and_product_evidence(self):
        catalog = json.loads((WEB.parent / "cases.json").read_text())["cases"]
        self.assertEqual({c["id"] for c in catalog}, {"workforce", "school-science", "library-access"})
        self.assertEqual(len({c["run_id"] for c in catalog}), 3)
        for case in catalog:
            run = json.loads((WEB / case["journal"]).read_text())
            self.assertTrue(verify(run))
            self.assertEqual(case["journal_sha256"], hashlib.sha256((WEB / case["journal"]).read_bytes()).hexdigest())
            self.assertEqual(case["head_hash"], run["events"][-1]["hash"])
            self.assertEqual(run["mode"], "live-codex")
            requests = [e for e in run["events"] if e["kind"] == "request"]
            self.assertEqual({e["agent"] for e in requests}, set(run["roster"]))
            self.assertEqual(case["counts"]["request"], len(requests))
            if case["domain_profile"]:
                self.assertEqual(run["role_profiles"]["roles"]["domain"]["profile_id"], case["domain_profile"])
                self.assertEqual(run["events"][0]["payload"]["role_profiles"], run["role_profiles"])
            product = WEB.parents[1] / case["product"].lstrip("/")
            with zipfile.ZipFile(product / "product.zip") as archive:
                self.assertEqual(json.loads(archive.read("project-journal.json")), run)
                manifest = json.loads(archive.read("manifest.json"))
                for name, expected in manifest["files"].items():
                    self.assertEqual(hashlib.sha256(archive.read(name)).hexdigest(), expected)
            if case["id"] != "workforce":
                self.assertIn("?case=" + case["id"], (product / "index.html").read_text())

    def test_product_archive_matches_source_and_requires_build(self):
        with tempfile.TemporaryDirectory() as folder:
            journal = Journal(Path(folder)/"run", dict(SEED), "scripted-simulation")
            with self.assertRaisesRegex(ValueError, "executable Build"):
                product_files(journal.run)
            run = execute(journal, ScriptedProvider())
            files = product_files(run)
            with zipfile.ZipFile(io.BytesIO(zip_bytes(run))) as archive:
                manifest = json.loads(archive.read("manifest.json"))
                self.assertEqual(manifest["release_state"], "candidate")
                self.assertEqual(manifest["run_head_hash"], run["events"][-1]["hash"])
                self.assertEqual(json.loads(archive.read("project-journal.json")), run)
                for name, expected in manifest["files"].items():
                    self.assertEqual(hashlib.sha256(archive.read(name)).hexdigest(), expected)
                self.assertIn("Content-Security-Policy", archive.read("candidate.html").decode())
            self.assertEqual(files["candidate.html"].count("Content-Security-Policy"), 1)

if __name__ == "__main__": unittest.main()
