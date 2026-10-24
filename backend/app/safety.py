import json, re, uuid
from datetime import datetime, timezone

CATEGORIES = {"none", "self_harm", "diagnosis_request", "medication_request", "out_of_scope"}


SELF_HARM_PATTERNS = [
    r"kill(ing)? myself", r"suicid", r"end(ing)? (my life|it all|things)", r"want(ed)? to die",
    r"don'?t want to (be here|live|exist|be alive)", r"(hurt|harm|cut)(ting)? myself", r"self[- ]?harm",
    r"better off without me", r"no reason to live", r"take my own life", r"not worth living", r"overdos",
]


def normalise(text: str) -> str:
    return text.lower().replace("\u2019", "'").replace("\u2018", "'")


def self_harm_backstop(text: str) -> bool:
    n = normalise(text)
    return any(re.search(p, n) for p in SELF_HARM_PATTERNS)


def parse_model_output(raw: str):
    """Return (reply, category) or raise ValueError. Callers must treat any error as a service failure."""
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        raise ValueError("no json object")
    data = json.loads(m.group(0))
    reply, cat = data.get("reply"), data.get("category")
    if cat not in CATEGORIES:
        raise ValueError("bad category")
    if not isinstance(reply, str) or not reply.strip():
        raise ValueError("empty reply")
    return reply.strip(), cat


def finalize(category: str, reply: str, templates: dict, helpline_block: str) -> str:
    if category == "self_harm":  # approved template only; model text is discarded
        return templates["self_harm"] + "\n\n" + helpline_block
    if category in ("diagnosis_request", "medication_request"):
        base = templates["diagnosis" if category == "diagnosis_request" else "medication"]
        return base + ("\n\n" + reply.strip() if reply.strip() else "")
    return reply.strip()


def normalise_history(msgs):
    """msgs: list of {'role','text'}. Drops leading assistant turns and merges consecutive same-role turns."""
    out = []
    for m in msgs:
        if not out and m["role"] != "user":
            continue
        if out and out[-1]["role"] == m["role"]:
            out[-1]["content"] += "\n" + m["text"]
        else:
            out.append({"role": m["role"], "content": m["text"]})
    return out


def with_mood_context(prompt: str, mood):
    if mood and mood.get("avg_7d") is not None and mood.get("n"):
        return prompt + f"\n\nContext: self-reported average mood {mood['avg_7d']}/5 over the last {mood['n']} check-ins."
    return prompt


def make_event(session_id: str, category: str, model_version: str, action: str) -> dict:
    """Minimal safety event: no message text, no user identifier."""
    return {
        "event_id": str(uuid.uuid4()), "session_id": session_id,
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "rule_category": category, "model_version": model_version,
        "action_taken": action, "handoff_succeeded": False,
    }
