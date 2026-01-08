import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import VoiceSession from './components/VoiceSession';
import { Auth } from './components/Auth';

import { Tab, User, UserTier, UserGoal, JournalEntry, Mood } from './types';
import { supabase } from './lib/supabase';
import { Loader2 } from 'lucide-react';
import { SettingsProvider } from './contexts/SettingsContext';
import { getOrCreateEncryptionKey, decrypt, isEncrypted } from './utils/crypto';

const AppContent: React.FC = () => {
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
            // Get encryption key for decryption
            const encryptionKey = await getOrCreateEncryptionKey(session.user.id);

            // Map and decrypt entries
            mappedEntries = await Promise.all(entryData.map(async (e: any) => {
              let summary = e.summary || '';
              let transcript = e.transcript || '';

              // Decrypt if encrypted (RGPD compliance)
              if (isEncrypted(summary)) {
                summary = await decrypt(summary, encryptionKey);
              }
              if (isEncrypted(transcript)) {
                transcript = await decrypt(transcript, encryptionKey);
              }

              return {
                id: e.id,
                date: e.date,
                summary,
                transcript,
                mood: e.mood as Mood,
                tags: e.tags || [],
                durationSeconds: e.duration_seconds || 0
              };
            }));

            // Calculate Stats
            const now = new Date();

            // 1. Total Words
            totalWords = mappedEntries.reduce((acc, entry) => {
              return acc + (entry.transcript ? entry.transcript.split(' ').length : 0);
            }, 0);

            // 2. Today's Usage (Critical for Limits)
            const todayDateString = now.toISOString().split('T')[0]; // YYYY-MM-DD format
            todayUsage = mappedEntries.reduce((acc, entry) => {
              const entryDateString = new Date(entry.date).toISOString().split('T')[0];
              if (entryDateString === todayDateString) {
                return acc + (entry.durationSeconds || 0);
              }
              return acc;
            }, 0);

            console.log('Today usage calculated:', todayUsage, 'seconds');

            // 3. Streak Calculation (consecutive days with entries)
            if (mappedEntries.length > 0) {
              // Get unique dates (YYYY-MM-DD format) sorted descending
              const uniqueDates = [...new Set(
                mappedEntries.map(e => new Date(e.date).toISOString().split('T')[0])
              )].sort().reverse();

              const today = now.toISOString().split('T')[0];
              const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

              // Check if user has entry today or yesterday (streak still valid)
              if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
                streak = 1;

                // Count consecutive days backwards
                for (let i = 1; i < uniqueDates.length; i++) {
                  const currentDate = new Date(uniqueDates[i - 1]);
                  const prevDate = new Date(uniqueDates[i]);
                  const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

                  if (diffDays === 1) {
                    streak++;
                  } else {
                    break; // Streak broken
                  }
                }
              } else {
                streak = 0; // No recent entry, streak reset
              }
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

      </div>
    );
  }

  return (
    <>

      {!session ? (
        <Auth />
      ) : isSessionActive ? (
        <VoiceSession user={user} onClose={handleEndSession} />
      ) : (
        <Layout activeTab={activeTab} onTabChange={setActiveTab} user={user}>
          {activeTab === Tab.DASHBOARD && (
            <Dashboard user={user} entries={entries} onStartSession={handleStartSession} />
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

const App: React.FC = () => (
  <SettingsProvider>
    <AppContent />
  </SettingsProvider>
);

export default App;