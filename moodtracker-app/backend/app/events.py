"""Safety-event storage. Writes only the minimal event; never message content."""
import json, os
from datetime import datetime, timezone


def _file():
    return os.getenv("SAFETY_EVENT_FILE", "safety_events.jsonl")


def log_event(ev: dict):
    print("SAFETY_EVENT " + json.dumps(ev))  
    try:
        url = os.getenv("DATABASE_URL")
        if url:
            import psycopg
            with psycopg.connect(url) as c:
                c.execute(
                    "insert into safety_events(event_id,session_id,occurred_at,rule_category,model_version,action_taken,handoff_succeeded)"
                    " values (%s,%s,%s,%s,%s,%s,%s)",
                    (ev["event_id"], ev["session_id"], ev["occurred_at"], ev["rule_category"], ev["model_version"], ev["action_taken"], ev["handoff_succeeded"]))
        else:
            with open(_file(), "a", encoding="utf-8") as f:
                f.write(json.dumps(ev) + "\n")
    except Exception:
        print("safety event logging failed")  


def mark_handoff(event_id: str, ok: bool):
    print("SAFETY_HANDOFF " + json.dumps({"event_id": event_id, "handoff_succeeded": ok}))
    try:
        url = os.getenv("DATABASE_URL")
        if url:
            import psycopg
            with psycopg.connect(url) as c:
                c.execute("update safety_events set handoff_succeeded=%s where event_id=%s", (ok, event_id))
        else:
            with open(_file(), "a", encoding="utf-8") as f:
                f.write(json.dumps({"event_id": event_id, "handoff_succeeded": ok, "updated_at": datetime.now(timezone.utc).isoformat()}) + "\n")
    except Exception:
        print("handoff update failed")
