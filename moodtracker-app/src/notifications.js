import * as Notifications from 'expo-notifications';
export async function setDailyReminder(hhmm) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!hhmm) return true;
  const p = await Notifications.requestPermissionsAsync();
  if (!p.granted) return false;
  const [hour, minute] = hhmm.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    content: { title: 'MoodTracker', body: 'How are you feeling today? Take a minute to check in.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
  return true;
}
