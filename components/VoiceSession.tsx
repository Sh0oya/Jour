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

  const handleStopAndSave = async () => {
    if (isSaving) return;
    await stop();
    setIsSaving(true);
    setAnalyzingText(settings.language === 'fr' ? "Analyse en cours..." : "Analyzing...");

    // Artificial wait to let the user feel the "thinking" process (and ensure audio buffer is fully flushed/processed)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const finalDuration = Math.max(durationRef.current, duration, 1);

    try {
      const transcript = getTranscript();
      let summary = "Note vocale";
      let mood = Mood.NEUTRAL;
      let tags: string[] = ["Vocal"];

      if (transcript && transcript.length > 10) {
        setAnalyzingText(settings.language === 'fr' ? "Détection des émotions..." : "Detecting emotions...");
        try {
          const ai = new GoogleGenAI({ apiKey });

          const jsonPrompt = `
            Tu es un expert en analyse émotionnelle. Analyse cette conversation de journal intime.

            RÈGLES STRICTES POUR LE MOOD :
            - GREAT : Enthousiasme, joie, excitation, bonnes nouvelles, accomplissements, gratitude
            - GOOD : Satisfaction, calme positif, journée correcte, petit plaisir, contentement
            - NEUTRAL : UNIQUEMENT si vraiment aucune émotion détectable ou sujet 100% factuel/administratif
            - BAD : Frustration, fatigue, stress, déception, inquiétude, journée difficile
            - TERRIBLE : Tristesse profonde, colère, détresse, crise, événement grave

            IMPORTANT :
            - La plupart des gens parlent avec une teinte émotionnelle. NEUTRAL doit être RARE (< 10% des cas).
            - Si la personne parle de sa journée normalement → GOOD (pas neutral)
            - Si elle mentionne quelque chose de positif même petit → GOOD ou GREAT
            - Si elle se plaint ou exprime de la fatigue → BAD
            - Analyse le TON, pas juste les mots. "Ça va" dit avec enthousiasme = GOOD, dit avec lassitude = BAD

            TÂCHES :
            1. Résumé : 2 phrases max
            2. Mood : UNE valeur parmi [GREAT, GOOD, NEUTRAL, BAD, TERRIBLE] - sois DÉCISIF
            3. Tags : 3-5 mots-clés
            4. Action Items : tâches/promesses mentionnées (tableau vide si aucune)

            JSON attendu :
            {
                "summary": "...",
                "mood": "GOOD",
                "tags": ["..."],
                "actionItems": []
            }

            Conversation à analyser :
            ${transcript}
          `;

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
                  actionItems: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                        completed: { type: Type.BOOLEAN }
                      }
                    }
                  }
                }
              }
            }
          });

          if (response.text) {
            const analysis = JSON.parse(response.text);
            console.log('AI Analysis result:', analysis); // Debug log

            summary = analysis.summary || summary;
            // Validate mood is a valid enum value
            if (analysis.mood && Object.values(Mood).includes(analysis.mood)) {
              mood = analysis.mood as Mood;
            }
            tags = analysis.tags || tags;

            // Process action items
            const actionItems = (analysis.actionItems || []).map((item: any) => ({
              ...item,
              id: crypto.randomUUID(),
              completed: false
            }));

            // Encrypt sensitive data before saving (RGPD compliance)
            const encryptionKey = await getOrCreateEncryptionKey(user.id);
            const encryptedSummary = await encrypt(summary, encryptionKey);
            const encryptedTranscript = await encrypt(transcript || "", encryptionKey);

            const { error } = await supabase.from('entries').insert({
              user_id: user.id,
              date: new Date().toISOString(),
              summary: encryptedSummary,
              transcript: encryptedTranscript,
              mood: mood,
              tags: tags,
              duration_seconds: finalDuration,
              action_items: actionItems
            });

            if (error) console.error("Error saving entry:", error);
            return; // Exit after successful save
          }
        } catch (analysisError) {
          console.error("Analysis failed:", analysisError);
        }
      }

      // Fallback Save - only if analysis failed
      const encryptionKey = await getOrCreateEncryptionKey(user.id);
      const encryptedSummary = await encrypt(summary, encryptionKey);
      const encryptedTranscript = await encrypt(transcript || "", encryptionKey);

      const { error } = await supabase.from('entries').insert({
        user_id: user.id,
        date: new Date().toISOString(),
        summary: encryptedSummary,
        transcript: encryptedTranscript,
        mood: mood,
        tags: tags,
        duration_seconds: finalDuration,
      });

      if (error) console.error("Error saving entry:", error);

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