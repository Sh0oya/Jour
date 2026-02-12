import React, { useState } from 'react';
import { User, UserTier, UserGoal, AIPersonality } from '../types';
import { useSettings, AVAILABLE_VOICES } from '../contexts/SettingsContext';
import { Crown, Bell, Moon, LogOut, Check, Sparkles, Target, Mic, Loader2, Key, Download, Upload, Shield } from 'lucide-react';
import { supabase, SUPABASE_URL } from '../lib/supabase';
import { backupEncryptionKey, restoreEncryptionKey } from '../utils/crypto';

interface SettingsProps {
  user: User;
}

// RESTORED: Stripe Payment Links
const STRIPE_LINKS = {
  monthly: 'https://buy.stripe.com/3cI4gzb741RB0Whg8b7ok00',
  yearly: 'https://buy.stripe.com/fZu28rejg67R9sNf477ok01',
};

const Settings: React.FC<SettingsProps> = ({ user }) => {
  const {
    settings,
    setDarkMode,
    setReminderEnabled,
    setReminderTime,
    setVoiceName,
    setVoiceResponse,
    setPersonality,
    t
  } = useSettings();

  const [loading, setLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [keyBackup, setKeyBackup] = useState<string | null>(null);
  const [showKeyRestore, setShowKeyRestore] = useState(false);
  const [restoreKeyInput, setRestoreKeyInput] = useState('');
  const [keyMessage, setKeyMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleExportKey = async () => {
    try {
      const key = await backupEncryptionKey(user.id);
      setKeyBackup(key);
      await navigator.clipboard.writeText(key);
      setKeyMessage({ type: 'success', text: t('key_copied') });
      setTimeout(() => setKeyMessage(null), 3000);
    } catch (error) {
      setKeyMessage({ type: 'error', text: t('key_export_error') });
    }
  };

  const handleRestoreKey = async () => {
    if (!restoreKeyInput.trim()) return;

    const success = await restoreEncryptionKey(user.id, restoreKeyInput.trim());
    if (success) {
      setKeyMessage({ type: 'success', text: t('key_restored') });
      setShowKeyRestore(false);
      setRestoreKeyInput('');
    } else {
      setKeyMessage({ type: 'error', text: t('key_invalid') });
    }
    setTimeout(() => setKeyMessage(null), 3000);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleStripeCheckout = (plan: 'monthly' | 'yearly') => {
    setLoading(plan);
    const baseUrl = STRIPE_LINKS[plan];
    // Pass user ID for webhook metadata
    const checkoutUrl = `${baseUrl}?client_reference_id=${user.id}&prefilled_email=${encodeURIComponent(user.email)}`;
    window.location.href = checkoutUrl;
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            return_url: window.location.origin + '/settings',
          }),
        }
      );

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No portal URL returned:', data.error);
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
    } finally {
      setPortalLoading(false);
    }
  };

  const Personalities = [
    { id: AIPersonality.EMPATHETIC, icon: '🥰', name: t('p_empathetic'), desc: t('p_empathetic_desc') },
    { id: AIPersonality.COACH, icon: '💪', name: t('p_coach'), desc: t('p_coach_desc') },
    { id: AIPersonality.DIRECT, icon: '🎯', name: t('p_direct'), desc: t('p_direct_desc') },
    { id: AIPersonality.CUSTOM, icon: '✨', name: t('p_custom'), desc: t('p_custom_desc') },
  ];

  const Intentions = [
    { id: UserGoal.JOURNAL, icon: '📓', name: t('g_journal') },
    { id: UserGoal.MEMORY, icon: '🎞️', name: t('g_memory') },
    { id: UserGoal.DISCIPLINE, icon: '🔥', name: t('g_discipline') },
    { id: UserGoal.WORK, icon: '🚀', name: t('g_work') },
  ];

  return (
    <div className="space-y-6 pb-24">
      <h1 className="text-3xl font-bold text-emerald-900 px-2">{t('settings')}</h1>

      {/* Member Status Card */}
      <div className="bg-emerald-800 rounded-[2rem] p-6 text-white relative overflow-hidden shadow-lg">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-bold opacity-90">{t('member_status')}</h2>
              <p className="text-emerald-100/80 text-sm">{t('upgrade_subtitle')}</p>
            </div>
            <div className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider">
              {user.tier === UserTier.PRO ? t('pro') : t('free')}
            </div>
          </div>

          {user.tier === UserTier.PRO ? (
            <button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="bg-white text-emerald-900 px-6 py-3 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center gap-2 disabled:opacity-70"
            >
              {portalLoading && <Loader2 size={14} className="animate-spin" />}
              {t('manage_subscription')}
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => handleStripeCheckout('monthly')}
                className="flex-1 bg-white text-emerald-900 px-4 py-3 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {loading === 'monthly' && <Loader2 size={12} className="animate-spin" />}
                {t('monthly')} (6.90€)
              </button>
              <button
                onClick={() => handleStripeCheckout('yearly')}
                className="flex-1 bg-emerald-400 text-emerald-950 px-4 py-3 rounded-xl font-bold text-xs shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                {loading === 'yearly' && <Loader2 size={12} className="animate-spin" />}
                {t('yearly')} (70€)
              </button>
            </div>
          )}
        </div>

        {/* Decorative Circle */}
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-emerald-700/50 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Identity (Read Only for now) */}
      <div className="space-y-4">
        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('identity')}</p>
        <div className="bg-white rounded-[1.5rem] p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-900">{t('firstname')}</span>
            <span className="text-gray-500 bg-gray-100 px-3 py-1 rounded-lg text-sm">{user.firstName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-900">{t('email')}</span>
            <span className="text-gray-500 bg-gray-100 px-3 py-1 rounded-lg text-sm">{user.email}</span>
          </div>
        </div>
      </div>

      {/* Voice of June */}
      <div className="space-y-4">
        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('voice_of_june')}</p>
        <div className="bg-white rounded-[2rem] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-900 text-lg">{t('voice_response')}</span>
            <button
              onClick={() => setVoiceResponse(!settings.voiceResponse)}
              className={`w-14 h-8 rounded-full transition-colors relative ${settings.voiceResponse ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-sm transition-transform ${settings.voiceResponse ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {settings.voiceResponse && (
            <div className="space-y-2">
              {AVAILABLE_VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setVoiceName(voice.id)}
                  className={`w-full flex items-center p-4 rounded-2xl transition-all ${settings.voiceName === voice.id
                      ? 'bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <div className={`p-2 rounded-full mr-4 ${settings.voiceName === voice.id ? 'bg-emerald-200 text-emerald-700' : 'bg-gray-200 text-gray-400'}`}>
                    <Mic size={18} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-bold text-sm">{voice.name}</p>
                    <p className="text-xs opacity-70">{voice.description}</p>
                  </div>
                  {settings.voiceName === voice.id && <Check size={20} className="text-emerald-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Personality Grid */}
      <div className="space-y-4">
        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('personality')}</p>
        <div className="grid grid-cols-2 gap-3">
          {Personalities.map((p) => (
            <button
              key={p.id}
              onClick={() => setPersonality(p.id)}
              className={`p-4 rounded-[1.5rem] flex flex-col items-center justify-center gap-2 text-center transition-all h-32 border-2 ${settings.personality === p.id
                  ? 'bg-white border-emerald-500 shadow-md'
                  : 'bg-white border-transparent shadow-sm hover:bg-emerald-50'
                }`}
            >
              <span className="text-2xl">{p.icon}</span>
              <div>
                <p className={`text-xs font-bold uppercase ${settings.personality === p.id ? 'text-emerald-800' : 'text-gray-600'}`}>
                  {p.name}
                </p>
                <p className="text-[10px] text-gray-400 leading-tight mt-1">{p.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Intention Grid */}
      <div className="space-y-4">
        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('intention')}</p>
        <div className="grid grid-cols-2 gap-3">
          {Intentions.map((g) => (
            <button
              key={g.id}
              className={`p-4 rounded-[1.5rem] flex items-center gap-3 transition-all ${user.goal === g.id
                  ? 'bg-emerald-800 text-white shadow-md'
                  : 'bg-white text-gray-600 shadow-sm hover:bg-gray-50'
                }`}
            >
              <span className="text-xl">{g.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wide">{g.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Preferences Table */}
      <div className="space-y-4">
        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400">{t('preferences')}</p>
        <div className="bg-white rounded-[2rem] p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-900">{t('call_time')}</span>
            <div className="bg-gray-100 rounded-lg px-3 py-1 font-mono text-sm font-bold text-gray-700">
              <input
                type="time"
                value={settings.reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-transparent border-none focus:ring-0 p-0 w-16 text-center"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-900">{t('notifications')}</span>
            <button
              onClick={() => setReminderEnabled(!settings.reminderEnabled)}
              className={`w-12 h-7 rounded-full transition-colors relative ${settings.reminderEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${settings.reminderEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-semibold text-emerald-900">{t('dark_mode')}</span>
            <button
              onClick={() => setDarkMode(!settings.darkMode)}
              className={`w-12 h-7 rounded-full transition-colors relative ${settings.darkMode ? 'bg-emerald-500' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform ${settings.darkMode ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Security & Encryption */}
      <div className="space-y-4">
        <p className="px-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
          <Shield size={12} />
          {t('security_encryption')}
        </p>
        <div className="bg-white rounded-[2rem] p-6 shadow-sm space-y-4">
          <div className="flex items-start gap-3 text-sm text-gray-600 bg-emerald-50 p-4 rounded-xl">
            <Key size={18} className="text-emerald-700 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-emerald-900">{t('e2e_encryption')}</p>
              <p className="text-xs mt-1 text-emerald-700/80">
                {t('e2e_description')}
              </p>
            </div>
          </div>

          {keyMessage && (
            <div className={`p-3 rounded-xl text-sm text-center ${keyMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {keyMessage.text}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleExportKey}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-100 text-emerald-800 px-4 py-3 rounded-xl font-semibold text-sm hover:bg-emerald-200 transition"
            >
              <Download size={16} />
              {t('backup_key')}
            </button>
            <button
              onClick={() => setShowKeyRestore(!showKeyRestore)}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-xl font-semibold text-sm hover:bg-gray-200 transition"
            >
              <Upload size={16} />
              {t('restore_key')}
            </button>
          </div>

          {keyBackup && (
            <div className="bg-gray-100 p-3 rounded-xl">
              <p className="text-xs text-gray-500 mb-2">{t('your_key')}</p>
              <code className="text-xs break-all text-gray-700">{keyBackup}</code>
            </div>
          )}

          {showKeyRestore && (
            <div className="space-y-2">
              <input
                type="text"
                value={restoreKeyInput}
                onChange={(e) => setRestoreKeyInput(e.target.value)}
                placeholder={t('paste_key_placeholder')}
                className="w-full p-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                onClick={handleRestoreKey}
                className="w-full bg-emerald-800 text-white py-3 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition"
              >
                {t('restore_key_action')}
              </button>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            {t('key_backup_hint')}
          </p>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full border-2 border-emerald-100 text-emerald-800 font-bold py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-emerald-50 transition mt-8"
      >
        {t('logout')}
      </button>
    </div>
  );
};

export default Settings;
