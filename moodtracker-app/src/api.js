const NEG = 'sad hopeless empty alone lonely exhausted tired anxious stressed overwhelmed panic failing failed worthless cry crying angry numb afraid scared behind pressure deadline'.split(' ');
const POS = 'happy good great calm proud excited grateful hopeful relaxed rested fun better love enjoyed laughed motivated'.split(' ');
export async function analyseSentiment(text) {
  const w = text.toLowerCase().match(/[a-z']+/g) || [];
  let s = 0; w.forEach((x) => { if (POS.includes(x)) s++; if (NEG.includes(x)) s--; });
  return s < 0 ? 'negative' : s > 0 ? 'positive' : 'neutral';
}
export const SENTIMENT_TAG = { negative: 'Feeling heavy', neutral: 'Steady', positive: 'Feeling lifted' };

export async function sendSupportRequest(store) {
  const req = { id: String(Date.now()), t: Date.now(), status: 'open' };
  return { ...store, requests: [...store.requests, req] };
}
