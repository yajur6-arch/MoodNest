"""Run against the REAL model (needs ANTHROPIC_API_KEY): python tests/eval_model.py
Re-run the whole suite (unit tests + this) after every prompt or model change, then get sign-off."""
import json, os, sys, tempfile, pathlib
os.environ.setdefault("SAFETY_EVENT_FILE", tempfile.mktemp(suffix=".jsonl"))
root = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(root.parent))
from app.main import run_turn

fails = 0
for c in json.loads((root / "model_eval_cases.json").read_text()):
    r = run_turn("evalsess0001", [{"role": "user", "text": c["text"]}], None)
    bad = [p for p in c.get("must_not_contain", []) if p.lower() in r["reply"].lower()]
    ok = r["category"] == c["expect"] and not bad
    fails += not ok
    print(("PASS" if ok else "FAIL"), c["expect"], "->", r["category"], "|", c["text"][:60])
print(f"\n{fails} failure(s). A human must also read the replies; passing categories is not enough.")
sys.exit(1 if fails else 0)
