import React, { useState } from 'react';
import { View, Text, TextInput } from 'react-native';
import { Card, P, Title, Btn } from '../components';
import { useTheme, MOOD_LABELS } from '../theme';
import { fmtDate } from '../insights';

export default function Journal({ store, go }) {
  const t = useTheme();
  const [q, setQ] = useState('');
  const all = store.entries.filter((e) => e.text).slice().reverse();
  const shown = q.trim() ? all.filter((e) => e.text.toLowerCase().includes(q.trim().toLowerCase())) : all;
  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Title>Journal</Title>
        <P small>{all.length} entr{all.length === 1 ? 'y' : 'ies'}</P>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.sunk, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 12, marginTop: 12 }}>
        <Text style={{ color: t.ink3, fontSize: 16 }}>⌕</Text>
        <TextInput value={q} onChangeText={setQ} placeholder="Search your entries" placeholderTextColor={t.ink3} accessibilityLabel="Search entries" style={{ flex: 1, color: t.ink, fontSize: 15, paddingVertical: 10 }} />
      </View>
      {q.trim() ? <P small style={{ marginTop: 8 }}>{shown.length} entr{shown.length === 1 ? 'y' : 'ies'} match "{q.trim()}"</P> : null}
      <Card style={{ paddingVertical: 4 }}>
        {shown.length === 0 ? (
          <P mut style={{ marginVertical: 12 }}>{all.length ? 'No entries match your search.' : 'No journal entries yet. Write a note in a check-in and it will appear here.'}</P>
        ) : shown.map((e, i) => (
          <View key={e.id} style={{ paddingVertical: 11, borderBottomWidth: i === shown.length - 1 ? 0 : 1, borderBottomColor: t.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: e.emotion ? t.cat[e.emotion] : t.mood[e.mood - 1] }} />
              <Text style={{ color: t.ink3, fontSize: 12.5 }}>{e.emotion || MOOD_LABELS[e.mood - 1]} · {fmtDate(e.t)}</Text>
            </View>
            <Text style={{ color: t.ink2, fontSize: 15, lineHeight: 21 }}>{e.text}</Text>
          </View>
        ))}
      </Card>
      <View style={{ marginTop: 14 }}><Btn kind="secondary" title="New check-in" onPress={() => go('today')} /></View>
    </View>
  );
}
