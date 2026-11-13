import { Platform } from 'react-native';

let HC = null;
try { HC = require('react-native-health-connect'); } catch { HC = null; }

const PERMS = [
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRate' },
];
const NEEDS_BUILD = 'Watch data needs the development build on an Android phone. It does not work in Expo Go.';

export const wearablesSupported = () => Platform.OS === 'android' && !!HC;

export async function connectWearable() {
  if (!wearablesSupported()) return { ok: false, message: NEEDS_BUILD };
  try {
    const status = await HC.getSdkStatus();
    if (status !== HC.SdkAvailabilityStatus.SDK_AVAILABLE) {
      return { ok: false, message: 'Health Connect is missing or needs an update. Install or update it from Google Play, then try again.' };
    }
    await HC.initialize();
    const granted = await HC.requestPermission(PERMS);
    if (!granted || !granted.length) return { ok: false, message: 'No permission was given, so no watch data will be read.' };
    return { ok: true, message: 'Connected. Open the Trends tab to see your sleep and heart rate.' };
  } catch (e) {
    return { ok: false, message: 'Could not connect: ' + e.message };
  }
}

export async function openWearableSettings() {
  try { if (wearablesSupported()) HC.openHealthConnectSettings(); } catch {}
}

async function readAll(type, timeRangeFilter) {
  const out = [];
  let pageToken;
  for (let i = 0; i < 30; i++) { // safety cap
    const r = await HC.readRecords(type, { timeRangeFilter, pageSize: 1000, pageToken });
    out.push(...(r.records || []));
    pageToken = r.pageToken;
    if (!pageToken) break;
  }
  return out;
}

export async function getWearableSummary(days = 7) {
  if (!wearablesSupported()) return null;
  try {
    if (!(await HC.initialize())) return null;
    const granted = (await HC.getGrantedPermissions()) || [];
    const has = (t) => granted.some((p) => p.recordType === t);
    if (!has('SleepSession') && !has('HeartRate')) return null;
    const end = new Date();
    const range = { operator: 'between', startTime: new Date(end.getTime() - days * 864e5).toISOString(), endTime: end.toISOString() };
    let sleep = null, nights = 0, hr = null;
    if (has('SleepSession')) {
      const perDay = {};
      (await readAll('SleepSession', range)).forEach((s) => {
        const hours = (new Date(s.endTime) - new Date(s.startTime)) / 36e5;
        const day = new Date(s.endTime).toDateString();
        perDay[day] = (perDay[day] || 0) + hours;
      });
      const v = Object.values(perDay);
      nights = v.length;
      if (nights) sleep = Math.round((v.reduce((a, b) => a + b, 0) / nights) * 10) / 10;
    }
    if (has('HeartRate')) {
      let sum = 0, n = 0;
      (await readAll('HeartRate', range)).forEach((r) => (r.samples || []).forEach((p) => { sum += p.beatsPerMinute; n++; }));
      if (n) hr = Math.round(sum / n);
    }
    return { sleep, nights, hr };
  } catch {
    return null;
  }
}
