import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY = 'moodtracker_v1';
export const defaults = {
  entries: [], 
  consent: { wearable: false, assistant: false, adult: false },
  remind: null, 
  requests: [], 
  installId: '', 
};
export const newInstallId = () => 'i' + Math.random().toString(36).slice(2) + Date.now().toString(36);
export async function load() {
  let s = defaults;
  try { const r = await AsyncStorage.getItem(KEY); if (r) s = { ...defaults, ...JSON.parse(r) }; } catch {}
  if (!s.installId) { s = { ...s, installId: newInstallId() }; await save(s); }
  return s;
}
export async function save(s) { try { await AsyncStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
export async function wipe() { try { await AsyncStorage.removeItem(KEY); } catch {} return { ...defaults, installId: newInstallId() }; }
