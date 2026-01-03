import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, AIPersonality } from '../types';
import { getTranslation, TranslationKey } from '../lib/i18n';

interface Settings {
  darkMode: boolean;
  reminderEnabled: boolean;
  reminderTime: string; // Format: "HH:MM"
  voiceName: string;
  language: Language;
  voiceResponse: boolean; // Toggle for AI speaking back
  personality: AIPersonality;
}

interface SettingsContextType {
  settings: Settings;
  setDarkMode: (enabled: boolean) => void;
  setReminderEnabled: (enabled: boolean) => void;
  setReminderTime: (time: string) => void;
  setVoiceName: (voice: string) => void;
  setLanguage: (lang: Language) => void;
  setVoiceResponse: (enabled: boolean) => void;
  setPersonality: (p: AIPersonality) => void;
  t: (key: TranslationKey) => string; // Helper for translation
}

const defaultSettings: Settings = {
  darkMode: false,
  reminderEnabled: false,
  reminderTime: '20:00',
  voiceName: 'Puck',
  language: 'fr',
  voiceResponse: true,
  personality: AIPersonality.EMPATHETIC,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    // Load from localStorage on init
    const saved = localStorage.getItem('journalySettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with default to ensure new keys exist if loading old settings
        return { ...defaultSettings, ...parsed };
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

    // Check every minute if it's reminder time
    const checkReminder = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (currentTime === settings.reminderTime) {
        const lastReminder = localStorage.getItem('lastReminderDate');
        const today = now.toDateString();

        if (lastReminder !== today) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Journaly', {
              body: settings.language === 'fr'
                ? 'C\'est l\'heure de ton journal !'
                : 'It\'s time for your journal!',
            });
          }
          localStorage.setItem('lastReminderDate', today);
        }
      }
    };

    const interval = setInterval(checkReminder, 60000);
    checkReminder();

    return () => clearInterval(interval);
  }, [settings.reminderEnabled, settings.reminderTime, settings.language]);

  const setDarkMode = (enabled: boolean) => setSettings(prev => ({ ...prev, darkMode: enabled }));
  const setReminderEnabled = (enabled: boolean) => setSettings(prev => ({ ...prev, reminderEnabled: enabled }));
  const setReminderTime = (time: string) => setSettings(prev => ({ ...prev, reminderTime: time }));
  const setVoiceName = (voice: string) => setSettings(prev => ({ ...prev, voiceName: voice }));
  const setLanguage = (lang: Language) => setSettings(prev => ({ ...prev, language: lang }));
  const setVoiceResponse = (enabled: boolean) => setSettings(prev => ({ ...prev, voiceResponse: enabled }));
  const setPersonality = (p: AIPersonality) => setSettings(prev => ({ ...prev, personality: p }));

  const t = (key: TranslationKey) => getTranslation(settings.language, key);

  return (
    <SettingsContext.Provider value={{
      settings,
      setDarkMode,
      setReminderEnabled,
      setReminderTime,
      setVoiceName,
      setLanguage,
      setVoiceResponse,
      setPersonality,
      t
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

// Available voices
export const AVAILABLE_VOICES = [
  { id: 'Kore', name: 'Douce (Kore)', description: 'Joueuse' },
  { id: 'Puck', name: 'Énergique (Puck)', description: 'Vif' },
  { id: 'Fenrir', name: 'Profonde (Fenrir)', description: 'Grave' },
  { id: 'Charon', name: 'Calme (Charon)', description: 'Posée' },
  { id: 'Aoede', name: 'Distinguée (Aoede)', description: 'Noble' },
];

