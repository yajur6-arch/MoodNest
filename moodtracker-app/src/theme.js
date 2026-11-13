import { Platform, useColorScheme } from 'react-native';

const light = {
  paper: '#F4F3F7', surface: '#FFFFFF', sunk: '#ECEAF1',
  ink: '#1C1B24', ink2: '#5B5868', ink3: '#8B8896',
  border: '#E1DFE8', borderStrong: '#CFCCDA',
  accent: '#3D3570', accentStrong: '#2C2654', accentTint: '#ECE9F7', onAccent: '#F6F4FC',
  critical: '#d03b3b', criticalTint: '#FBE9E9',
  mood: ['#b7d3f6', '#6da7ec', '#2a78d6', '#1c5cab', '#104281'],
  cat: { Calm: '#2a78d6', Anxious: '#eb6834', Grateful: '#1baf7a', Tired: '#eda100', Hopeful: '#e87ba4', Overwhelmed: '#8e6bd1' },
};
const dark = {
  paper: '#15141B', surface: '#1D1C26', sunk: '#242231',
  ink: '#F2F0F6', ink2: '#A8A4B8', ink3: '#726E80',
  border: '#322F3D', borderStrong: '#413D4F',
  accent: '#A89FE6', accentStrong: '#C3BBF2', accentTint: '#2A2640', onAccent: '#17152A',
  critical: '#e66767', criticalTint: '#3a2226',
  mood: ['#2f4a6e', '#3b6aa3', '#3987e5', '#7db1f0', '#b9d6fa'], // dark mode: brighter = higher mood
  cat: { Calm: '#3987e5', Anxious: '#d95926', Grateful: '#199e70', Tired: '#c98500', Hopeful: '#d55181', Overwhelmed: '#9a7be0' },
};
export const useTheme = () => (useColorScheme() === 'dark' ? dark : light);

export const fonts = {
  display: Platform.select({ ios: 'Georgia', default: 'serif' }),
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
};
export const MOOD_LABELS = ['Very low', 'Low', 'Okay', 'Good', 'Great'];
export const EMOTIONS = ['Calm', 'Anxious', 'Grateful', 'Tired', 'Hopeful', 'Overwhelmed'];
