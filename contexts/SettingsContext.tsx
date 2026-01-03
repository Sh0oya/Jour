import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Settings {
  darkMode: boolean;
  reminderEnabled: boolean;
  reminderTime: string; // Format: "HH:MM"
  voiceName: string;
}

interface SettingsContextType {
  settings: Settings;
  setDarkMode: (enabled: boolean) => void;
  setReminderEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  setVoiceName: (voice: string) => void;
}

const defaultSettings: Settings = {
  darkMode: false,
  reminderEnabled: false,
  reminderTime: '20:00',
  voiceName: 'Puck',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('journalySettings');
    if (saved) {
      try {
        return { ...defaultSettings, ...JSON.parse(saved) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  // Save to localStorage whenever settings change
  useEffect(() => {
    localStorage.setItem('journalySettings', JSON.stringify(settings));
    localStorage.setItem('juneVoice', settings.voiceName); // For VoiceSession compatibility

    // Apply dark mode to document
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Setup daily reminder notification
  useEffect(() => {
    if (!settings.reminderEnabled) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check every minute if it's reminder time
    const checkReminder = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (currentTime === settings.reminderTime) {
        // Check if we already sent a reminder today
        const lastReminder = localStorage.getItem('lastReminderDate');
        const today = now.toDateString();

        if (lastReminder !== today) {
          // Send notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Journaly - Rappel', {
              body: 'C\'est l\'heure de ton journal ! Prends un moment pour réfléchir à ta journée.',
              icon: 'https://www.ppc-digital.fr/wp-content/uploads/2026/01/Design-sans-titre-28.png',
            });
          }
          localStorage.setItem('lastReminderDate', today);
        }
      }
    };

    const interval = setInterval(checkReminder, 60000); // Check every minute
    checkReminder(); // Check immediately

    return () => clearInterval(interval);
  }, [settings.reminderEnabled, settings.reminderTime]);

  const setDarkMode = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, darkMode: enabled }));
  };

  const setReminderEnabled = (enabled: boolean) => {
    setSettings(prev => ({ ...prev, reminderEnabled: enabled }));
  };

  const setReminderTime = (time: string) => {
    setSettings(prev => ({ ...prev, reminderTime: time }));
  };

  const setVoiceName = (voice: string) => {
    setSettings(prev => ({ ...prev, voiceName: voice }));
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      setDarkMode,
      setReminderEnabled,
      setReminderTime,
      setVoiceName,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

// Available voices for Gemini
export const AVAILABLE_VOICES = [
  { id: 'Puck', name: 'Puck', description: 'Calme et posée' },
  { id: 'Charon', name: 'Charon', description: 'Grave et réfléchie' },
  { id: 'Kore', name: 'Kore', description: 'Douce et chaleureuse' },
  { id: 'Fenrir', name: 'Fenrir', description: 'Énergique' },
  { id: 'Aoede', name: 'Aoede', description: 'Mélodieuse' },
];
