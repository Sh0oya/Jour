import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import VoiceSession from './components/VoiceSession';
import { Auth } from './components/Auth';
import DebugConsole from './components/DebugConsole';
import { Tab, User, UserTier, UserGoal, JournalEntry, Mood } from './types';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  
  // Default Guest User State
  const [user, setUser] = useState<User>({
    id: 'guest',
    email: '',
    firstName: 'Guest',
    lastName: '',
    fullName: 'Guest',
    tier: UserTier.FREE,
    goal: UserGoal.JOURNAL,
    streak: 0,
    totalWords: 0,
    todayUsageSeconds: 0
  });

  // 1. Listen for Auth Changes
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) console.error("Session check error:", error);
        setSession(session);
      } catch (err) {
        console.error("Unexpected auth error:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Fetch Data (Profile + Entries)
  useEffect(() => {
    if (session?.user) {
      const fetchData = async () => {
        try {
            // A. Fetch Profile from DB (Source of Truth)
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();

            // Fallback to Auth Metadata if DB profile missing (e.g. before SQL script was run)
            const meta = session.user.user_metadata || {};
            const firstName = profileData?.first_name || meta.firstName || 'User';
            const lastName = profileData?.last_name || meta.lastName || '';
            const tier = (profileData?.tier as UserTier) || meta.tier || UserTier.FREE;
            const goal = (profileData?.goal as UserGoal) || meta.goal || UserGoal.JOURNAL;

            // B. Fetch Entries from DB
            const { data: entryData, error: entryError } = await supabase
            .from('entries')
            .select('*')
            .order('date', { ascending: false });
            
            if (entryError) console.error("Error fetching entries:", entryError);

            let mappedEntries: JournalEntry[] = [];
            let totalWords = 0;
            let todayUsage = 0;
            let streak = 0;

            if (entryData) {
              mappedEntries = entryData.map((e: any) => ({
                  id: e.id,
                  date: e.date,
                  summary: e.summary,
                  transcript: e.transcript,
                  mood: e.mood as Mood,
                  tags: e.tags || [],
                  durationSeconds: e.duration_seconds || 0
              }));

              // Calculate Stats
              const now = new Date();
              const todayString = now.toDateString();

              // 1. Total Words
              totalWords = mappedEntries.reduce((acc, entry) => {
                  return acc + (entry.transcript ? entry.transcript.split(' ').length : 0);
              }, 0);

              // 2. Today's Usage (Critical for Limits)
              todayUsage = mappedEntries.reduce((acc, entry) => {
                  const entryDate = new Date(entry.date);
                  if (entryDate.toDateString() === todayString) {
                      return acc + (entry.durationSeconds || 0);
                  }
                  return acc;
              }, 0);

              // 3. Streak Calculation
              if (mappedEntries.length > 0) {
                  streak = 1;
                  const lastEntryDate = new Date(mappedEntries[0].date);
                  const diffTime = Math.abs(now.getTime() - lastEntryDate.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                  if (diffDays <= 2) streak = mappedEntries.length > 5 ? 5 : mappedEntries.length; 
              }
            }

            setUser({
              id: session.user.id,
              email: session.user.email,
              firstName,
              lastName,
              fullName: `${firstName} ${lastName}`.trim(),
              tier,
              goal,
              streak, 
              totalWords,
              todayUsageSeconds: todayUsage
            });

            setEntries(mappedEntries);
        } catch (err) {
            console.error("Data fetch error:", err);
        }
      };
      
      fetchData();
    }
  }, [session, isSessionActive]); // Re-fetch when session status changes

  const handleStartSession = () => {
    setIsSessionActive(true);
  };

  const handleEndSession = async () => {
    setIsSessionActive(false);
  };

  const handleToggleTier = async () => {
    const newTier = user.tier === UserTier.FREE ? UserTier.PRO : UserTier.FREE;
    
    // Update both Auth and DB Profile
    await supabase.auth.updateUser({ data: { tier: newTier } });
    await supabase.from('profiles').update({ tier: newTier }).eq('id', user.id);

    // Optimistic UI Update
    setUser(prev => ({ ...prev, tier: newTier }));
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-mint-50 flex-col gap-4">
        <Loader2 className="animate-spin text-emerald-800" size={32} />
        <p className="text-emerald-800/60 text-sm">Loading June...</p>
        <DebugConsole />
      </div>
    );
  }

  return (
    <>
      <DebugConsole />
      {!session ? (
        <Auth />
      ) : isSessionActive ? (
        <VoiceSession user={user} onClose={handleEndSession} />
      ) : (
        <Layout activeTab={activeTab} onTabChange={setActiveTab} user={user}>
          {activeTab === Tab.DASHBOARD && (
            <Dashboard user={user} onStartSession={handleStartSession} />
          )}
          {activeTab === Tab.HISTORY && (
            <History entries={entries} user={user} />
          )}
          {activeTab === Tab.ANALYTICS && (
            <Analytics user={user} entries={entries} />
          )}
          {activeTab === Tab.SETTINGS && (
            <Settings user={user} onToggleTier={handleToggleTier} />
          )}
        </Layout>
      )}
    </>
  );
};

export default App;