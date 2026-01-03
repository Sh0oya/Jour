import React from 'react';
import { Calendar, Lock } from 'lucide-react';
import { JournalEntry, User, UserTier } from '../types';

interface HistoryProps {
  entries: JournalEntry[];
  user: User;
}

const History: React.FC<HistoryProps> = ({ entries, user }) => {
  return (
    <div className="pt-4 space-y-4">
      <h2 className="text-lg font-semibold text-emerald-900 px-2">Your Journal</h2>
      
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
                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-wide">Pro Feature</p>
                    <p className="text-xs text-emerald-800/60 mt-1">Unlock full history</p>
                 </div>
               )}
               
               <div className={`bg-white p-5 rounded-[2rem] shadow-sm transition-all ${isLocked ? 'opacity-50' : 'hover:shadow-md'}`}>
                 <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 text-gray-500">
                       <Calendar size={14} />
                       <span className="text-xs font-medium">{new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="text-xl">{entry.mood === 'GREAT' ? '🤩' : entry.mood === 'GOOD' ? '🙂' : '😐'}</div>
                 </div>
                 
                 <h3 className="text-emerald-900 font-semibold mb-1">{entry.summary.substring(0, 40)}...</h3>
                 <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                   {entry.transcript}
                 </p>
                 
                 <div className="mt-4 flex flex-wrap gap-2">
                    {entry.tags.map(tag => (
                      <span key={tag} className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        #{tag}
                      </span>
                    ))}
                 </div>
               </div>
            </div>
          );
        })}
      </div>
      
      {user.tier === UserTier.FREE && (
        <div className="p-6 text-center">
            <p className="text-sm text-gray-400 mb-2">You've reached the limit of free history.</p>
            <button className="text-emerald-700 font-semibold text-sm hover:underline">Restore previous entries</button>
        </div>
      )}
    </div>
  );
};

export default History;
