import React, { useMemo } from 'react';
import { User, Mood, UserTier, JournalEntry } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import { Mic, Lightbulb, Trophy, Coffee, Flame, Smile, Zap, Sparkles, Clock, CheckSquare } from 'lucide-react';

interface DashboardProps {
  user: User;
  onStartSession: () => void;
  entries: JournalEntry[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, onStartSession, entries = [] }) => {
  const { settings, t } = useSettings();

  // Limits configuration
  const LIMITS = {
    [UserTier.FREE]: 30, // 30 seconds
    [UserTier.PRO]: 20 * 60 // 20 minutes
  };

  const dailyLimit = LIMITS[user.tier];
  const remainingSeconds = Math.max(0, dailyLimit - (user.todayUsageSeconds || 0));
  const usagePercent = Math.min(100, ((user.todayUsageSeconds || 0) / dailyLimit) * 100);

  const isLimitReached = remainingSeconds <= 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return settings.language === 'fr' ? "Bonjour" : "Good morning";
    if (hour < 18) return settings.language === 'fr' ? "Bonne après-midi" : "Good afternoon";
    return settings.language === 'fr' ? "Bonsoir" : "Good evening";
  };

  const formatDate = () => {
    return new Date().toLocaleDateString(settings.language === 'fr' ? 'fr-FR' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).toUpperCase();
  };

  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    return `${Math.ceil(secs / 60)}m`;
  };

  const lastEntry = entries.length > 0 ? entries[0] : null;

  return (
    <div className="space-y-6 pt-6 pb-24">

      {/* Header */}
      <div className="px-2">
        <p className="text-xs font-bold text-emerald-800/60 uppercase tracking-widest mb-1">
          {formatDate()}
        </p>
        <h1 className="text-3xl font-extrabold text-emerald-900 leading-tight">
          {getGreeting()} {user.firstName || (settings.language === 'fr' ? 'Invité' : 'Guest')} !
        </h1>
      </div>

      {/* Usage Limit Bar (Restored) */}
      <div className="bg-white px-5 py-4 rounded-[2rem] shadow-sm flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-400">
          <span className="flex items-center gap-1"><Clock size={12} /> {settings.language === 'fr' ? 'Temps Journalier' : 'Daily Allowance'}</span>
          <span className={isLimitReached ? "text-red-500" : "text-emerald-600"}>
            {formatTime(remainingSeconds)} {settings.language === 'fr' ? 'restants' : 'remaining'}
          </span>
        </div>
        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${isLimitReached ? 'bg-red-400' : 'bg-emerald-500'}`}
            style={{ width: `${usagePercent}%` }}
          ></div>
        </div>
        {user.tier === UserTier.FREE ? (
          <p className="text-[10px] text-center text-gray-400 mt-1">
            Limit: 30s. <span className="text-emerald-600 font-bold">Passer PRO pour 20m.</span>
          </p>
        ) : (
          <p className="text-[10px] text-center text-gray-400 mt-1">
            PRO Plan : 20m/day.
          </p>
        )}
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
              disabled={isLimitReached}
              className={`mt-2 bg-white text-emerald-900 px-8 py-4 rounded-full font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2 ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLimitReached ? (settings.language === 'fr' ? 'Limite Atteinte' : 'Limit Reached') : t('start_call')}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3 px-1">
        {[
          { icon: <Lightbulb size={20} className="text-amber-500" />, label: t('idea') },
          { icon: <Trophy size={20} className="text-purple-500" />, label: t('challenge') },
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
          <div className="text-5xl drop-shadow-sm">
            {lastEntry ? (
              lastEntry.mood === Mood.GREAT ? '🤩' :
                lastEntry.mood === Mood.GOOD ? '🙂' :
                  lastEntry.mood === Mood.BAD ? '😔' :
                    lastEntry.mood === Mood.TERRIBLE ? '😫' : '😐'
            ) : '😶'}
          </div>
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
            {/* Sub-emotion or trend indicator could go here, keeping static sleep for now or removing if confusing */}
            <span className="text-xs">{lastEntry ? '📈' : '💤'}</span>
          </div>
        </div>

        {/* Themes Widget (Empty State style) */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex flex-col justify-between gap-4">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('themes')}</span>
          <div className="flex flex-wrap gap-2 content-start">
            {entries.slice(0, 5).flatMap(e => e.tags || []).slice(0, 5).map((tag, i) => (
              <span key={i} className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1.5 rounded-full">{tag}</span>
            ))}
            {entries.flatMap(e => e.tags || []).length === 0 && (
              <span className="text-gray-300 text-xs italic">Pas encore de tags</span>
            )}
          </div>
        </div>

        {/* Action Items Widget - New Feature */}
        <ActionItemsWidget entries={entries} />

        {/* Last Memory Widget - Full Width */}
        {lastEntry && (
          <div className="col-span-2 bg-white p-6 rounded-[2.5rem] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="font-bold text-emerald-900">{t('last_memory')}</h3>
              <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">
                {new Date(lastEntry.date).toLocaleDateString(settings.language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' })}
              </span>
            </div>

            <p className="text-gray-600 text-sm leading-relaxed italic line-clamp-3">
              "{lastEntry.summary}"
            </p>

            <div className="flex justify-end">
              <div className="text-2xl">{lastEntry.mood === Mood.GREAT ? '🤩' : lastEntry.mood === Mood.GOOD ? '🙂' : '😐'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


const ActionItemsWidget: React.FC<{ entries: JournalEntry[] }> = ({ entries }) => {
  const { t, settings } = useSettings();
  const [items, setItems] = React.useState<any[]>([]);

  // Consolidate recent uncompleted action items
  React.useEffect(() => {
    const allItems: any[] = [];
    entries.forEach(entry => {
      // Fallback for snake_case from DB
      if ((entry as any).action_items && Array.isArray((entry as any).action_items)) {
        (entry as any).action_items.forEach((item: any) => {
          if (!item.completed) {
            allItems.push({ ...item, entryId: entry.id });
          }
        });
      }
      // Handle camelCase from types
      if (entry.actionItems && Array.isArray(entry.actionItems)) {
        entry.actionItems.forEach((item: any) => {
          if (!item.completed) {
            allItems.push({ ...item, entryId: entry.id });
          }
        });
      }
    });
    // Take top 3 most recent
    setItems(allItems.slice(0, 3));
  }, [entries]);

  const toggleItem = async (itemId: string, entryId: string) => {
    // Optimistic update
    setItems(prev => prev.filter(i => i.id !== itemId));

    // Find entry and update DB
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      const actionItems = entry.action_items || entry.actionItems || [];
      const updatedItems = actionItems.map((i: any) =>
        i.id === itemId ? { ...i, completed: true } : i
      );

      const { supabase } = await import('../lib/supabase');
      const { error } = await supabase
        .from('entries')
        .update({ action_items: updatedItems })
        .eq('id', entryId);

      if (error) console.error("Failed to toggle item", error);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="col-span-2 bg-emerald-50 p-6 rounded-[2.5rem] shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2 text-emerald-900 border-b border-emerald-100 pb-2">
        <CheckSquare size={16} />
        <span className="text-xs font-bold uppercase tracking-widest">{settings.language === 'fr' ? 'Suivi d\'actions' : 'Action Items'}</span>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => toggleItem(item.id, item.entryId)}
            className="w-full flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm hover:bg-emerald-100 transition group text-left"
          >
            <div className="w-5 h-5 rounded-full border-2 border-emerald-200 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 transition">
              <CheckSquare size={10} className="text-white opacity-0 group-hover:opacity-100" />
            </div>
            <span className="text-sm text-emerald-900 font-medium line-clamp-1">{item.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
