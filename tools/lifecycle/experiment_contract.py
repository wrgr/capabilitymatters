"""Define a versioned typed agent interface so persona instructions and execution records stay inspectable."""
from __future__ import annotations

import copy
from decimal import Decimal
import math
from typing import Any

from engine import SCHEMA, STAGES, digest, validate_response

CONTRACT_VERSION = "1.0.0"
CONTEXT_POLICY = {"recent_turns": 10, "turn_body_chars": 1800, "artifact_body_chars": 9000,
                  "prototype_chars": 12000, "future_challenges": "withheld"}
PROFILE_FIELDS = ("name", "functional_role", "competency", "duties", "behavior_instructions",
                  "authority_instruction", "integration_instruction")
STOPPING_CONDITIONS = ["The configured stage schedule is exhausted.", "The call bound is reached.",
                       "A response fails validation or the provider fails.", "Cancellation is observed between calls."]
INPUT_NAMES = ["actor_name", "stage", "turn_kind", "assigned_instructions", "case_brief", "environment",
               "working_conditions", "arrived_challenges", "visible_artifacts", "prior_contributions",
               "prior_assessments", "simulation_conditions", "limits", "context_policy"]
SOURCES = [
    {"title": "DSPy: typed signatures", "url": "https://dspy.ai/3.1.3/learn/programming/signatures/"},
    {"title": "JSON Schema: object contracts", "url": "https://json-schema.org/understanding-json-schema/reference/object"},
    {"title": "A2A: agent identity and capability metadata", "url": "https://a2a-protocol.org/latest/specification/"},
    {"title": "Anthropic: outcome evaluation", "url": "https://www.anthropic.com/research/demystifying-evals-for-ai-agents"},
]


def _object_schema(properties: dict, required: list[str] | None = None) -> dict:
    return {"type": "object", "properties": properties, "required": list(properties) if required is None else required,
            "additionalProperties": False}


def input_schema() -> dict:
    """Describe the bounded model input separately from audit-only identities and study labels."""
    text = {"type": "string"}
    instructions = {key: {"type": "array", "items": text} if key in ("duties", "behavior_instructions") else text
                    for key in PROFILE_FIELDS}
    properties = {
        "actor_name": text, "stage": {"type": "string", "enum": STAGES},
        "turn_kind": {"type": "string", "enum": ["contribution", "decision"]},
        "assigned_instructions": _object_schema(instructions, []),
        "case_brief": _object_schema({key: text for key in ("title", "idea", "domain", "people", "constraints")}),
        "environment": _object_schema({"time_pressure": text, "resources": text,
                                        "constraints": {"type": "array", "items": text}}),
        "working_conditions": text,
        "arrived_challenges": {"type": "array", "items": {"type": "object"}},
        "visible_artifacts": {"type": "object"},
        "prior_contributions": {"type": "array", "items": {"type": "object"}},
        "prior_assessments": {"type": "array", "items": {"type": "object"}},
        "simulation_conditions": {"anyOf": [{"type": "null"}, {"type": "object"}]},
        "limits": _object_schema({"max_output_chars": {"type": "integer", "minimum": 1000},
                                    "prior_event_sequences": {"type": "array", "items": {"type": "integer"}}}),
        "context_policy": {"type": "object"},
    }
    return _object_schema(properties)


def output_schema(config_version: int = 2) -> dict:
    """Preserve legacy responses and add a typed declared design only for version-two experiments."""
    schema = copy.deepcopy(SCHEMA)
    if config_version >= 2:
        from experiment_outcomes import design_schema
        schema["properties"]["design"] = {"anyOf": [{"type": "null"}, design_schema()]}
        schema["required"].append("design")
    return schema


def agent_contract(config_version: int = 2) -> dict:
    """Return the common typed interface and its explicit execution and evidence boundaries."""
    outputs = list(output_schema(config_version)["required"])
    return {
        "id": "agent-turn", "version": CONTRACT_VERSION, "config_version": config_version,
        "signature": {"inputs": list(INPUT_NAMES), "outputs": outputs,
                      "notation": "case_brief, stage, effective_instructions, visible_context -> contribution_or_decision, evidence_refs, artifact" + (", declared_design" if config_version >= 2 else "")},
        "input_schema": input_schema(), "output_schema": output_schema(config_version),
        "context_policy": copy.deepcopy(CONTEXT_POLICY),
        "tool_policy": {"requested_tools": [], "file_writes": "not permitted by the CLI read-only sandbox",
                        "enforcement": "Instructions request no tool use. The provider's read-only sandbox is not an attestation that no tools were invoked."},
        "evidence_policy": "Cite earlier event sequences; distinguish proposals, authored fixtures, simulated consequences, and observed evidence.",
        "stopping_conditions": list(STOPPING_CONDITIONS), "sources": copy.deepcopy(SOURCES),
        "scope": "An application-level execution contract informed by typed signatures and Agent Card metadata. Not A2A protocol compliance, a cryptographic signature, or verified human proficiency.",
    }


def _agent_spec(profile: dict, slots: list[dict], contract: dict, contract_hash: str) -> dict:
    spec = {
        "schema_version": 1,
        "identity": {"actor_id": profile["actor_id"], "display_name": profile["name"],
                     "persona_ref": copy.deepcopy(profile.get("persona_ref"))},
        "purpose": {"role": profile["functional_role"], "objective": profile["competency"]},
        "competencies": list(profile["competency_ids"]), "effective_duties": list(profile["duties"]),
        "behavior": copy.deepcopy(profile["behavior"]),
        "authority": {"level": profile["authority"], "instruction": profile["authority_instruction"],
                      "requested_tools": [], "real_world_authorization": False},
        "execution": {"stages": list(dict.fromkeys(slot["stage"] for slot in slots)),
                      "turn_kinds": list(dict.fromkeys(slot["kind"] for slot in slots)),
                      "contract_version": contract["version"], "context_policy": copy.deepcopy(CONTEXT_POLICY),
                      "stopping_conditions": list(STOPPING_CONDITIONS)},
        "signature": copy.deepcopy(contract["signature"]), "contract_hash": contract_hash,
    }
    spec["spec_hash"] = digest(spec)
    return spec


def standardize_contract(role_contract: dict, config: dict, execution_plan: list[dict]) -> dict:
    """Pin the common interface and each effective agent specification to the resolved plan."""
    contract = agent_contract(config["schema_version"])
    contract_hash = digest(contract)
    specs = {key: _agent_spec(profile, [slot for slot in execution_plan if slot["profile_key"] == key], contract, contract_hash)
             for key, profile in role_contract["roles"].items()}
    return {"agent_contract": contract, "agent_contract_hash": contract_hash,
            "agent_specs": specs, "agent_specs_hash": digest(specs)}


def _validate_shape(value: Any, schema: dict, path: str) -> None:
    if "anyOf" in schema:
        errors = []
        for option in schema["anyOf"]:
            try:
                _validate_shape(value, option, path)
                return
            except ValueError as error:
                errors.append(str(error))
        raise ValueError(f"{path} does not match an allowed type: {'; '.join(errors)}")
    kind = schema.get("type")
    valid = {"object": isinstance(value, dict), "array": isinstance(value, list), "string": isinstance(value, str),
             "integer": type(value) is int, "number": type(value) in (int, float) and math.isfinite(value),
             "boolean": type(value) is bool, "null": value is None}.get(kind, True)
    if not valid or ("enum" in schema and value not in schema["enum"]):
        raise ValueError(f"Invalid {path}; expected {kind}")
    if kind in ("integer", "number"):
        if value < schema.get("minimum", value) or value > schema.get("maximum", value):
            raise ValueError(f"{path} exceeds its numeric bounds")
        if "multipleOf" in schema and Decimal(str(value)) % Decimal(str(schema["multipleOf"])):
            raise ValueError(f"{path} exceeds the declared numeric precision")
    if kind == "string" and not schema.get("minLength", 0) <= len(value) <= schema.get("maxLength", len(value)):
        raise ValueError(f"{path} exceeds its text bounds")
    if kind == "object":
        properties = schema.get("properties", {})
        if set(schema.get("required", [])) - set(value):
            raise ValueError(f"Missing fields in {path}")
        if schema.get("additionalProperties") is False and set(value) - set(properties):
            raise ValueError(f"Unexpected fields in {path}")
        for key, item in value.items():
            if key in properties:
                _validate_shape(item, properties[key], path + "." + key)
    if kind == "array":
        for index, item in enumerate(value):
            _validate_shape(item, schema.get("items", {}), f"{path}[{index}]")


def validate_turn_input(value: dict) -> dict:
    """Enforce the subset of JSON Schema used by the declared model-input contract."""
    _validate_shape(value, input_schema(), "agent input")
    return value


def validate_experiment_response(response: Any, max_seq: int, config_version: int = 2,
                                 stage: str | None = None, kind: str | None = None) -> dict:
    """Check the typed response and keep declared design decisions distinct from outcome judgments."""
    if config_version < 2:
        return validate_response(response, max_seq)
    if not isinstance(response, dict) or set(response) != set(SCHEMA["required"]) | {"design"}:
        raise ValueError("Provider response does not match agent-turn contract version two")
    validate_response({key: value for key, value in response.items() if key != "design"}, max_seq)
    design = response["design"]
    accepted = copy.deepcopy(response)
    if design is not None:
        from experiment_outcomes import validate_design
        accepted["design"] = validate_design(design)
    if stage is not None and kind is not None:
        expected = stage == "build" and kind == "decision"
        if expected and design is None:
            raise ValueError("Build decision requires a typed declared design for independent simulation")
        if not expected and design is not None:
            raise ValueError("Declared design belongs only to the Build decision")
    return accepted


def validate_recorded_response(response: dict, max_seq: int, experiment: dict, stage: str, kind: str) -> None:
    """Validate historical output against its pinned schema instead of silently substituting a newer contract."""
    schema = experiment.get("agent_contract", {}).get("output_schema")
    if not schema:
        validate_experiment_response(response, max_seq, experiment["config"]["schema_version"], stage, kind)
        return
    _validate_shape(response, schema, "recorded response")
    validate_response({key: response[key] for key in SCHEMA["required"]}, max_seq)
    if "design" in schema.get("properties", {}):
        design = response["design"]
        if (stage == "build" and kind == "decision") != (design is not None):
            raise ValueError("Recorded design does not match its Build-decision slot")
        if design and design.get("model_applicability") == "outside_scope" and not design.get("scope_rationale", "").strip():
            raise ValueError("An outside-model claim requires its recorded rationale")


def _verify_request(event: dict, experiment: dict) -> None:
    payload = event["payload"]
    validate_turn_input(payload["input"])
    if digest(payload["input"]) != payload.get("input_hash"):
        raise ValueError("Agent input differs from its retained hash")
    if payload.get("contract_hash") != experiment.get("agent_contract_hash"):
        raise ValueError("Agent request references a different execution contract")
    spec = experiment["agent_specs"].get(payload.get("profile_key"))
    if not spec or spec["spec_hash"] != payload.get("agent_spec_hash"):
        raise ValueError("Agent request references a different agent specification")
    slot = next((item for item in experiment["execution_plan"] if item["slot_id"] == payload.get("slot_id")), None)
    if not slot or any(payload.get(key) != slot[key] for key in ("profile_key", "actor_id", "source_actor_id")):
        raise ValueError("Agent request does not match its pinned execution slot")
    if event["stage"] != slot["stage"] or payload["input"]["turn_kind"] != slot["kind"]:
        raise ValueError("Agent request changed its scheduled task")
    if experiment["config"]["schema_version"] >= 2 and event["agent"] != slot["actor_id"]:
        raise ValueError("Agent request changed its executing identity")


def _verify_outcome(event: dict, previous_events: list[dict], experiment: dict) -> None:
    payload = event["payload"]
    if payload.get("model_hash") != experiment.get("outcome_model_hash"):
        raise ValueError("Outcome assessment references a different pinned model")
    if digest(payload.get("assumptions")) != payload.get("assumption_hash"):
        raise ValueError("Outcome assessment assumptions differ from their hash")
    for dimension in payload.get("dimensions", {}).values():
        for reference in dimension.get("evidence_refs", []):
            seq = reference.get("event_seq")
            if type(seq) is not int or not 1 <= seq <= len(previous_events):
                raise ValueError("Outcome evidence must refer to an earlier event")
            earlier = previous_events[seq - 1]
            if earlier["hash"] != reference.get("event_hash"):
                raise ValueError("Outcome evidence hash differs from the cited event")
            if "artifact_hash" in reference and earlier["payload"].get("content_hash") != reference["artifact_hash"]:
                raise ValueError("Outcome evidence references a different artifact")


def verify_experiment_extension(run: dict) -> None:
    """Verify pinned contracts and input receipts without recompiling a historic configuration."""
    experiment = run.get("experiment", {})
    for content, hashed in (("agent_contract", "agent_contract_hash"), ("agent_specs", "agent_specs_hash"),
                            ("execution_plan", "execution_plan_hash"), ("outcome_model", "outcome_model_hash")):
        if content in experiment and digest(experiment[content]) != experiment.get(hashed):
            raise ValueError(f"Experiment {content} hash differs from its pinned content")
    for spec in experiment.get("agent_specs", {}).values():
        if digest({key: value for key, value in spec.items() if key != "spec_hash"}) != spec.get("spec_hash"):
            raise ValueError("Agent specification differs from its individual content hash")
    for index, event in enumerate(run["events"]):
        if event["kind"] == "request" and "input" in event["payload"]:
            _verify_request(event, experiment)
        if event["kind"] == "outcome_assessment":
            _verify_outcome(event, run["events"][:index], experiment)
