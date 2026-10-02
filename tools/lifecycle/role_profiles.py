"""Resolve versioned simulation profiles; targets never constitute performance evidence."""
import copy
import hashlib
import json
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
REGISTRY = REPO / "src/data/lifecycle/roles.json"
FRAMEWORK = REPO / "src/data/lifecycle/competencies.json"
FIELDS = {"abstract", "extends", "category", "name", "competency", "duties", "proficiency_targets"}

def content_hash(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()

def resolve_profile(registry, framework, profile_id):
    profiles = registry["profiles"]
    domains = {d["id"] for d in framework["domains"]}
    levels = set(framework["proficiencies"])
    def visit(key, stack):
        if key in stack:
            raise ValueError("Role inheritance cycle: " + " -> ".join([*stack, key]))
        if key not in profiles:
            raise ValueError("Unknown profile: " + key)
        raw = profiles[key]
        if not isinstance(raw, dict) or set(raw) - FIELDS:
            raise ValueError("Unknown profile fields; runtime authority is not inherited")
        result = visit(raw["extends"], [*stack, key]) if raw.get("extends") else {"duties": [], "proficiency_targets": {}, "lineage": []}
        result = copy.deepcopy(result)
        result["lineage"].append(key)
        result["abstract"] = raw.get("abstract", False)
        for field in ("name", "competency", "category"):
            if field in raw:
                if not isinstance(raw[field], str) or not raw[field].strip():
                    raise ValueError("Profile text must be nonempty")
                result[field] = raw[field]
        duties = raw.get("duties", [])
        if not isinstance(duties, list) or any(not isinstance(s, str) or not s.strip() for s in duties):
            raise ValueError("Duties must be text")
        result["duties"] = list(dict.fromkeys([*result["duties"], *duties]))
        targets = raw.get("proficiency_targets", {})
        if not isinstance(targets, dict) or any(k not in domains or v not in levels for k, v in targets.items()):
            raise ValueError("Unknown competency or proficiency target")
        result["proficiency_targets"].update(targets)
        result["profile_id"] = key
        result["demonstrated_proficiency"] = "unverified; requires reviewed task evidence"
        return result
    return visit(profile_id, [])

def load_contract(domain_profile=None):
    registry = json.loads(REGISTRY.read_text())
    framework = json.loads(FRAMEWORK.read_text())
    if registry["schema_version"] != 1 or framework["schema_version"] != 1 or registry["framework_version"] != framework["version"]:
        raise ValueError("Unsupported or mismatched role/framework versions")
    for key in registry["profiles"]:
        resolve_profile(registry, framework, key)
    roles = {key: resolve_profile(registry, framework, key) for key in registry["default_roles"]}
    if any(p["abstract"] for p in roles.values()):
        raise ValueError("An abstract profile cannot be assigned to a run")
    if domain_profile:
        domain = resolve_profile(registry, framework, domain_profile)
        if domain["category"] != "domain" or domain["abstract"]:
            raise ValueError("Domain binding requires a concrete domain profile")
        roles["domain"] = domain
    return {"registry_version": registry["version"], "framework_version": framework["version"],
            "registry_hash": content_hash(registry), "framework_hash": content_hash(framework),
            "framework": framework, "roles": roles,
            "claim": "Requested simulation proficiency; no demonstrated proficiency is inherited."}
