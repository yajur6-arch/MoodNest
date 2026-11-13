import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from './src/theme';
import { load, save, defaults } from './src/store';
import Today from './src/screens/Today';
import Insights from './src/screens/Insights';
import Journal from './src/screens/Journal';
import Assistant from './src/screens/Assistant';
import Profile from './src/screens/Profile';

const TABS = [['today', 'Today', Today], ['insights', 'Insights', Insights], ['journal', 'Journal', Journal], ['assistant', 'Assistant', Assistant], ['profile', 'Profile', Profile]];

function Shell() {
  const t = useTheme();
  const insets = useSafeAreaInsets(); 
  const [store, setStore] = useState(null);
  const [tab, setTab] = useState('today');
  useEffect(() => { load().then(setStore); }, []);
  const update = async (s) => { setStore(s); await save(s); };
  if (!store) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.surface }}><ActivityIndicator color={t.accent} /></View>;
  const Screen = TABS.find((x) => x[0] === tab)[2];
  return (
    <View style={{ flex: 1, backgroundColor: t.surface }}>
      <StatusBar style="auto" />
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
            <Screen store={store} update={update} reset={(s) => setStore(s || defaults)} go={setTab} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <View style={{ flexDirection: 'row', backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: t.border, paddingBottom: insets.bottom }}>
        {TABS.map(([k, l]) => {
          const on = tab === k;
          return (
            <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(k)} style={{ flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 8, gap: 4 }}>
              <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: on ? t.accent : t.ink3, opacity: on ? 1 : 0.3 }} />
              <Text style={{ fontSize: 11, color: on ? t.accent : t.ink3, fontWeight: on ? '700' : '500' }}>{l}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function App() {
  return <SafeAreaProvider><Shell /></SafeAreaProvider>;
}
