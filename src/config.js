export const HELPLINES = [
  { label: 'SADAG Mental Health Line · 24 h', display: '0800 21 22 23', tel: '0800212223' },
  { label: 'SADAG Suicide Crisis Line', display: '0800 567 567', tel: '0800567567' },
  { label: 'SMS SADAG', display: '31393', sms: '31393' },
  { label: 'Campus counselling centre (ADD NUMBER)', display: '', tel: '' },
];
export const EMERGENCY = '112';
export const TIPS = {
  low: ['Try a 10-minute walk outside, even around campus.', 'Message one friend or family member today.', 'Pick one small task and do just the first 15 minutes.'],
  ok: ['Keep a steady routine: regular meals, water and bedtime.', 'Take a 5-minute screen break between study blocks.'],
  good: ['Note what helped today so you can repeat it.', 'Check in with a friend who might be struggling.'],
};
export const PROMPTS = [
  "What's one thing that felt lighter today?",
  'What took most of your energy today?',
  'Who or what helped you get through today?',
  'What is one small thing you could do for yourself tomorrow?',
];

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.195:8000';
