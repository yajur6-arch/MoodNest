import React from 'react';
import { View, Text, Pressable, Modal, Linking, ScrollView } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SText } from 'react-native-svg';
import { useTheme, fonts, MOOD_LABELS } from './theme';
import { HELPLINES, EMERGENCY } from './config';

export const Title = ({ children, size = 26 }) => {
  const t = useTheme();
  return <Text accessibilityRole="header" style={{ color: t.ink, fontFamily: fonts.display, fontStyle: 'italic', fontSize: size, lineHeight: size * 1.25 }}>{children}</Text>;
};
export const Label = ({ children }) => {
  const t = useTheme();
  return <Text style={{ color: t.ink3, fontSize: 11, letterSpacing: 0.9, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 }}>{children}</Text>;
};
export const P = ({ children, mut, small, style }) => {
  const t = useTheme();
  return <Text style={[{ color: small ? t.ink3 : mut ? t.ink2 : t.ink, fontSize: small ? 12.5 : 15, lineHeight: small ? 18 : 22, marginBottom: 6 }, style]}>{children}</Text>;
};
export const Mono = ({ children, style }) => {
  const t = useTheme();
  return <Text style={[{ color: t.ink, fontFamily: fonts.mono, fontSize: 13 }, style]}>{children}</Text>;
};
export const Card = ({ children, style, tint }) => {
  const t = useTheme();
  return <View style={[{ backgroundColor: tint ? t.accentTint : t.sunk, borderColor: tint ? t.borderStrong : t.border, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 }, style]}>{children}</View>;
};
export const Btn = ({ title, onPress, kind = 'primary', full, style }) => {
  const t = useTheme();
  const k = { primary: [t.accent, 'transparent', t.onAccent], secondary: [t.sunk, t.border, t.ink], ghost: ['transparent', t.border, t.ink2] }[kind];
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={[{ backgroundColor: k[0], borderColor: k[1], borderWidth: 1, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 18, alignSelf: full ? 'stretch' : 'flex-start', alignItems: 'center' }, style]}>
      <Text style={{ color: k[2], fontWeight: '600', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
};
export const Chip = ({ label, dot, selected, onPress }) => {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!selected }} onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: selected ? t.accent : t.border, backgroundColor: selected ? t.accent : t.surface }}>
      {dot ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selected ? t.onAccent : dot }} /> : null}
      <Text style={{ fontSize: 13, fontWeight: '600', color: selected ? t.onAccent : t.ink }}>{label}</Text>
    </Pressable>
  );
};
export const ChipRow = ({ children }) => <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
export const SupportPill = ({ onPress }) => {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Get support now" onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: t.critical, backgroundColor: t.criticalTint }}>
      <Text style={{ color: t.critical, fontSize: 13 }}>☎</Text>
      <Text style={{ color: t.critical, fontSize: 13, fontWeight: '700' }}>Support</Text>
    </Pressable>
  );
};
export const Row = ({ icon, title, sub, onPress, right, danger }) => {
  const t = useTheme();
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: t.border }}>
      {icon ? <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 14, color: danger ? t.critical : t.ink2 }}>{icon}</Text></View> : null}
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? t.critical : t.ink, fontSize: 15, fontWeight: '600' }}>{title}</Text>
        {sub ? <Text style={{ color: t.ink3, fontSize: 12.5, lineHeight: 17, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      {right !== undefined ? right : onPress ? <Text style={{ color: t.ink3, fontSize: 18 }}>›</Text> : null}
    </View>
  );
  return onPress ? <Pressable accessibilityRole="button" onPress={onPress}>{body}</Pressable> : body;
};

export function MoodDots({ value, onChange }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {t.mood.map((c, i) => {
        const on = value === i + 1;
        return (
          <Pressable key={i} accessibilityRole="button" accessibilityLabel={MOOD_LABELS[i]} accessibilityState={{ selected: on }} onPress={() => onChange(i + 1)} style={{ alignItems: 'center', width: 58 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, borderWidth: on ? 2 : 1.5, borderColor: on ? t.accent : t.border, backgroundColor: t.surface, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c }} />
            </View>
            <Text style={{ fontSize: 11, marginTop: 4, color: on ? t.ink : t.ink3, fontWeight: on ? '700' : '400' }}>{MOOD_LABELS[i]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Ring({ value }) {
  const t = useTheme();
  const r = 26, c = 2 * Math.PI * r, off = value === null ? c : c * (1 - value / 100);
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r={r} fill="none" stroke={t.border} strokeWidth="6" />
      <Circle cx="32" cy="32" r={r} fill="none" stroke={t.mood[2]} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} rotation="-90" originX="32" originY="32" />
    </Svg>
  );
}

export function Chart({ points }) {
  const t = useTheme();
  if (!points.length) return <P mut>No check-ins yet. Log your first mood on the Today tab.</P>;
  const W = 560, H = 170, L = 34, R = 14, T = 14, B = 14;
  const x = (i) => (points.length > 1 ? L + (i * (W - L - R)) / (points.length - 1) : (L + W - R) / 2);
  const y = (m) => T + ((5 - m) * (H - T - B)) / 4;
  const col = (m) => t.mood[Math.min(4, Math.max(0, Math.round(m) - 1))];
  return (
    <Svg width="100%" height={160} viewBox={`0 0 ${W} ${H}`} accessibilityLabel={`Mood trend, ${points.length} days with check-ins`}>
      {[1, 2, 3, 4, 5].map((m) => (
        <React.Fragment key={m}>
          <Line x1={L} x2={W - R} y1={y(m)} y2={y(m)} stroke={t.border} strokeWidth="1" />
          <SText x={L - 10} y={y(m) + 4} fontSize="12" fill={t.ink3} textAnchor="end">{String(m)}</SText>
        </React.Fragment>
      ))}
      <Polyline points={points.map((p, i) => `${x(i)},${y(p.mood)}`).join(' ')} fill="none" stroke={t.accent} strokeWidth="2.5" strokeLinejoin="round" />
      {points.map((p, i) => <Circle key={i} cx={x(i)} cy={y(p.mood)} r="6" fill={col(p.mood)} stroke={t.accent} strokeWidth="2" />)}
    </Svg>
  );
}

export function Heat({ days }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {days.map((v, i) => (
        <View key={i} style={{ width: '10%', padding: 1.5 }}>
          <View style={{ aspectRatio: 1, borderRadius: 3, backgroundColor: v === null ? t.surface : t.mood[Math.min(4, Math.max(0, Math.round(v) - 1))], borderWidth: v === null ? 1 : 0, borderColor: t.border }} />
        </View>
      ))}
    </View>
  );
}

export function SupportModal({ visible, onClose }) {
  const t = useTheme();
  const open = (h) => { if (h.tel) Linking.openURL(`tel:${h.tel}`); else if (h.sms) Linking.openURL(`sms:${h.sms}`); };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(21,20,27,.75)', justifyContent: 'center', padding: 16 }}>
        <ScrollView style={{ maxHeight: '92%', flexGrow: 0 }} contentContainerStyle={{ backgroundColor: t.surface, borderRadius: 22, padding: 22, alignItems: 'center' }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.accentTint, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><Text style={{ fontSize: 20, color: t.accent }}>◡</Text></View>
          <Title size={21}>You don't have to carry this alone.</Title>
          <P mut style={{ textAlign: 'center', marginTop: 8 }}>Support is a tap away, any time.</P>
          <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 8 }}>
            {HELPLINES.map((h, i) => (
              <Btn key={h.label} kind={i === 0 ? 'primary' : 'secondary'} full onPress={() => open(h)}
                title={h.display ? `${h.label} — ${h.display}` : h.label} />
            ))}
          </View>
          <P small style={{ textAlign: 'center', marginTop: 12 }}>If you are in immediate danger, call {EMERGENCY} or go to the nearest emergency room.</P>
          <Btn kind="ghost" full title="Close" onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}
