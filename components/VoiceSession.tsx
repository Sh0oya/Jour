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
  const [analyzingText, setAnalyzingText] = useState("Sauvegarde en cours...");
  
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

  // Get saved voice preference or default to Puck
  const savedVoice = localStorage.getItem('juneVoice') || 'Puck';

  const { isConnected, isSpeaking, start, stop, currentVolume, error, getTranscript } = useGeminiLive({
    apiKey,
    systemInstruction: "Tu es June, une compagne de journal intime chaleureuse, empathique et curieuse. Pose des questions ouvertes et concises pour aider l'utilisateur à réfléchir sur sa journée. Garde tes réponses brèves pour laisser l'utilisateur parler davantage. Ton: Serein, Intime, Bienveillant. Parle toujours en français.",
    voiceName: savedVoice
  });

  const durationInterval = useRef<any>(undefined);
  const durationRef = useRef<number>(0); // Track actual duration for saving

  const [limitReached, setLimitReached] = useState(false);

  // Determine Ad based on Tier
  useEffect(() => {
    // If user has no time left, show limit message
    if (maxSessionDuration <= 0) {
        setLimitReached(true);
        return;
    }

    if (user.tier === UserTier.FREE) {
      setAdTimer(10); // 10s ad for free
    } else {
      setAdTimer(0);
    }
  }, [user.tier, maxSessionDuration]);

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
           durationRef.current = newDuration; // Keep ref in sync

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
    setAnalyzingText("Analyse de ta journée...");

    // Use ref for accurate duration (state might be stale)
    const finalDuration = Math.max(durationRef.current, duration, 1);

    try {
      // 2. Get accumulated transcript
      const transcript = getTranscript();
      console.log("Full Transcript:", transcript);

      let summary = "Note vocale";
      let mood = Mood.NEUTRAL;
      let tags: string[] = ["Vocal"];
      
      // 3. Generate Analysis with Gemini (only if transcript has content)
      if (transcript && transcript.length > 10) {
        setAnalyzingText("Génération des insights...");
        try {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: `Analyse la conversation suivante entre un utilisateur et une assistante IA (June).
                Génère un objet JSON contenant:
                1. 'summary': Un résumé concis à la première personne de la journée/pensées de l'utilisateur (max 2 phrases, en français).
                2. 'mood': Un parmi [GREAT, GOOD, NEUTRAL, BAD, TERRIBLE] qui correspond le mieux au sentiment de l'utilisateur.
                3. 'tags': Un tableau de 3-5 tags courts (en français) extraits du contenu.

                Transcription:
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
          summary = "Note vocale courte";
      }

      setAnalyzingText("Sauvegarde dans le cloud...");

      // 4. Save to Supabase
      console.log('Saving entry with duration:', finalDuration, 'seconds');
      const { error } = await supabase.from('entries').insert({
        user_id: user.id,
        date: new Date().toISOString(),
        summary: summary,
        transcript: transcript || "(No transcript available)",
        mood: mood,
        tags: tags,
        duration_seconds: finalDuration,
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

  // Render Daily Limit Reached Screen
  if (limitReached) {
    return (
      <div className="absolute inset-0 z-50 bg-emerald-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="mb-6 bg-white/10 p-6 rounded-2xl backdrop-blur-sm">
          <Lock size={48} className="mx-auto mb-4 text-emerald-300" />
          <h2 className="text-2xl font-bold mb-2">Limite quotidienne atteinte</h2>
          <p className="opacity-80 text-sm mb-4">
            Tu as utilisé tes {user.tier === UserTier.FREE ? '30 secondes' : '20 minutes'} aujourd'hui.
          </p>
          <p className="opacity-60 text-xs">
            {user.tier === UserTier.FREE
              ? 'Passe à Pro pour 20 minutes par jour !'
              : 'Reviens demain pour continuer ton journal.'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="bg-white text-emerald-900 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition"
        >
          Retour
        </button>
      </div>
    );
  }

  // Render Ad Overlay
  if (adTimer !== null && adTimer > 0) {
    return (
      <div className="absolute inset-0 z-50 bg-emerald-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <div className="mb-6 bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
          <p className="text-sm uppercase tracking-widest opacity-70 mb-2">Publicité</p>
          <h2 className="text-2xl font-bold">Réfléchis avec clarté</h2>
          <p className="opacity-80 mt-2 text-sm">Passe à Pro pour une expérience sans pub et plus de temps.</p>
        </div>
        <div className="w-16 h-16 rounded-full border-4 border-emerald-500 flex items-center justify-center text-2xl font-bold animate-pulse">
          {adTimer}
        </div>
        <p className="mt-8 text-sm opacity-50">Connexion à June...</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-emerald-800 to-emerald-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
           <span className="text-sm font-medium opacity-80">{isConnected ? 'En direct avec June' : 'Connexion...'}</span>
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
                    {isSpeaking ? "June parle..." : "À l'écoute..."}
                </p>
                <div className={`inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-mono ${duration >= maxSessionDuration - 10 ? 'bg-red-500/20 text-red-200 animate-pulse' : 'bg-white/10'}`}>
                    {formatTime(duration)} 
                    <span className="opacity-60"> / {formatTime(maxSessionDuration)}</span>
                </div>
                <p className="text-xs text-white/40">
                  Limite quotidienne : {user.tier === UserTier.FREE ? '30s' : '20min'}
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