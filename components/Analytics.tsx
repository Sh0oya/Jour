import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Lock, TrendingUp } from 'lucide-react';
import { User, UserTier, JournalEntry, Mood } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface AnalyticsProps {
  user: User;
  entries: JournalEntry[];
}

const Analytics: React.FC<AnalyticsProps> = ({ user, entries }) => {
  const isLocked = user.tier === UserTier.FREE;
  const { t } = useSettings();

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
      const dayEntries = entries.filter(e =>
        new Date(e.date).toDateString() === date.toDateString()
      );

      let score = 0;
      if (dayEntries.length > 0) {
        const total = dayEntries.reduce((sum, e) => {
          switch (e.mood) {
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

  // 3. Mood Description
  const moodDescription = useMemo(() => {
    const score = parseFloat(avgScore as string);
    if (score >= 9) return "Radiant";
    if (score >= 7.5) return "Great";
    if (score >= 6) return "Good";
    if (score >= 4.5) return "Stable";
    if (score >= 3) return "Low";
    return "Struggling";
  }, [avgScore]);

  // 4. Mood Distribution (Pie Chart)
  const moodData = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => {
      counts[e.mood] = (counts[e.mood] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [entries]);

  const COLORS = {
    [Mood.GREAT]: '#10B981', // emerald-500
    [Mood.GOOD]: '#34D399',  // emerald-400
    [Mood.NEUTRAL]: '#9CA3AF', // gray-400
    [Mood.BAD]: '#F59E0B',   // amber-500
    [Mood.TERRIBLE]: '#EF4444' // red-500
  };

  // 5. Top Tags
  const topTags = useMemo(() => {
    const counts: Record<string, number> = {};
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    entries
      .filter(e => new Date(e.date) >= thirtyDaysAgo)
      .flatMap(e => e.tags || [])
      .forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [entries]);

  return (
    <div className="pt-4 space-y-6 pb-24">
      <h2 className="text-lg font-semibold text-emerald-900 px-2">{t('mood_today')} Analysis</h2>

      {/* Main Trend Chart */}
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
                  <stop offset="5%" stopColor="#065F46" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#065F46" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Area type="monotone" dataKey="score" stroke="#065F46" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mood Distribution */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex flex-col items-center">
        <h3 className="text-emerald-900 font-bold mb-4 w-full text-left">{t('mood_distribution')}</h3>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={moodData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {moodData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as Mood] || '#CBD5E1'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Tags Cloud */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm">
        <h3 className="text-emerald-900 font-bold mb-4">{t('top_tags')}</h3>
        <div className="flex flex-wrap gap-2">
          {topTags.map((tag, i) => (
            <span
              key={i}
              className="bg-emerald-50 text-emerald-800 font-medium px-4 py-2 rounded-xl text-sm"
              style={{ fontSize: Math.min(1.5, 0.8 + (tag.count * 0.1)) + 'rem', opacity: 0.7 + (tag.count * 0.1) }}
            >
              {tag.name}
            </span>
          ))}
          {topTags.length === 0 && <p className="text-gray-400 text-sm italic">Pas assez de données...</p>}
        </div>
      </div>

      {/* Lock Overlay for PRO */}
      {isLocked && (
        <div className="fixed inset-0 top-0 left-0 bg-white/10 backdrop-blur-[2px] z-50 pointer-events-none flex flex-col items-center justify-center p-8">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl text-center pointer-events-auto max-w-sm">
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-700">
              <Lock size={32} />
            </div>
            <h2 className="text-2xl font-bold text-emerald-900 mb-2">Analytics Pro</h2>
            <p className="text-gray-600 mb-6">Débloquez les analyses détaillées de vos émotions et thèmes pour mieux vous comprendre.</p>
            <button className="bg-emerald-800 text-white px-8 py-3 rounded-xl font-bold w-full hover:bg-emerald-900 transition">
              Passer PRO
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;