import json, os, pathlib, re, urllib.error, urllib.request, uuid
from typing import List, Literal, Optional
from fastapi import FastAPI, Header, HTTPException, Request
from pydantic import BaseModel, Field
from .safety import (self_harm_backstop, parse_model_output, finalize, normalise_history,
                     with_mood_context, make_event)
from .events import log_event, mark_handoff
from .limits import Limiter

BASE = pathlib.Path(__file__).resolve().parent.parent
SYSTEM_PROMPT = (BASE / "prompts" / "system_prompt.md").read_text(encoding="utf-8")
TEMPLATES = json.loads((BASE / "templates.json").read_text(encoding="utf-8"))
# Gemini model id. Google retires models often, so check the current free-tier id with list_models.py.
MODEL = os.getenv("ASSISTANT_MODEL", "gemini-flash-latest")
# Optional second model, tried once if the first is overloaded or rate-limited. Leave empty to turn off.
# It must pass the same safety checks (tests/eval_model.py) as the main model.
FALLBACK_MODEL = os.getenv("ASSISTANT_FALLBACK_MODEL", "")
PROMPT_VERSION = "prompt-v0.1-draft"
MODEL_VERSION = f"{MODEL}/{PROMPT_VERSION}"
# VERIFY these numbers before any pilot.
HELPLINE_BLOCK = ("People you can contact right now:\n- SADAG Mental Health Line (24 h): 0800 21 22 23\n"
                  "- SADAG Suicide Crisis Line: 0800 567 567, or SMS 31393\n- " + os.getenv("CAMPUS_CONTACT", "Your campus counselling centre (add contact)") +
                  "\n- Emergency services: 112")
BUSY = ("The assistant is very busy right now because of high demand, so I can't reply at the moment. Please try again in a few minutes. "
        "If you need to talk to someone right now, tap \"Get support now\" to see people you can contact.")
RATE_MSG = ("You've reached the testing limit for now. Please try again later. "
            "If you need to talk to someone right now, tap \"Get support now\" to see people you can contact.")
LIMITER = Limiter(per_window=int(os.getenv("RATE_PER_10MIN", "30")), window_s=600,
                  per_day=int(os.getenv("RATE_PER_DAY", "100")), global_per_day=int(os.getenv("GLOBAL_PER_DAY", "400")))
FALLBACK = "I can't reply right now. If you need to talk to someone, tap \"Get support now\" to see people you can contact."

SHOW_DOCS = bool(os.getenv("SHOW_DOCS"))  
app = FastAPI(title="MoodTracker assistant service", docs_url="/docs" if SHOW_DOCS else None, redoc_url=None,
              openapi_url="/openapi.json" if SHOW_DOCS else None)  # do NOT enable request-body logging anywhere


class Msg(BaseModel):
    role: Literal["user", "assistant"]
    text: str = Field(max_length=2000)


class Mood(BaseModel):
    avg_7d: Optional[float] = None
    n: int = 0


class ChatIn(BaseModel):
    session_id: str = Field(min_length=8, max_length=64)  
    messages: List[Msg] = Field(min_length=1, max_length=40)
    mood_context: Optional[Mood] = None


class AckIn(BaseModel):
    event_id: str
    shown: bool


ID_RE = re.compile(r"[A-Za-z0-9_-]{16,64}")
IP_LIMITER = Limiter(per_window=int(os.getenv("IP_PER_10MIN", "60")), window_s=600,
                     per_day=int(os.getenv("IP_PER_DAY", "300")), global_per_day=10**9)


def client_ip(request):
    """Best effort: behind a proxy the real address is in a header. Not spoof-proof, so it is only one of several limits."""
    h = request.headers
    xff = h.get("x-forwarded-for", "")
    return h.get("cf-connecting-ip") or (xff.split(",")[0].strip() if xff else "") or (request.client.host if request.client else "") or "unknown"


class ModelBusy(RuntimeError):
    """The AI service is overloaded, rate-limited or too slow."""


def call_model(msgs, mood, model=None):
    """Calls the Gemini REST API (no extra library). Raises on any problem; run_turn turns that into the safe fallback."""
    key = os.getenv("GEMINI_API_KEY")
    if not key:
        raise RuntimeError("GEMINI_API_KEY is not set")
    body = {
        "systemInstruction": {"parts": [{"text": with_mood_context(SYSTEM_PROMPT, mood)}]},
        "contents": [{"role": "user" if m["role"] == "user" else "model", "parts": [{"text": m["content"]}]}
                     for m in normalise_history(msgs)],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048, "responseMimeType": "application/json"},
    }
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model or MODEL}:generateContent",
        data=json.dumps(body).encode("utf-8"), method="POST",
        headers={"Content-Type": "application/json", "x-goog-api-key": key})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            data = json.loads(r.read())
    except urllib.error.HTTPError as e:
        try:
            msg = json.loads(e.read()).get("error", {}).get("message", "")
        except Exception:
            msg = ""
        err = f"Gemini HTTP {e.code}: {msg[:300]}"
        raise (ModelBusy(err) if e.code in (429, 503) else RuntimeError(err))
    except (TimeoutError, urllib.error.URLError) as e:
        if isinstance(e, TimeoutError) or isinstance(getattr(e, "reason", None), TimeoutError):
            raise ModelBusy("Gemini request timed out")
        raise
    if not data.get("candidates"):
        raise RuntimeError("Gemini returned no answer (blocked?) " + str(data.get("promptFeedback", {}).get("blockReason", "")))
    cand = data["candidates"][0]
    reason = cand.get("finishReason")
    if reason not in (None, "STOP"):  
        raise RuntimeError(f"Gemini finish reason: {reason}")
    return "".join(p.get("text", "") for p in cand.get("content", {}).get("parts", []))


def run_turn(session_id, msgs, mood, install_key=None, ip_key=None):
    """msgs: list of {'role','text'}; last must be from the user."""
    if self_harm_backstop(msgs[-1]["text"]):
        ev = make_event(session_id, "self_harm", MODEL_VERSION, "template_backstop"); log_event(ev)
        return {"reply": finalize("self_harm", "", TEMPLATES, HELPLINE_BLOCK), "category": "self_harm", "show_support": True, "event_id": ev["event_id"]}
    if install_key is not None and not (LIMITER.allow(install_key) and (ip_key is None or IP_LIMITER.allow(ip_key))):
        return {"reply": RATE_MSG, "category": "rate_limited", "show_support": False, "event_id": None}
    used = MODEL
    try:
        try:
            raw = call_model(msgs[-12:], mood)
        except ModelBusy as e:
            if not FALLBACK_MODEL or FALLBACK_MODEL == MODEL:
                raise
            print("main model busy, trying fallback model:", str(e)[:200])
            used = FALLBACK_MODEL
            raw = call_model(msgs[-12:], mood, model=FALLBACK_MODEL)
        reply, cat = parse_model_output(raw)
    except ModelBusy as e:
        print("assistant model busy:", str(e)[:300])
        ev = make_event(session_id, "service_error", f"{used}/{PROMPT_VERSION}", "fallback_busy"); log_event(ev)
        return {"reply": BUSY, "category": "service_error", "show_support": False, "event_id": ev["event_id"]}
    except Exception as e:
        print("assistant model call failed:", str(e)[:300])  
        ev = make_event(session_id, "service_error", f"{used}/{PROMPT_VERSION}", "fallback_message"); log_event(ev)
        return {"reply": FALLBACK, "category": "service_error", "show_support": False, "event_id": ev["event_id"]}
    if cat == "none":
        return {"reply": reply, "category": "none", "show_support": False, "event_id": None}
    ev = make_event(session_id, cat, f"{used}/{PROMPT_VERSION}", "model_self_harm_handoff" if cat == "self_harm" else "model_refusal_redirect"); log_event(ev)
    return {"reply": finalize(cat, reply, TEMPLATES, HELPLINE_BLOCK), "category": cat, "show_support": cat == "self_harm", "event_id": ev["event_id"]}


@app.post("/assistant/chat")
def chat(body: ChatIn, request: Request, x_install_id: Optional[str] = Header(None)):
    msgs = [m.model_dump() for m in body.messages]
    if msgs[-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="last message must be from the user")
    ip = client_ip(request)
    install = x_install_id if x_install_id and ID_RE.fullmatch(x_install_id) else f"noid:{ip}"  
    return run_turn(body.session_id, msgs, body.mood_context.model_dump() if body.mood_context else None, install, ip)


@app.post("/assistant/handoff")
def handoff(body: AckIn, request: Request):
    try:
        uuid.UUID(body.event_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="bad event id")
    if not IP_LIMITER.allow("handoff:" + client_ip(request)):
        raise HTTPException(status_code=429, detail="slow down")
    mark_handoff(body.event_id, body.shown)
    return {"ok": True}


@app.get("/health")
def health():
    return {"ok": True}  
