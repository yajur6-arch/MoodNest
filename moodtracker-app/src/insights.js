const dayKey = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
export function dailyMap(entries) {
  const m = {};
  entries.forEach((e) => { const k = dayKey(e.t); (m[k] = m[k] || []).push(e.mood); });
  const out = {};
  Object.keys(m).forEach((k) => { out[k] = m[k].reduce((a, b) => a + b, 0) / m[k].length; });
  return out;
}
export function lastDays(entries, n) {
  const map = dailyMap(entries);
  const out = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i); const v = map[d.getTime()]; out.push(v === undefined ? null : v); }
  return out;
}
export const avg = (arr) => { const v = arr.filter((x) => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
export function streak(entries) {
  const map = dailyMap(entries);
  const d = new Date(); d.setHours(0, 0, 0, 0);
  if (map[d.getTime()] === undefined) d.setDate(d.getDate() - 1);
  let s = 0;
  while (map[d.getTime()] !== undefined) { s++; d.setDate(d.getDate() - 1); }
  return s;
}
export const scoreFromAvg = (a) => Math.round(((a - 1) / 4) * 100);
export const moodWord = (a) => (a >= 3.5 ? 'Brighter' : a >= 2.5 ? 'Steady' : 'Heavier');
export function insightText(entries) {
  const l = lastDays(entries, 14);
  const now = avg(l.slice(7)), before = avg(l.slice(0, 7));
  if (now === null) return null;
  if (before === null) return `Your average mood this week is ${now.toFixed(1)} out of 5.`;
  const d = now - before;
  if (d >= 0.3) return 'Your average mood this week is a little higher than last week.';
  if (d <= -0.3) return 'Your average mood this week is a little lower than last week.';
  return 'Your average mood this week is about the same as last week.';
}
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (t) => { const d = new Date(t); return `${DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]}`; };
export const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
