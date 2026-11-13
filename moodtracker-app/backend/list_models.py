"""Lists Gemini model ids for generateContent.  Run:  python list_models.py"""
import json, os, urllib.request
key = os.getenv("GEMINI_API_KEY")
if not key:
    raise SystemExit("Set GEMINI_API_KEY first.")
req = urllib.request.Request("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", headers={"x-goog-api-key": key})
with urllib.request.urlopen(req, timeout=20) as r:
    models = json.loads(r.read()).get("models", [])
for m in models:
    if "generateContent" in m.get("supportedGenerationMethods", []):
        print(m["name"].replace("models/", ""))
print("\nPick a 'flash' model, then set ASSISTANT_MODEL to it. Ids containing 'pro' are usually not free.")
