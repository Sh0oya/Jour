import React, { useState } from 'react';
import { Calendar, Lock } from 'lucide-react';
import { JournalEntry, User, UserTier, Mood } from '../types';
import EntryModal from './EntryModal';
import { useSettings } from '../contexts/SettingsContext';

interface HistoryProps {
  entries: JournalEntry[];
  user: User;
  onEntryUpdate?: (updatedEntry: JournalEntry) => void;
  onUpgrade?: () => void;
}

const getMoodEmoji = (mood: Mood | string) => {
  switch (mood) {
    case Mood.GREAT:
    case 'GREAT':
      return '🤩';
    case Mood.GOOD:
    case 'GOOD':
      return '🙂';
    case Mood.NEUTRAL:
    case 'NEUTRAL':
      return '😐';
    case Mood.BAD:
    case 'BAD':
      return '😔';
    case Mood.TERRIBLE:
    case 'TERRIBLE':
      return '😢';
    default:
      return '🙂';
  }
};

const History: React.FC<HistoryProps> = ({ entries, user, onEntryUpdate, onUpgrade }) => {
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const { t } = useSettings();

  const handleEntryClick = (entry: JournalEntry, isLocked: boolean) => {
    if (!isLocked) {
      setSelectedEntry(entry);
    }
  };

  const handleEntryUpdate = (updatedEntry: JournalEntry) => {
    if (onEntryUpdate) {
      onEntryUpdate(updatedEntry);
    }
    setSelectedEntry(null);
  };

  return (
    <div className="pt-4 space-y-4">
      <h2 className="text-lg font-semibold text-emerald-900 px-2">{t('your_journal')}</h2>

      <div className="space-y-4">
        {entries.map((entry, index) => {
          // Logic: Free users only see top 3 entries unlocked
          const isLocked = user.tier === UserTier.FREE && index >= 3;

          return (
            <div key={entry.id} className="relative group">
               {isLocked && (
                 <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-10 rounded-[2rem] flex flex-col items-center justify-center border border-gray-100">
                    <div className="bg-emerald-900 text-white p-3 rounded-full mb-2 shadow-lg">
                       <Lock size={20} />
                    </div>
                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">{t('pro_feature')}</p>
                    <p className="text-xs text-emerald-800/60 mt-1">{t('unlock_history')}</p>
                 </div>
               )}

               <button
                 onClick={() => handleEntryClick(entry, isLocked)}
                 className={`w-full text-left bg-white p-5 rounded-[2rem] shadow-sm transition-all ${
                   isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:scale-[1.01] cursor-pointer active:scale-[0.99]'
                 }`}
               >
                 <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-gray-500">
                       <Calendar size={14} />
                       <span className="text-xs font-medium">
                         {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                       </span>
                    </div>
                    <div className="text-xl">{getMoodEmoji(entry.mood)}</div>
                 </div>

                 <h3 className="text-emerald-900 font-semibold mb-1">
                   {entry.summary.length > 50 ? entry.summary.substring(0, 50) + '...' : entry.summary}
                 </h3>
                 <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                   {entry.transcript}
                 </p>

                 <div className="mt-4 flex flex-wrap gap-2">
                    {entry.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        #{tag}
                      </span>
                    ))}
                 </div>
               </button>
            </div>
          );
        })}
      </div>

      {user.tier === UserTier.FREE && entries.length > 3 && (
        <div className="p-6 text-center">
            <p className="text-sm text-gray-400 mb-2">{t('history_limit')}</p>
            <button onClick={onUpgrade} className="text-emerald-700 font-semibold text-sm hover:underline">{t('unlock_history')}</button>
        </div>
      )}

      {entries.length === 0 && (
        <div className="p-12 text-center">
          <p className="text-gray-400">{t('no_entries')}</p>
          <p className="text-sm text-gray-300 mt-1">{t('start_session_hint')}</p>
        </div>
      )}

      {/* Entry Modal */}
      {selectedEntry && (
        <EntryModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={handleEntryUpdate}
        />
      )}
    </div>
  );
};

export default History;
