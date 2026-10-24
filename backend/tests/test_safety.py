import os, sys, json, tempfile, unittest, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from app.safety import *
from app.limits import Limiter

T = json.loads((pathlib.Path(__file__).resolve().parent.parent / "templates.json").read_text())
HL = "HELPLINES"


class Backstop(unittest.TestCase):
    def test_triggers(self):
        for s in ["I want to kill myself", "I don\u2019t want to be here anymore", "thinking of ending it all", "I've been cutting myself",
                  "SUICIDAL thoughts again", "everyone is better off without me", "I want to die", "I took an overdose"]:
            self.assertTrue(self_harm_backstop(s), s)

    def test_no_false_trigger_on_everyday_text(self):
        for s in ["I'm tired after exams", "I killed it in my presentation", "this deadline is killing me", "can we do a breathing exercise?"]:
            self.assertFalse(self_harm_backstop(s), s)


class Parsing(unittest.TestCase):
    def test_ok_and_fenced(self):
        self.assertEqual(parse_model_output('{"category":"none","reply":" Hi "}'), ("Hi", "none"))
        self.assertEqual(parse_model_output('```json\n{"category":"out_of_scope","reply":"x"}\n```')[1], "out_of_scope")

    def test_category_is_case_insensitive(self):
        self.assertEqual(parse_model_output('{"category":" None ","reply":"x"}'), ("x", "none"))

    def test_failures_raise(self):
        for raw in ["plain text", '{"category":"weird","reply":"x"}', '{"category":"none","reply":""}', '{"reply":"x"}', "{bad json}"]:
            with self.assertRaises(Exception, msg=raw):
                parse_model_output(raw)


class Finalize(unittest.TestCase):
    def test_self_harm_uses_template_and_helplines_only(self):
        r = finalize("self_harm", "model text should be dropped", T, HL)
        self.assertTrue(r.startswith(T["self_harm"])); self.assertTrue(r.endswith(HL)); self.assertNotIn("model text", r)

    def test_refusals_start_with_approved_template(self):
        self.assertTrue(finalize("diagnosis_request", "Want a check-in?", T, HL).startswith(T["diagnosis"]))
        self.assertTrue(finalize("medication_request", "", T, HL) == T["medication"])

    def test_none_passthrough(self):
        self.assertEqual(finalize("none", " hi ", T, HL), "hi")


class History(unittest.TestCase):
    def test_drops_leading_assistant_and_merges(self):
        h = normalise_history([{"role": "assistant", "text": "a"}, {"role": "user", "text": "1"}, {"role": "user", "text": "2"}, {"role": "assistant", "text": "3"}])
        self.assertEqual(h, [{"role": "user", "content": "1\n2"}, {"role": "assistant", "content": "3"}])


class Events(unittest.TestCase):
    def test_event_has_no_content_fields(self):
        ev = make_event("sess12345", "self_harm", "m/v", "template_backstop")
        self.assertEqual(set(ev), {"event_id", "session_id", "occurred_at", "rule_category", "model_version", "action_taken", "handoff_succeeded"})
        self.assertFalse(ev["handoff_succeeded"])


class Limits(unittest.TestCase):
    def test_window_daily_and_global_limits(self):
        now = [0.0]
        lim = Limiter(per_window=2, window_s=600, per_day=3, global_per_day=4, clock=lambda: now[0])
        self.assertTrue(lim.allow("a")); self.assertTrue(lim.allow("a")); self.assertFalse(lim.allow("a"))  # 2 per 10 min
        now[0] = 700
        self.assertTrue(lim.allow("a")); self.assertFalse(lim.allow("a"))                                  # 3 per day
        self.assertTrue(lim.allow("b")); self.assertFalse(lim.allow("c"))                                  # 4 per day overall
        now[0] = 90000
        self.assertTrue(lim.allow("a"))                                                                    # a new day


class Turns(unittest.TestCase):
    """Runs the full turn logic with a fake model."""
    def setUp(self):
        self.tmp = tempfile.mktemp(suffix=".jsonl"); os.environ["SAFETY_EVENT_FILE"] = self.tmp
        os.environ.pop("DATABASE_URL", None)
        try:
            from app import main
        except Exception:
            self.skipTest("fastapi/pydantic not installed")
        self.main = main

    def run_with(self, raw, text):
        def fake(msgs, mood, model=None):
            r = raw(model) if callable(raw) else raw
            if isinstance(r, Exception): raise r
            return r
        self.main.call_model = fake
        return self.main.run_turn("sess12345", [{"role": "user", "text": text}], None)

    def events(self):
        return [json.loads(l) for l in open(self.tmp)] if os.path.exists(self.tmp) else []

    def test_backstop_never_calls_model_and_logs(self):
        r = self.run_with(RuntimeError("model must not be called"), "I want to die")
        self.assertEqual(r["category"], "self_harm"); self.assertTrue(r["show_support"]); self.assertIn("0800 567 567", r["reply"])
        self.assertEqual(self.events()[0]["action_taken"], "template_backstop")

    def test_model_failure_gives_fallback_and_logs(self):
        r = self.run_with(RuntimeError("boom"), "hello")
        self.assertEqual(r["category"], "service_error"); self.assertIn("Get support now", r["reply"])
        self.assertEqual(self.events()[0]["rule_category"], "service_error")

    def test_busy_model_gives_high_load_message(self):
        r = self.run_with(self.main.ModelBusy("503"), "hello")
        self.assertIn("very busy", r["reply"]); self.assertIn("Get support now", r["reply"])
        self.assertEqual(self.events()[0]["action_taken"], "fallback_busy")

    def test_fallback_model_used_when_main_is_busy(self):
        self.main.FALLBACK_MODEL = "backup-model"
        try:
            r = self.run_with(lambda model: '{"category":"none","reply":"from backup"}' if model == "backup-model" else self.main.ModelBusy("503"), "hello")
            self.assertEqual(r["reply"], "from backup")
        finally:
            self.main.FALLBACK_MODEL = ""

    def test_busy_message_when_both_models_busy(self):
        self.main.FALLBACK_MODEL = "backup-model"
        try:
            r = self.run_with(self.main.ModelBusy("503"), "hello")
            self.assertIn("very busy", r["reply"]); self.assertIn("backup-model", self.events()[0]["model_version"])
        finally:
            self.main.FALLBACK_MODEL = ""

    def test_client_ip_and_install_id(self):
        class R:
            def __init__(s, h, host=None):
                s.headers = h; s.client = type("C", (), {"host": host})() if host else None
        self.assertEqual(self.main.client_ip(R({"cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2"})), "1.1.1.1")
        self.assertEqual(self.main.client_ip(R({"x-forwarded-for": "3.3.3.3, 10.0.0.1"})), "3.3.3.3")
        self.assertEqual(self.main.client_ip(R({}, "4.4.4.4")), "4.4.4.4")
        self.assertEqual(self.main.client_ip(R({})), "unknown")
        self.assertTrue(self.main.ID_RE.fullmatch("iabcdefghij1234567890"))
        self.assertFalse(self.main.ID_RE.fullmatch("short"))

    def test_rate_limit_blocks_model_but_not_self_harm_help(self):
        self.main.LIMITER = Limiter(per_window=1)
        ok = '{"category":"none","reply":"hi"}'
        self.main.call_model = lambda msgs, mood, model=None: ok
        first = self.main.run_turn("sess12345", [{"role": "user", "text": "hello"}], None, "tok2", "9.9.9.9")
        self.assertEqual(first["reply"], "hi")
        second = self.main.run_turn("sess12345", [{"role": "user", "text": "hello again"}], None, "tok2", "9.9.9.9")
        self.assertEqual(second["category"], "rate_limited")
        crisis = self.main.run_turn("sess12345", [{"role": "user", "text": "I want to die"}], None, "tok2", "9.9.9.9")
        self.assertTrue(crisis["show_support"]); self.assertIn("0800 567 567", crisis["reply"])

    def test_self_harm_still_gets_template_when_model_is_busy(self):
        r = self.run_with(self.main.ModelBusy("503"), "I want to die")
        self.assertTrue(r["show_support"]); self.assertIn("0800 567 567", r["reply"])

    def test_model_flags_self_harm_the_backstop_missed(self):
        r = self.run_with('{"category":"self_harm","reply":"x"}', "I just can't keep going like this")
        self.assertTrue(r["show_support"]); self.assertTrue(r["reply"].startswith(self.main.TEMPLATES["self_harm"]))

    def test_none_logs_nothing(self):
        r = self.run_with('{"category":"none","reply":"How are you feeling?"}', "hi")
        self.assertEqual(r["reply"], "How are you feeling?"); self.assertEqual(self.events(), [])

    def test_no_message_text_in_event_log(self):
        self.run_with('{"category":"medication_request","reply":"ok"}', "should I stop my sertraline-secret-text")
        self.assertNotIn("secret-text", open(self.tmp).read())


if __name__ == "__main__":
    unittest.main()
