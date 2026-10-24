import React, { useState } from 'react';
import { View, Text, Switch, TextInput, Alert } from 'react-native';
import { Card, Label, P, Title, Btn, Row, SupportModal } from '../components';
import { useTheme } from '../theme';
import { setDailyReminder } from '../notifications';
import { connectWearable, openWearableSettings } from '../wearables';
import { wipe } from '../store';

export default function Profile({ store, update, reset }) {
  const t = useTheme();
  const [time, setTime] = useState(store.remind || '');
  const [help, setHelp] = useState(false);
  const toggle = (k) => update({ ...store, consent: { ...store.consent, [k]: !store.consent[k] } });
  const sw = (k, label) => <Switch accessibilityLabel={label} value={!!store.consent[k]} onValueChange={() => toggle(k)} />;

  const saveTime = async () => {
    if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return Alert.alert('Check the time', 'Use 24-hour format, like 18:30.');
    const ok = await setDailyReminder(time || null);
    if (!ok) return Alert.alert('Notifications are off', 'Allow notifications for MoodTracker in your phone settings.');
    await update({ ...store, remind: time || null });
    Alert.alert(time ? 'Reminder saved' : 'Reminder removed');
  };
  const connect = async () => {
    if (!store.consent.wearable) return Alert.alert('Turn on wearable data first', 'Switch on "Wearable data" above, then try again.');
    const r = await connectWearable();
    Alert.alert(r.ok ? 'Connected' : 'Not connected', r.message);
  };
  const del = () => Alert.alert('Delete all my data?', 'This removes every check-in and setting from this phone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => { await setDailyReminder(null); reset(await wipe()); } },
  ]);

  return (
    <View>
      <Title>Profile & settings</Title>

      <Card style={{ paddingVertical: 4 }}>
        <Row icon="⌁" title="Wearable data" sub="Use sleep and heart rate to add context to your mood." right={sw('wearable', 'Wearable data')} />
        <Row icon="✦" title="AI assistant" sub="Send your chat messages and your 7-day average mood to the AI service. Conversations are not saved." right={sw('assistant', 'AI assistant')} />
      </Card>
      <P small style={{ marginTop: 8 }}>You can change these at any time. All switches start off.</P>

      <Card>
        <Label>Watch data</Label>
        <P mut>Reads sleep and heart rate from Health Connect, which Samsung Health fills from your Galaxy Watch. Read-only. Stays on your phone: it is not sent to our server or the AI assistant.</P>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <Btn title="Connect watch data" onPress={connect} />
          <Btn kind="ghost" title="Manage permissions" onPress={openWearableSettings} />
        </View>
      </Card>

      <Card>
        <Label>Reminders</Label>
        <P mut>Daily check-in reminder, in 24-hour time (for example 18:30). Leave empty to turn it off.</P>
        <TextInput value={time} onChangeText={setTime} placeholder="18:30" placeholderTextColor={t.ink3} keyboardType="numbers-and-punctuation" maxLength={5} accessibilityLabel="Reminder time"
          style={{ borderWidth: 1, borderColor: t.border, backgroundColor: t.surface, borderRadius: 10, padding: 12, color: t.ink, fontSize: 15, marginBottom: 12 }} />
        <Btn title="Save reminder" onPress={saveTime} />
      </Card>

      <Card style={{ paddingVertical: 4 }}>
        <Row icon="☎" title="Crisis resources" sub="SADAG and your campus counselling centre" danger onPress={() => setHelp(true)} />
      </Card>

      <Card>
        <Label>Your data</Label>
        <P mut>Everything is stored only on this phone in this version.</P>
        <Btn kind="ghost" title="Delete all my data" onPress={del} />
      </Card>
      <P small style={{ marginTop: 14 }}>AI insights are suggestions, not a diagnosis.</P>
      <SupportModal visible={help} onClose={() => setHelp(false)} />
    </View>
  );
}
