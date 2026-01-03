import React, { useMemo } from 'react';
import { Play, Smile, Zap, Clock, Lock } from 'lucide-react';
import { User, Mood, UserTier } from '../types';

interface DashboardProps {
  user: User;
  onStartSession: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onStartSession }) => {
  // Limits configuration
  const LIMITS = {
    [UserTier.FREE]: 30, // 30 seconds
    [UserTier.PRO]: 20 * 60 // 20 minutes
  };

  const dailyLimit = LIMITS[user.tier];
  // Ensure we don't show negative remaining time
  const remainingSeconds = Math.max(0, dailyLimit - (user.todayUsageSeconds || 0));
  const usagePercent = Math.min(100, ((user.todayUsageSeconds || 0) / dailyLimit) * 100);
  
  const formatTime = (secs: number) => {
    if (secs < 60) return `${secs}s`;
    return `${Math.ceil(secs / 60)}m`;
  };

  const isLimitReached = remainingSeconds <= 0;

  return (
    <div className="space-y-6 pt-4">
      {/* Usage Limit Bar (New Requirement) */}
      <div className="bg-white px-5 py-4 rounded-[2rem] shadow-sm flex flex-col gap-2">
         <div className="flex justify-between items-center text-xs font-bold uppercase tracking-wider text-gray-400">
            <span className="flex items-center gap-1"><Clock size={12} /> Daily Allowance</span>
            <span className={isLimitReached ? "text-red-500" : "text-emerald-600"}>
              {formatTime(remainingSeconds)} remaining
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
             Free Plan limited to 30s/day. <span className="text-emerald-600 font-bold">Upgrade for 20m.</span>
           </p>
         ) : (
           <p className="text-[10px] text-center text-gray-400 mt-1">
             Pro Plan limited to 20m/day. <span className="text-emerald-600 font-bold">Enjoy your session.</span>
           </p>
         )}
      </div>

      {/* Hero Action */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <button 
          onClick={onStartSession}
          disabled={isLimitReached}
          className={`relative w-full py-8 px-6 rounded-[2.5rem] flex flex-col items-center justify-center gap-3 shadow-xl transition-all active:scale-[0.98] ${isLimitReached ? 'bg-gray-100 cursor-not-allowed' : 'bg-emerald-800 text-white hover:bg-emerald-900'}`}
        >
          {isLimitReached ? (
             <>
               <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                 <Lock className="text-gray-400" size={32} />
               </div>
               <h2 className="text-xl font-semibold text-gray-500">Daily limit reached</h2>
               <p className="text-gray-400 text-sm">Come back tomorrow</p>
             </>
          ) : (
             <>
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                  <Play fill="currentColor" size={32} className="ml-1" />
                </div>
                <h2 className="text-xl font-semibold">Tell me about your day</h2>
                <p className="text-emerald-100/70 text-sm">Tap to start talking with June</p>
             </>
          )}
        </button>
      </div>

      {/* Quick Pills */}
      <div className={`flex gap-3 overflow-x-auto no-scrollbar pb-2 ${isLimitReached ? 'opacity-50 pointer-events-none' : ''}`}>
        {['✨ A Victory', '💡 An Idea', '🍵 Calm Moment', '😤 Rant'].map((pill) => (
          <button key={pill} onClick={onStartSession} className="whitespace-nowrap px-5 py-2.5 bg-white border border-emerald-100 rounded-full text-emerald-800 text-sm font-medium hover:bg-emerald-50 transition shadow-sm">
            {pill}
          </button>
        ))}
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Mood Card */}
        <div className="col-span-1 bg-white p-5 rounded-[2rem] shadow-sm flex flex-col justify-between h-40">
           <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase text-gray-400">Current Mood</span>
              <Smile size={18} className="text-emerald-600" />
           </div>
           <div className="text-center">
              <span className="text-4xl">😌</span>
              <p className="text-emerald-900 font-semibold mt-2">Peaceful</p>
           </div>
        </div>

        {/* Streak Card */}
        <div className="col-span-1 bg-[#FDF6E3] p-5 rounded-[2rem] shadow-sm flex flex-col justify-between h-40 border border-orange-100">
           <div className="flex justify-between items-start">
              <span className="text-xs font-bold uppercase text-orange-400">Streak</span>
              <Zap size={18} className="text-orange-500" />
           </div>
           <div className="text-center">
              <span className="text-4xl font-bold text-orange-800">{user.streak}</span>
              <p className="text-orange-800/80 text-sm mt-1">Days in a row</p>
           </div>
        </div>

        {/* Last Entry Ticket */}
        <div className="col-span-2 bg-white p-5 rounded-[2rem] shadow-sm border-l-4 border-l-emerald-800 relative overflow-hidden">
           <div className="flex justify-between items-center mb-3">
             <span className="text-xs font-bold uppercase text-gray-400">Last Memory</span>
             <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md">Yesterday</span>
           </div>
           <p className="text-emerald-900 font-medium leading-relaxed line-clamp-2">
             "Felt really productive finishing that design system. The coffee shop was noisy but handled it well..."
           </p>
           <div className="mt-4 flex gap-2">
              <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full text-gray-600">#Productivity</span>
              <span className="text-[10px] bg-gray-100 px-2 py-1 rounded-full text-gray-600">#Focus</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;