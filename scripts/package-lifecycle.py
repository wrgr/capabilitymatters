"""Build the public role contract and exemplar product from versioned source."""
import json
from pathlib import Path
import sys

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "tools/lifecycle"))
from engine import WEB
from package_exemplar import package
from product import write_product
from role_profiles import load_contract, resolve_profile, REGISTRY, FRAMEWORK

contract = load_contract()
registry, framework = json.loads(REGISTRY.read_text()), json.loads(FRAMEWORK.read_text())
contract["available_domain_profiles"] = {key: resolve_profile(registry, framework, key) for key, value in registry["profiles"].items() if value.get("category") == "domain"}
text = json.dumps(contract, indent=2, ensure_ascii=False) + "\n"
(REPO / "src/data/lifecycle/resolved-roles.json").write_text(text)
(WEB.parent / "roles.json").write_text(text)
for name in ("exemplar.json", "live-exemplar.json"):
    package(WEB / name)
run = json.loads((WEB / "live-exemplar.json").read_text())
write_product(run, WEB.parent / "product")
print("Lifecycle role contract, saved candidates and portable product packaged.")
