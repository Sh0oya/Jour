import { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';

// Constants
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;

interface UseGeminiLiveProps {
  apiKey: string;
  systemInstruction?: string;
  voiceName?: string;
  voiceResponseEnabled?: boolean;
}

export const useGeminiLive = ({ apiKey, systemInstruction, voiceName = 'Puck', voiceResponseEnabled = true }: UseGeminiLiveProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false); // Model is speaking
  const [error, setError] = useState<string | null>(null);
  const [currentVolume, setCurrentVolume] = useState(0);

  const sessionRef = useRef<any | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // Transcription State
  const transcriptRef = useRef<string>("");
  const currentInputTransRef = useRef<string>("");
  const currentOutputTransRef = useRef<string>("");

  // Initialize Audio Contexts
  const ensureAudioContexts = useCallback(() => {
    if (!inputContextRef.current) {
      inputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE,
      });
    }
    if (!outputContextRef.current) {
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });
      outputNodeRef.current = outputContextRef.current.createGain();
      outputNodeRef.current.connect(outputContextRef.current.destination);
    }
  }, []);

  const stop = useCallback(async () => {
    // 1. Close Session
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error("Error closing session", e);
      }
      sessionRef.current = null;
    }

    // 2. Stop Audio Input
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    if (inputProcessorRef.current) {
      inputProcessorRef.current.disconnect();
      inputProcessorRef.current = null;
    }
    if (inputContextRef.current?.state !== 'closed') {
      await inputContextRef.current?.close();
      inputContextRef.current = null;
    }

    // 3. Stop Audio Output
    sourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e){}
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    
    if(outputContextRef.current) {
       await outputContextRef.current.close();
       outputContextRef.current = null;
    }

    setIsConnected(false);
    setIsSpeaking(false);
    setCurrentVolume(0);
  }, []);

  const start = useCallback(async () => {
    if (isConnected) return;
    setError(null);
    transcriptRef.current = ""; // Reset transcript

    try {
      ensureAudioContexts();
      
      // Resume contexts if suspended
      if (inputContextRef.current?.state === 'suspended') await inputContextRef.current.resume();
      if (outputContextRef.current?.state === 'suspended') await outputContextRef.current.resume();

      // Get Mic Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const ai = new GoogleGenAI({ apiKey });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } },
          },
          systemInstruction: systemInstruction,
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setIsConnected(true);

            // Setup Input Processing
            if (!inputContextRef.current) return;
            
            const source = inputContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            const processor = inputContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);
            inputProcessorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate rough volume for visualizer
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setCurrentVolume(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const outputCtx = outputContextRef.current;
            if (!outputCtx || !outputNodeRef.current) return;

            // Handle Audio
            const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
              
              // Only play audio if enabled
              if (voiceResponseEnabled) {
                  setIsSpeaking(true);
                  const audioData = base64ToUint8Array(base64Audio);
                  const audioBuffer = await decodeAudioData(audioData, outputCtx, OUTPUT_SAMPLE_RATE);
                  
                  // Simple scheduling
                  if (nextStartTimeRef.current < outputCtx.currentTime) {
                    nextStartTimeRef.current = outputCtx.currentTime;
                  }
                  
                  const source = outputCtx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(outputNodeRef.current);
                  
                  source.addEventListener('ended', () => {
                    sourcesRef.current.delete(source);
                    if (sourcesRef.current.size === 0) {
                        setIsSpeaking(false);
                    }
                  });
                  
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                  sourcesRef.current.add(source);
              }
            }
            
            // Handle Transcription
            if (msg.serverContent?.outputTranscription) {
               currentOutputTransRef.current += msg.serverContent.outputTranscription.text;
            } else if (msg.serverContent?.inputTranscription) {
               currentInputTransRef.current += msg.serverContent.inputTranscription.text;
            }

            // Handle Turn Complete (Commit transcript)
            if (msg.serverContent?.turnComplete) {
               if (currentInputTransRef.current.trim()) {
                  transcriptRef.current += `User: ${currentInputTransRef.current}\n`;
                  currentInputTransRef.current = "";
               }
               if (currentOutputTransRef.current.trim()) {
                  transcriptRef.current += `June: ${currentOutputTransRef.current}\n`;
                  currentOutputTransRef.current = "";
               }
            }
            
            // Handle Interruption
            if (msg.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsSpeaking(false);
                // Also clear partial output transcript on interruption
                currentOutputTransRef.current = "";
            }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            stop();
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            setError("Connection error. Please try again.");
            stop();
          }
        }
      });
      
      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start session");
      stop();
    }
  }, [apiKey, isConnected, ensureAudioContexts, stop, systemInstruction, voiceName, voiceResponseEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, []);

  return {
    isConnected,
    isSpeaking,
    start,
    stop,
    error,
    currentVolume,
    getTranscript: () => transcriptRef.current // Expose transcript getter
  };
};
