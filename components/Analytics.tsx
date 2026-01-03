import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Lock, TrendingUp } from 'lucide-react';
import { User, UserTier, JournalEntry, Mood } from '../types';

interface AnalyticsProps {
  user: User;
  entries: JournalEntry[];
}

const Analytics: React.FC<AnalyticsProps> = ({ user, entries }) => {
  const isLocked = user.tier === UserTier.FREE;

  // 1. Calculate Chart Data (Last 7 Days)
  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - i));
      return d;
    });

    return last7Days.map(date => {
      const dayName = days[date.getDay()];
      // Find entries for this day
      const dayEntries = entries.filter(e => 
        new Date(e.date).toDateString() === date.toDateString()
      );

      // Average score for the day
      let score = 0;
      if (dayEntries.length > 0) {
        const total = dayEntries.reduce((sum, e) => {
          switch(e.mood) {
            case Mood.GREAT: return sum + 10;
            case Mood.GOOD: return sum + 8;
            case Mood.NEUTRAL: return sum + 5;
            case Mood.BAD: return sum + 3;
            case Mood.TERRIBLE: return sum + 1;
            default: return sum + 5;
          }
        }, 0);
        score = total / dayEntries.length;
      }

      return { name: dayName, score: parseFloat(score.toFixed(1)) };
    });
  }, [entries]);

  // 2. Calculate Average Score
  const avgScore = useMemo(() => {
    const validScores = chartData.filter(d => d.score > 0);
    if (validScores.length === 0) return 0;
    const sum = validScores.reduce((acc, curr) => acc + curr.score, 0);
    return (sum / validScores.length).toFixed(1);
  }, [chartData]);

  // 3. Calculate Mood Description
  const moodDescription = useMemo(() => {
    const score = parseFloat(avgScore as string);
    if (score >= 9) return "Radiant";
    if (score >= 7.5) return "Great";
    if (score >= 6) return "Good";
    if (score >= 4.5) return "Stable";
    if (score >= 3) return "Low";
    return "Struggling";
  }, [avgScore]);

  // 4. Calculate Stats
  const totalSpokenMinutes = useMemo(() => {
    const seconds = entries.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
    return Math.floor(seconds / 60);
  }, [entries]);

  const topEmotion = useMemo(() => {
    if (entries.length === 0) return "None";
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    return Object.entries(counts).sort((a,b) => b[1] - a[1])[0][0];
  }, [entries]);

  return (
    <div className="pt-4 space-y-6">
       <h2 className="text-lg font-semibold text-emerald-900 px-2">Mood Analysis</h2>

       {/* Main Chart */}
       <div className="relative bg-white p-6 rounded-[2.5rem] shadow-sm h-80 flex flex-col">
          <div className="flex justify-between items-center mb-6">
             <div>
               <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Weekly Trend</p>
               <div className="flex items-center gap-2">
                 <h3 className="text-2xl font-bold text-emerald-900">{moodDescription}</h3>
                 <TrendingUp size={20} className="text-green-500" />
               </div>
             </div>
             <div className="text-right">
                <p className="text-3xl font-bold text-emerald-800">{avgScore}</p>
                <p className="text-xs text-gray-400">Avg Score</p>
             </div>
          </div>

          <div className="flex-1 w-full relative">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={chartData}>
                 <defs>
                   <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#2E5C55" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#2E5C55" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9CA3AF'}} />
                 <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                 <Area type="monotone" dataKey="score" stroke="#2E5C55" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
               </AreaChart>
             </ResponsiveContainer>

             {/* Lock Overlay */}
             {isLocked && (
               <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-2xl">
                  <div className="bg-emerald-900 text-white p-4 rounded-full shadow-xl mb-3">
                     <Lock size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-900">Unlock Insights</h3>
                  <p className="text-sm text-center text-emerald-800/70 max-w-[200px] mt-1">
                    Visualize your emotional journey with Journaly Pro.
                  </p>
                  <button className="mt-4 px-6 py-2 bg-emerald-800 text-white rounded-full text-sm font-semibold shadow-lg hover:bg-emerald-900 transition">
                    Go Pro
                  </button>
               </div>
             )}
          </div>
       </div>

       {/* Stats Grid */}
       <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-[2rem] shadow-sm">
             <p className="text-gray-400 text-xs font-bold uppercase mb-2">Total spoken</p>
             <p className="text-2xl font-bold text-emerald-800">{totalSpokenMinutes}m</p>
             <p className="text-xs text-green-500 mt-1">Lifetime</p>
          </div>
          <div className="bg-white p-5 rounded-[2rem] shadow-sm">
             <p className="text-gray-400 text-xs font-bold uppercase mb-2">Top Emotion</p>
             <p className="text-2xl font-bold text-emerald-800 capitalize">{topEmotion.toLowerCase()}</p>
             <p className="text-xs text-gray-400 mt-1">Most frequent</p>
          </div>
       </div>
    </div>
  );
};

export default Analytics;