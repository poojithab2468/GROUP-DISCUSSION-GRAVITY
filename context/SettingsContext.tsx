import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { setupNotifications, scheduleDailyReminder, cancelAllNotifications } from '../utils/NotificationManager';

export interface NotificationPrefs {
  remindersEnabled: boolean;
  reminderTime: string; // "09:00"
  motivationEnabled: boolean;
  weeklyReportsEnabled: boolean;
  sessionAlertsEnabled: boolean;
}

interface SettingsContextType {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  pushEnabled: boolean;
  setPushEnabled: (val: boolean) => void;
  hapticEnabled: boolean;
  setHapticEnabled: (val: boolean) => void;
  notificationPrefs: NotificationPrefs;
  updateNotificationPrefs: (prefs: Partial<NotificationPrefs>) => void;
  isLoaded: boolean;
}

const defaultNotifPrefs: NotificationPrefs = {
  remindersEnabled: true,
  reminderTime: "18:00",
  motivationEnabled: true,
  weeklyReportsEnabled: true,
  sessionAlertsEnabled: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true); // Locked strictly to true for Midnight Aurora
  const [pushEnabled, setPushEnabled] = useState(false);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPrefs>(defaultNotifPrefs);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load Initial Settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('@settings_dark_mode');
        const storedPush = await AsyncStorage.getItem('@settings_push_enabled');
        const storedHaptic = await AsyncStorage.getItem('@settings_haptic_enabled');
        const storedNotifs = await AsyncStorage.getItem('@settings_notif_prefs');

        // We bypass restoring Dark Mode here to lock Midnight Aurora, but we persist it anyway
        if (storedPush !== null) setPushEnabled(storedPush === 'true');
        if (storedHaptic !== null) setHapticEnabled(storedHaptic === 'true');
        if (storedNotifs !== null) setNotificationPrefs({ ...defaultNotifPrefs, ...JSON.parse(storedNotifs) });
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // Save Settings on Change & Handle Effects
  useEffect(() => {
    if (!isLoaded) return;
    
    AsyncStorage.setItem('@settings_dark_mode', String(isDarkMode));
    AsyncStorage.setItem('@settings_push_enabled', String(pushEnabled));
    AsyncStorage.setItem('@settings_haptic_enabled', String(hapticEnabled));
    AsyncStorage.setItem('@settings_notif_prefs', JSON.stringify(notificationPrefs));

    // Handle notifications logic
    if (pushEnabled) {
       setupNotifications().then((hasPermissions) => {
          if (hasPermissions && notificationPrefs.remindersEnabled) {
             const [hours, minutes] = notificationPrefs.reminderTime.split(':').map(Number);
             scheduleDailyReminder(hours, minutes);
          } else {
             cancelAllNotifications();
          }
       });
    } else {
       cancelAllNotifications();
    }
  }, [isDarkMode, pushEnabled, hapticEnabled, notificationPrefs, isLoaded]);

  const updateNotificationPrefs = (prefs: Partial<NotificationPrefs>) => {
    setNotificationPrefs(prev => ({ ...prev, ...prefs }));
  };

  return (
    <SettingsContext.Provider 
      value={{ 
        isDarkMode, setIsDarkMode: () => {}, // Disable toggle to preserve UI
        pushEnabled, setPushEnabled, 
        hapticEnabled, setHapticEnabled,
        notificationPrefs, updateNotificationPrefs,
        isLoaded
      }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
