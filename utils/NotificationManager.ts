import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function setupNotifications() {
  if (Platform.OS === 'web') return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return false;
  }
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
    });
  }
  
  return true;
}

export async function scheduleDailyReminder(hour: number, minute: number) {
  if (Platform.OS === 'web') return;
  
  await cancelAllNotifications();

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to Practice! 🎯",
      body: "Consistency is key. Jump into a quick GD session to improve your confidence today.",
      sound: true,
    },
    trigger: {
      hour,
      minute,
      repeats: true,
    } as any,
  });
  
  console.log(`[Push] Scheduled daily reminder for ${hour}:${minute}`);
}

export async function cancelAllNotifications() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('[Push] Cancelled all notifications');
}
