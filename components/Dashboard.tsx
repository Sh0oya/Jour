import React from 'react';
import { User, Mood } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Mic, Lightbulb, Trophy, Coffee, Flame, Smile, Zap, Sparkles } from 'lucide-react';
import { getTranslation } from '../lib/i18n';

interface DashboardProps {
  user: User;
  onStartSession: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onStartSession }) => {
  const { settings, t } = useSettings();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bonne après-midi";
    return "Bonsoir";
  };

  const formatDate = () => {
    return new Date().toLocaleDateString(settings.language === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).toUpperCase();
  };

  return (
    <div className="space-y-8 pt-6 pb-24">

      {/* Header */}
      <div className="px-2">
        <p className="text-xs font-bold text-emerald-800/60 uppercase tracking-widest mb-1">
          {formatDate()}
        </p>
        <h1 className="text-3xl font-extrabold text-emerald-900 leading-tight">
          {getGreeting()} {user.firstName || 'Invité'} !
        </h1>
      </div>

      {/* Main Action Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-emerald-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
        <div className="relative bg-emerald-800 rounded-[2.5rem] p-8 text-white text-center shadow-xl overflow-hidden">

          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

          {/* Content */}
          <div className="flex flex-col items-center gap-6 relative z-10">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md shadow-inner border border-white/10 mb-2">
              <Mic size={36} className="text-white drop-shadow-md" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold">{t('tell_me_day')}</h2>
              <p className="text-emerald-100/70 font-medium">{t('june_ready')}</p>
            </div>

            <button
              onClick={onStartSession}
              className="mt-2 bg-white text-emerald-900 px-8 py-4 rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              {t('start_call')}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 px-1">
        {[
          { icon: <Lightbulb size={20} className="text-amber-500" />, label: t('idea') },
          { icon: <Trophy size={20} className="text-purple-500" />, label: t('challenge') }, // 'Défi' in screenshot has swords, Trophy closer
          { icon: <Sparkles size={20} className="text-blue-500" />, label: t('victory') },
          { icon: <Coffee size={20} className="text-orange-500" />, label: t('calm') },
        ].map((action, i) => (
          <button
            key={i}
            onClick={onStartSession}
            className="flex flex-col items-center justify-center gap-2 bg-white rounded-3xl py-4 shadow-sm hover:bg-emerald-50 transition border border-transparent hover:border-emerald-100"
          >
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              {action.icon}
            </div>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-2 gap-4">

        {/* Mood Widget */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex flex-col items-center justify-between text-center gap-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('mood_today')}</span>
          <div className="text-5xl drop-shadow-sm">😌</div>
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            <span className="text-xs">😴</span>
          </div>
        </div>

        {/* Themes Widget (Empty State style) */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex flex-col justify-between gap-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('themes')}</span>
          <div className="flex flex-wrap gap-2 content-start">
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1.5 rounded-full">Avancée</span>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1.5 rounded-full">Projet</span>
            <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1.5 rounded-full">Alpha</span>
          </div>
        </div>

        {/* Last Memory Widget - Full Width */}
        <div className="col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="font-bold text-emerald-900">{t('last_memory')}</h3>
            <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">samedi 29</span>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed italic">
            "Journée productive au travail, le projet Alpha avance bien. Un peu de stress lié aux délais, mais bonne séance de sport le soir pour décompresser."
          </p>

          <div className="flex justify-end">
            <div className="text-2xl">😌</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;