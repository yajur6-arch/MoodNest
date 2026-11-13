import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Switch } from 'react-native';
import { Card, Label, P, Title, Btn, Chip, ChipRow, SupportPill, SupportModal } from '../components';
import { useTheme } from '../theme';
import { ASSISTANT_NOTICE, STARTERS, newSessionId, sendToAssistant, ackHandoff, wakeBackend } from '../assistant';

export default function Assistant({ store, update }) {
  const t = useTheme();
  const [chat, setChat] = useState([]); 
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState(false);
  const [adult, setAdult] = useState(false);
  const session = useRef(newSessionId());
  const c = store.consent;
  useEffect(() => { if (c.assistant && c.adult) wakeBackend(); }, [c.assistant, c.adult]);

  const header = (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Title>Assistant</Title>
      <SupportPill onPress={() => setHelp(true)} />
    </View>
  );

  
  if (!(c.assistant && c.adult)) {
    return (
      <View>
        {header}
        <Card>
          <Label>Before you start</Label>
          <P>This assistant offers guided check-ins and simple coping exercises. It is AI, not a person or a counsellor.</P>
          <P mut>What is sent: the messages in this conversation, one number (your average mood over the last 7 days), and a random code for this install that is only used to limit how many messages one phone can send. Not your name, email or journal entries. The server also sees a random install code and your IP address, used only to limit abuse.</P>
          <P mut>Why: so it can reply to you. Who receives it: our server and the AI service provider that writes the replies.</P>
          <P mut>What is kept: conversations are not saved on your phone or our server. If a safety rule is triggered, we keep a small record (a random session code, the time, the type of rule, and what the app did) with no message text.</P>
          <P mut>You control it: you can turn the assistant off at any time in Profile.</P>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 8 }}>
            <Text style={{ color: t.ink, flex: 1, fontWeight: '600', fontSize: 15 }}>I am 18 or older</Text>
            <Switch accessibilityLabel="I am 18 or older" value={adult} onValueChange={setAdult} />
          </View>
          <Btn title="Turn on assistant" onPress={() => adult && update({ ...store, consent: { ...c, assistant: true, adult: true } })} />
          {!adult && <P small style={{ marginTop: 8 }}>Confirm your age to continue.</P>}
        </Card>
        <SupportModal visible={help} onClose={() => setHelp(false)} />
      </View>
    );
  }

  const send = async (preset) => {
    const msg = (preset || text).trim();
    if (!msg || busy) return;
    const next = [...chat, { id: 'u' + Date.now(), role: 'user', text: msg }];
    setChat(next); setText(''); setBusy(true);
    const r = await sendToAssistant(session.current, next, store);
    setChat([...next, { id: 'a' + Date.now(), role: 'assistant', text: r.reply }]);
    setBusy(false);
    if (r.showSupport) { setHelp(true); ackHandoff(r.eventId, store); }
  };
  const clear = () => { setChat([]); session.current = newSessionId(); };

  return (
    <View>
      {header}
      <Card tint><View style={{ flexDirection: 'row', gap: 8 }}><Text style={{ color: t.accent, fontSize: 15 }}>✦</Text><P small style={{ flex: 1, color: t.ink2, marginBottom: 0 }}>{ASSISTANT_NOTICE}</P></View></Card>
      {chat.length === 0 && (
        <View style={{ marginTop: 14 }}>
          <P mut>Pick something to start, or type a message.</P>
          <ChipRow>{STARTERS.map((s) => <Chip key={s.label} label={s.label} onPress={() => send(s.text)} />)}</ChipRow>
        </View>
      )}
      <View style={{ marginTop: 6 }}>
        {chat.map((m) => (
          <View key={m.id} accessibilityLabel={`${m.role === 'user' ? 'You' : 'Assistant'}: ${m.text}`}
            style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: m.role === 'user' ? t.accent : t.sunk, borderWidth: m.role === 'user' ? 0 : 1, borderColor: t.border }}>
            <Text selectable style={{ color: m.role === 'user' ? t.onAccent : t.ink, fontSize: 15, lineHeight: 22 }}>{m.text}</Text>
          </View>
        ))}
        {busy && <P small style={{ marginTop: 10 }}>Assistant is typing...</P>}
      </View>
      <Card>
        <TextInput multiline maxLength={2000} value={text} onChangeText={setText} placeholder="Type a message" placeholderTextColor={t.ink3} accessibilityLabel="Message"
          style={{ minHeight: 60, borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, padding: 12, color: t.ink, fontSize: 15, textAlignVertical: 'top', marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Btn title="Send" onPress={() => send()} />
          {chat.length > 0 && <Btn kind="ghost" title="Clear chat" onPress={clear} />}
        </View>
      </Card>
      <SupportModal visible={help} onClose={() => setHelp(false)} />
    </View>
  );
}
