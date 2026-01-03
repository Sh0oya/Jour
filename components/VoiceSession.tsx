import React, { useEffect, useState, useRef } from 'react';
import { X, Mic, Lock, Loader2, Sparkles } from 'lucide-react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { User, UserTier, Mood } from '../types';
import { supabase } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";

interface VoiceSessionProps {
  user: User;
  onClose: () => void;
}

const VoiceSession: React.FC<VoiceSessionProps> = ({ user, onClose }) => {
  const [adTimer, setAdTimer] = useState<number | null>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [analyzingText, setAnalyzingText] = useState("Saving your memory...");
  
  // Calculate specific time limits based on user history
  const LIMITS = {
    [UserTier.FREE]: 30,      // 30 seconds total per day
    [UserTier.PRO]: 20 * 60   // 20 minutes total per day
  };
  
  const dailyLimit = LIMITS[user.tier];
  // The max duration for THIS specific session is (Daily Limit - Already Used Today)
  const maxSessionDuration = Math.max(0, dailyLimit - (user.todayUsageSeconds || 0));

  // Gemini API Key from environment variable
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''; 

  const { isConnected, isSpeaking, start, stop, currentVolume, error, getTranscript } = useGeminiLive({
    apiKey,
    systemInstruction: "You are June, a warm, empathetic, and curious journaling companion. Ask concise, open-ended questions to help the user reflect on their day. Keep responses brief to let the user talk more. Tone: Serene, Intimate, Non-judgmental.",
    voiceName: 'Puck'
  });

  const durationInterval = useRef<any>(undefined);

  // Determine Ad based on Tier
  useEffect(() => {
    // If user has no time left, close immediately (sanity check)
    if (maxSessionDuration <= 0) {
        onClose();
        return;
    }

    if (user.tier === UserTier.FREE) {
      setAdTimer(10); // 10s ad for free
    } else {
      setAdTimer(0);
    }
  }, [user.tier, maxSessionDuration, onClose]);

  // Start ad timer
  useEffect(() => {
    if (adTimer !== null && adTimer > 0) {
      const interval = setInterval(() => {
        setAdTimer((prev) => (prev && prev > 1 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(interval);
    } else if (adTimer === 0 && !sessionStarted) {
      start();
      setSessionStarted(true);
    }
  }, [adTimer, sessionStarted, start]);

  // Session duration timer & Limit Enforcement
  useEffect(() => {
    if (isConnected) {
      durationInterval.current = setInterval(() => {
        setDuration(prev => {
           const newDuration = prev + 1;
           
           // CRITICAL: Check against calculated remaining time, not just static 30s
           if (newDuration >= maxSessionDuration) {
               // We must stop inside the interval to be precise
               clearInterval(durationInterval.current);
               handleStopAndSave(); 
           }
           return newDuration;
        });
      }, 1000);
    } else {
      clearInterval(durationInterval.current);
    }
    return () => clearInterval(durationInterval.current);
  }, [isConnected, maxSessionDuration]); // Dependency on maxSessionDuration is key

  const handleStopAndSave = async () => {
    // Prevent double save if called multiple times
    if (isSaving) return;
    
    // 1. Stop audio session
    await stop();
    setIsSaving(true);
    setAnalyzingText("Analyzing your day...");

    try {
      // 2. Get accumulated transcript
      const transcript = getTranscript();
      console.log("Full Transcript:", transcript);

      let summary = "Audio journal entry";
      let mood = Mood.NEUTRAL;
      let tags: string[] = ["Voice"];
      
      // 3. Generate Analysis with Gemini (only if transcript has content)
      if (transcript && transcript.length > 10) {
        setAnalyzingText("Generating insights...");
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Analyze the following conversation between a user and an AI assistant (June). 
                Generate a JSON object containing:
                1. 'summary': A concise, first-person summary of the user's day/thoughts (max 2 sentences).
                2. 'mood': One of [GREAT, GOOD, NEUTRAL, BAD, TERRIBLE] that best matches the user's sentiment.
                3. 'tags': An array of 3-5 short topic tags (strings) extracted from the content.
                
                Transcript:
                ${transcript}`,
                config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            summary: { type: Type.STRING },
                            mood: { type: Type.STRING, enum: Object.values(Mood) },
                            tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                        },
                        required: ["summary", "mood", "tags"]
                    }
                }
            });

            if (response.text) {
                const analysis = JSON.parse(response.text);
                summary = analysis.summary;
                mood = analysis.mood as Mood;
                tags = analysis.tags;
            }
        } catch (analysisError) {
            console.error("Analysis failed:", analysisError);
            // Fallback values are already set
        }
      } else {
          // If transcript is empty or too short
          summary = "Short voice note";
      }

      setAnalyzingText("Saving to cloud...");

      // 4. Save to Supabase
      const { error } = await supabase.from('entries').insert({
        user_id: user.id,
        date: new Date().toISOString(),
        summary: summary, 
        transcript: transcript || "(No transcript available)", 
        mood: mood,
        tags: tags,
        duration_seconds: duration,
      });
      
      // UPDATE: We should theoretically update the profile's today_usage_seconds here too, 
      // but simpler to let the trigger or the next fetch handle it. 
      // For immediate UI consistency, we rely on the App.tsx re-fetch.
      
      if (error) {
          console.error("Error saving entry:", error);
      }
    } catch (e) {
        console.error("Save error", e);
    } finally {
        setIsSaving(false);
        onClose();
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Render Ad Overlay
  if (adTimer !== null && adTimer > 0) {
    return (
      <div className="absolute inset-0 z-50 bg-emerald-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="mb-6 bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
          <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Advertisement</p>
          <h2 className="text-2xl font-bold">Reflect with Clarity</h2>
          <p className="opacity-80 mt-2 text-sm">Upgrade to Pro for an ad-free experience and unlimited session time.</p>
        </div>
        <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center text-2xl font-bold animate-pulse">
          {adTimer}
        </div>
        <p className="mt-8 text-sm opacity-50">Connecting to June...</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-emerald-800 to-emerald-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
           <span className="text-sm font-medium opacity-80">{isConnected ? 'Live with June' : 'Connecting...'}</span>
        </div>
        <button onClick={() => handleStopAndSave()} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
          <X size={20} />
        </button>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative">
        {/* Ambient Glow */}
        <div 
           className="absolute w-64 h-64 bg-emerald-400/20 rounded-full blur-[60px] transition-all duration-300"
           style={{ transform: `scale(${1 + currentVolume * 2})` }}
        ></div>

        {/* Central Orb */}
        <div className="relative z-10 w-48 h-48 rounded-full bg-gradient-to-tr from-emerald-600 to-mint-200 shadow-2xl flex items-center justify-center transition-transform duration-100 overflow-hidden">
             <div className={`absolute inset-0 bg-white/20 ${isSpeaking ? 'animate-pulse' : ''}`}></div>
             {isSpeaking ? (
                 <div className="flex gap-1 items-center h-12">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="w-2 bg-emerald-900 rounded-full animate-bounce" style={{ height: `${20 + Math.random() * 40}px`, animationDelay: `${i*0.1}s`}}></div>
                    ))}
                 </div>
             ) : (
                <Mic size={40} className="text-emerald-900 opacity-50" />
             )}
        </div>

        {/* Status Text */}
        <div className="mt-12 text-center space-y-2">
          {isSaving ? (
            <div className="flex flex-col items-center justify-center gap-3">
                <div className="relative">
                   <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 animate-pulse"></div>
                   <Sparkles className="text-emerald-300 animate-pulse" size={32} />
                </div>
                <div className="flex items-center gap-2 text-emerald-100/90 font-medium">
                  <Loader2 className="animate-spin" size={18} /> {analyzingText}
                </div>
            </div>
          ) : (
            <>
                <p className="text-2xl font-light">
                    {isSpeaking ? "June is speaking..." : "Listening..."}
                </p>
                <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-mono ${duration >= maxSessionDuration - 10 ? 'bg-red-500/20 text-red-200 animate-pulse' : 'bg-white/10'}`}>
                    {formatTime(duration)} 
                    <span className="opacity-60"> / {formatTime(maxSessionDuration)}</span>
                </div>
                <p className="text-xs text-white/40">
                  Daily Limit: {user.tier === UserTier.FREE ? '30s' : '20m'}
                </p>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      {!isSaving && (
        <div className="p-8 pb-12 flex justify-center">
            <button 
            onClick={() => handleStopAndSave()}
            className="bg-red-500/80 hover:bg-red-600 text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition transform hover:scale-105"
            >
            <X size={32} />
            </button>
        </div>
      )}
      
      {error && (
         <div className="absolute top-20 left-4 right-4 bg-red-500 text-white p-3 rounded-xl text-center text-sm">
            {error}
         </div>
      )}
    </div>
  );
};

export default VoiceSession;