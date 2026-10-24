import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Card, Label, P, Title, Chart, Heat, Mono } from '../components';
import { useTheme } from '../theme';
import { getWearableSummary } from '../wearables';
import { TIPS } from '../config';
import { lastDays, avg, streak, insightText } from '../insights';

export default function Insights({ store }) {
  const t = useTheme();
  const [range, setRange] = useState(7);
  const [wear, setWear] = useState(null);
  useEffect(() => { if (store.consent.wearable) getWearableSummary(range).then(setWear); else setWear(null); }, [range, store.consent.wearable]);

  const days = lastDays(store.entries, range);
  const points = days.filter((d) => d !== null).map((mood) => ({ mood }));
  const a = avg(days);
  const st = streak(store.entries);
  const insight = insightText(store.entries);
  const k = a === null ? 'ok' : a < 2.5 ? 'low' : a < 3.5 ? 'ok' : 'good';

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title>Insights</Title>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[7, 30].map((r) => (
            <Pressable key={r} accessibilityRole="button" accessibilityState={{ selected: range === r }} onPress={() => setRange(r)}
              style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 100, borderWidth: 1, borderColor: range === r ? t.ink : t.border, backgroundColor: range === r ? t.ink : 'transparent' }}>
              <Text style={{ color: range === r ? t.surface : t.ink2, fontWeight: '600', fontSize: 13 }}>{r}d</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <P small style={{ marginTop: 4 }}>Based on your last {range} days</P>

      <Card>
        <Label>{range}-day trend</Label>
        <Chart points={points} />
        {a !== null && <Mono style={{ marginTop: 6 }}>{a.toFixed(1)} / 5 · {points.length} day{points.length === 1 ? '' : 's'} logged</Mono>}
      </Card>

      {insight && <Card tint><P style={{ marginBottom: 0 }}>{insight}</P><P small style={{ marginTop: 6 }}>These are patterns in what you reported, not a diagnosis.</P></Card>}

      <Card>
        <Label>Consistency · last 30 days</Label>
        <Heat days={lastDays(store.entries, 30)} />
        {st >= 7 && (
          <View style={{ alignSelf: 'flex-start', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5, paddingHorizontal: 11, borderRadius: 100, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.accent }} />
            <Text style={{ color: t.ink, fontWeight: '600', fontSize: 13 }}>Milestone — {st}-day streak</Text>
          </View>
        )}
      </Card>

      <Card>
        <Label>Sleep and heart rate</Label>
        {!store.consent.wearable ? <P mut>Optional. Turn on wearable data in Profile to see sleep and heart rate beside your mood.</P>
          : wear ? (
            <View>
              <P>Average sleep: {wear.sleep === null ? 'no data' : `${wear.sleep} h per night (${wear.nights} nights)`}</P>
              <P>Average heart rate: {wear.hr === null ? 'no data' : `${wear.hr} bpm (all day, not a resting value)`}</P>
              <P small>From your Galaxy Watch via Samsung Health and Health Connect. Not a medical measurement, and it says nothing about whether you have any condition. It stays on your phone.</P>
            </View>
          ) : <P mut>No watch data yet. In Profile, tap "Connect watch data". This needs the development build on an Android phone.</P>}
      </Card>

      <Card>
        <Label>A suggestion for you</Label>
        <P style={{ marginBottom: 0 }}>{TIPS[k][points.length % TIPS[k].length]}</P>
      </Card>
      <P small style={{ marginTop: 14 }}>Insights are suggestions, not a diagnosis. For support, reach your campus counsellor.</P>
    </View>
  );
}
