import React, { useEffect, useState, useRef } from 'react';
import { X, Mic, Lock, Loader2, Sparkles } from 'lucide-react';
import { useGeminiLive } from '../hooks/useGeminiLive';
import { User, UserTier, Mood, AIPersonality } from '../types';
import { supabase } from '../lib/supabase';
import { GoogleGenAI, Type } from "@google/genai";
import { useSettings } from '../contexts/SettingsContext';
import { getOrCreateEncryptionKey, encrypt } from '../utils/crypto';

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

  const { settings } = useSettings();

  // Limits configuration
  const LIMITS = {
    [UserTier.FREE]: 30,      // 30 seconds total per day
    [UserTier.PRO]: 20 * 60   // 20 minutes total per day
  };

  const dailyLimit = LIMITS[user.tier];
  const maxSessionDuration = Math.max(0, dailyLimit - (user.todayUsageSeconds || 0));

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  // Dynamic System Instruction Construction
  const getSystemInstruction = () => {
    const isFr = settings.language === 'fr';
    let base = isFr
      ? "Tu es June, une compagne de journal intime."
      : "You are June, a journaling companion.";

    // Personality injection
    switch (settings.personality) {
      case AIPersonality.EMPATHETIC:
        base += isFr
          ? " Sois chaleureuse, douce et très empathique. Pose des questions délicates."
          : " Be warm, gentle, and very empathetic. Ask delicate questions.";
        break;
      case AIPersonality.COACH:
        base += isFr
          ? " Sois énergique, motivante et orientée vers l'action. Pousse l'utilisateur à se dépasser."
          : " Be energetic, motivating, and action-oriented. Push the user to exceed themselves.";
        break;
      case AIPersonality.DIRECT:
        base += isFr
          ? " Sois directe, franche et concise. Va droit au but sans fioritures."
          : " Be direct, frank, and concise. Get straight to the point without fluff.";
        break;
      case AIPersonality.CUSTOM:
        base += isFr
          ? " Adapte-toi au style de l'utilisateur."
          : " Adapt to the user's style.";
        break;
      default:
        base += isFr
          ? " Sois équilibrée et bienveillante."
          : " Be balanced and kind.";
    }

    base += isFr
      ? " Pose des questions courtes pour aider à l'introspection."
      : " Ask short questions to help with introspection.";

    if (!settings.voiceResponse) {
      base += isFr
        ? " RÉPONDS DE MANIÈRE TRÈS COURTE (1 phrase max) car l'utilisateur ne peut pas t'entendre, il lit juste la transcription."
        : " REPLY VERY SHORTLY (1 sentence max) because the user cannot hear you, only read transcript.";
    }

    return base;
  };

  const { isConnected, isSpeaking, start, stop, currentVolume, error, getTranscript } = useGeminiLive({
    apiKey,
    systemInstruction: getSystemInstruction(),
    voiceName: settings.voiceName,
    voiceResponseEnabled: settings.voiceResponse
  });

  const durationInterval = useRef<any>(undefined);
  const durationRef = useRef<number>(0);
  const [limitReached, setLimitReached] = useState(false);

  // Determine Ad based on Tier
  useEffect(() => {
    if (maxSessionDuration <= 0) {
      setLimitReached(true);
      return;
    }
    if (user.tier === UserTier.FREE) {
      setAdTimer(10);
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
          durationRef.current = newDuration;
          if (newDuration >= maxSessionDuration) {
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
  }, [isConnected, maxSessionDuration]);

  // Background analysis function - updates entry after save
  const analyzeInBackground = async (entryId: string, transcript: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const jsonPrompt = `Analyse cette conversation de journal. Sois DÉCISIF sur le mood.
MOOD: GREAT=joie/enthousiasme, GOOD=satisfaction/normal, NEUTRAL=factuel uniquement, BAD=frustration/fatigue, TERRIBLE=détresse
Si la personne parle normalement de sa journée → GOOD (pas neutral). NEUTRAL est RARE.

JSON: {"summary":"2 phrases max","mood":"GOOD","tags":["3-5 mots"],"actionItems":[]}

Conversation: ${transcript}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: jsonPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              mood: { type: Type.STRING, enum: Object.values(Mood) },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              actionItems: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { text: { type: Type.STRING } } } }
            }
          }
        }
      });

      if (response.text) {
        const analysis = JSON.parse(response.text);
        console.log('Background analysis result:', analysis);

        // Encrypt updated summary
        const encryptionKey = await getOrCreateEncryptionKey(user.id);
        const encryptedSummary = await encrypt(analysis.summary || "Note vocale", encryptionKey);

        // Validate mood
        const validMood = Object.values(Mood).includes(analysis.mood) ? analysis.mood : Mood.GOOD;

        // Update entry with analysis results
        const { error } = await supabase
          .from('entries')
          .update({
            summary: encryptedSummary,
            mood: validMood,
            tags: analysis.tags || ['Vocal'],
            action_items: (analysis.actionItems || []).map((item: any) => ({
              id: crypto.randomUUID(),
              text: item.text,
              completed: false
            }))
          })
          .eq('id', entryId);

        if (error) console.error("Background update error:", error);
        else console.log('Entry updated with analysis');
      }
    } catch (e) {
      console.error("Background analysis failed:", e);
    }
  };

  const handleStopAndSave = async () => {
    if (isSaving) return;
    await stop();
    setIsSaving(true);
    setAnalyzingText(settings.language === 'fr' ? "Sauvegarde..." : "Saving...");

    const finalDuration = Math.max(durationRef.current, duration, 1);

    try {
      const transcript = getTranscript();

      // Encrypt data immediately
      const encryptionKey = await getOrCreateEncryptionKey(user.id);
      const encryptedSummary = await encrypt("Analyse en cours...", encryptionKey);
      const encryptedTranscript = await encrypt(transcript || "", encryptionKey);

      // SAVE IMMEDIATELY with default mood (GOOD) - no waiting!
      const { data, error } = await supabase.from('entries').insert({
        user_id: user.id,
        date: new Date().toISOString(),
        summary: encryptedSummary,
        transcript: encryptedTranscript,
        mood: Mood.GOOD, // Default to GOOD, will be updated by background analysis
        tags: ['Vocal'],
        duration_seconds: finalDuration,
        action_items: []
      }).select('id').single();

      if (error) {
        console.error("Error saving entry:", error);
      } else if (data && transcript && transcript.length > 10) {
        // Launch background analysis (don't await - fire and forget)
        analyzeInBackground(data.id, transcript);
      }

    } catch (e) {
      console.error("Save error", e);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} `;
  };

  // UI Render (Simplified for brevity, ensuring visual consistency)
  if (limitReached) {
    return (
      <div className="absolute inset-0 z-50 bg-emerald-900 flex flex-col items-center justify-center text-white p-8 text-center">
        <Lock size={48} className="mb-4 text-emerald-300" />
        <h2 className="text-2xl font-bold">Limite atteinte</h2>
        <button onClick={onClose} className="mt-8 bg-white text-emerald-900 px-6 py-3 rounded-xl font-bold">Retour</button>
      </div>
    );
  }

  if (adTimer !== null && adTimer > 0) {
    return (
      <div className="absolute inset-0 z-50 bg-emerald-900 flex flex-col items-center justify-center text-white">
        <div className="text-4xl font-bold animate-pulse">{adTimer}</div>
        <p className="mt-4 opacity-50">Publicité (Version Gratuite)</p>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-emerald-800 to-emerald-900 text-white flex flex-col">
      <div className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`w - 2 h - 2 rounded - full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'} `}></div>
          <span className="text-sm font-medium opacity-80">{isConnected ? (settings.language === 'fr' ? 'En direct' : 'Live') : 'Connexion...'}</span>
        </div>
        <button onClick={() => handleStopAndSave()} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div
          className="absolute w-64 h-64 bg-emerald-400/20 rounded-full blur-[60px] transition-all duration-300"
          style={{ transform: `scale(${1 + currentVolume * 2})` }}
        ></div>

        <div className="relative z-10 w-48 h-48 rounded-full bg-gradient-to-tr from-emerald-600 to-mint-200 shadow-2xl flex items-center justify-center transition-transform duration-100 overflow-hidden">
          <div className={`absolute inset - 0 bg - white / 20 ${isSpeaking && settings.voiceResponse ? 'animate-pulse' : ''} `}></div>
          {isSpeaking && settings.voiceResponse ? (
            <div className="flex gap-1 items-center h-12">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="w-2 bg-emerald-900 rounded-full animate-bounce" style={{ height: `${20 + Math.random() * 40} px`, animationDelay: `${i * 0.1} s` }}></div>
              ))}
            </div>
          ) : (
            <Mic size={40} className="text-emerald-900 opacity-50" />
          )}
        </div>

        <div className="mt-12 text-center space-y-2">
          {isSaving ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin" />
              <span>{analyzingText}</span>
            </div>
          ) : (
            <>
              <p className="text-2xl font-light">
                {isSpeaking ? (settings.voiceResponse ? "June..." : "June (Muted)") : (settings.language === 'fr' ? "À l'écoute..." : "Listening...")}
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full text-sm font-mono bg-white/10">
                {formatTime(duration)}
              </div>
            </>
          )}
        </div>
      </div>

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