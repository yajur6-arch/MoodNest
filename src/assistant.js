import { API_URL } from './config';

export const ASSISTANT_NOTICE =
  'I\'m an AI assistant, not a person or a counsellor. My replies are AI-generated and may be incomplete or wrong. I can\'t diagnose, give medical advice, or contact anyone for you. If you need a person, tap "Get support now".';

export const STARTERS = [
  { label: 'Guided check-in', text: "I'd like to do a guided check-in." },
  { label: 'Grounding exercise', text: 'Can you guide me through a grounding exercise?' },
  { label: 'Breathing exercise', text: 'Can you guide me through a breathing exercise?' },
  { label: 'Journaling prompt', text: 'Can I have a journaling prompt?' },
];

export const FALLBACK = 'I can\'t reply right now. If you need to talk to someone, tap "Get support now" to see people you can contact.';

export const newSessionId = () => 's' + Math.random().toString(36).slice(2) + Date.now().toString(36);

async function post(path, body, store, ms = 70000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(API_URL + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(store && store.installId ? { 'X-Install-Id': store.installId } : {}) },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!r.ok) throw new Error(String(r.status));
    return await r.json();
  } finally { clearTimeout(timer); }
}

export async function sendToAssistant(sessionId, chat, store) {
  const es = store.entries.slice(-7);
  const mood = es.length ? { avg_7d: Math.round((es.reduce((s, e) => s + e.mood, 0) / es.length) * 10) / 10, n: es.length } : null;
  try {
    const r = await post('/assistant/chat', {
      session_id: sessionId,
      messages: chat.slice(-12).map(({ role, text }) => ({ role, text })),
      mood_context: mood,
    }, store);
    if (typeof r.reply !== 'string' || !r.reply) throw new Error('Unexpected response (is API_URL pointing at the backend on port 8000?)');
    return { reply: r.reply, showSupport: !!r.show_support, eventId: r.event_id };
  } catch (e) {
    return { reply: FALLBACK + (__DEV__ ? `\n\n(Debug: ${e.name}: ${e.message} | ${API_URL})` : ''), showSupport: false, eventId: null };
  }
}

export async function ackHandoff(eventId, store) {
  if (!eventId) return;
  try { await post('/assistant/handoff', { event_id: eventId, shown: true }, store, 8000); } catch {}
}

export async function wakeBackend() {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 70000);
  try { await fetch(API_URL + '/health', { signal: ctl.signal }); } catch {} finally { clearTimeout(timer); }
}
