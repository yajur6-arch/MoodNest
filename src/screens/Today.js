import React, { useState } from 'react';
import { View, Text, TextInput, Alert } from 'react-native';
import { Card, Label, P, Title, Btn, Chip, ChipRow, MoodDots, Ring, Mono, SupportPill, SupportModal } from '../components';
import { useTheme, EMOTIONS } from '../theme';
import { analyseSentiment, SENTIMENT_TAG, sendSupportRequest } from '../api';
import { TIPS, PROMPTS } from '../config';
import { lastDays, avg, streak, scoreFromAvg, moodWord, insightText, greeting } from '../insights';

export default function Today({ store, update }) {
  const t = useTheme();
  const [mood, setMood] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [text, setText] = useState('');
  const [last, setLast] = useState(null);
  const [help, setHelp] = useState(false);

  const week = avg(lastDays(store.entries, 7));
  const st = streak(store.entries);
  const insight = insightText(store.entries);
  const prompt = PROMPTS[Math.floor(Date.now() / 864e5) % PROMPTS.length];

  const log = async () => {
    if (!mood) return Alert.alert('Choose a mood', 'Tap one of the five circles first.');
    const note = text.trim();
    const sentiment = note ? await analyseSentiment(note) : mood > 3 ? 'positive' : mood < 3 ? 'negative' : 'neutral';
    const entry = { id: String(Date.now()), t: Date.now(), mood, text: note, emotion, sentiment, confirmed: false };
    const k = mood < 3 ? 'low' : mood < 4 ? 'ok' : 'good';
    await update({ ...store, entries: [...store.entries, entry] });
    setLast({ id: entry.id, sentiment, hasNote: !!note, tip: TIPS[k][store.entries.length % TIPS[k].length] });
    setMood(null); setEmotion(null); setText('');
  };
  const fixTag = async (s) => {
    setLast({ ...last, sentiment: s });
    await update({ ...store, entries: store.entries.map((e) => (e.id === last.id ? { ...e, sentiment: s, confirmed: true } : e)) });
  };
  const ask = () => Alert.alert(
    'Ask a counsellor to reach out?',
    'Only you can start this. It sends a request so a campus counsellor can contact you. In this test version the request is saved on this phone only, because the counsellor service is not connected yet.',
    [{ text: 'Cancel', style: 'cancel' }, { text: 'Send request', onPress: async () => { await update(await sendSupportRequest(store)); Alert.alert('Request saved', 'It is stored on this phone for now.'); } }],
  );

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}><Title size={24}>{greeting()}</Title></View>
        <SupportPill onPress={() => setHelp(true)} />
      </View>

      <Card>
        <Label>Your mood this week</Label>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute' }}><Ring value={week === null ? null : scoreFromAvg(week)} /></View>
            <Mono style={{ fontSize: 18, fontWeight: '600' }}>{week === null ? '–' : scoreFromAvg(week)}</Mono>
          </View>
          <View style={{ flex: 1 }}>
            <P style={{ fontWeight: '700', marginBottom: 2 }}>{week === null ? 'No check-ins yet' : moodWord(week)}</P>
            <P small>{st > 0 ? `${st}-day streak` : 'Log a check-in to start a streak'} · score out of 100 from your own ratings</P>
          </View>
        </View>
      </Card>

      <Card>
        <Label>How are you feeling right now?</Label>
        <MoodDots value={mood} onChange={setMood} />
      </Card>

      <Card>
        <Label>What's going on? (optional)</Label>
        <ChipRow>
          {EMOTIONS.map((e) => <Chip key={e} label={e} dot={t.cat[e]} selected={emotion === e} onPress={() => setEmotion(emotion === e ? null : e)} />)}
        </ChipRow>
        <TextInput multiline value={text} onChangeText={setText} maxLength={2000} placeholder="Add a note (optional)" placeholderTextColor={t.ink3} accessibilityLabel="Note"
          style={{ minHeight: 84, marginTop: 12, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, padding: 12, color: t.ink, fontSize: 15, textAlignVertical: 'top' }} />
        <View style={{ marginTop: 12 }}><Btn full title="Log check-in" onPress={log} /></View>
      </Card>

      {last && (
        <Card tint>
          <Label>Check-in saved</Label>
          {last.hasNote && (
            <>
              <View style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: t.accent, fontSize: 15 }}>✦</Text><P style={{ flex: 1 }}>We read your note as: {SENTIMENT_TAG[last.sentiment]}</P></View>
              <P small>This is a guess from your words, not a diagnosis. Does it fit?</P>
              <ChipRow>{Object.keys(SENTIMENT_TAG).map((k) => <Chip key={k} label={SENTIMENT_TAG[k]} selected={last.sentiment === k} onPress={() => fixTag(k)} />)}</ChipRow>
            </>
          )}
          <View style={{ borderLeftWidth: 3, borderLeftColor: t.accent, paddingLeft: 12, marginTop: 12 }}>
            <Label>A suggestion</Label><P>{last.tip}</P>
          </View>
        </Card>
      )}

      {insight && (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, paddingHorizontal: 2 }}>
          <Text style={{ color: t.accent, fontSize: 15 }}>✦</Text>
          <P mut style={{ flex: 1 }}>{insight} This is a pattern in what you reported, not a diagnosis.</P>
        </View>
      )}

      <Card>
        <Label>Today's prompt</Label>
        <Text style={{ color: t.ink, fontStyle: 'italic', fontSize: 17, lineHeight: 24 }}>"{prompt}"</Text>
      </Card>

      <Card>
        <Label>Want to talk to a person?</Label>
        <P mut>You decide. A counsellor is only asked to reach out if you choose to send a request.</P>
        <Btn kind="secondary" title="Ask a counsellor to reach out" onPress={ask} />
      </Card>
      <SupportModal visible={help} onClose={() => setHelp(false)} />
    </View>
  );
}
