import React, { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { JournalEntry, Mood } from '../types';
import { supabase } from '../lib/supabase';

interface EntryModalProps {
  entry: JournalEntry;
  onClose: () => void;
  onUpdate: (updatedEntry: JournalEntry) => void;
}

const MOOD_OPTIONS = [
  { value: Mood.GREAT, emoji: '🤩', label: 'Super', color: 'bg-green-500' },
  { value: Mood.GOOD, emoji: '🙂', label: 'Bien', color: 'bg-emerald-500' },
  { value: Mood.NEUTRAL, emoji: '😐', label: 'Neutre', color: 'bg-gray-400' },
  { value: Mood.BAD, emoji: '😔', label: 'Pas top', color: 'bg-orange-500' },
  { value: Mood.TERRIBLE, emoji: '😢', label: 'Difficile', color: 'bg-red-500' },
];

const EntryModal: React.FC<EntryModalProps> = ({ entry, onClose, onUpdate }) => {
  const [selectedMood, setSelectedMood] = useState<Mood>(entry.mood);
  const [saving, setSaving] = useState(false);

  const handleSaveMood = async () => {
    if (selectedMood === entry.mood) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('entries')
        .update({ mood: selectedMood })
        .eq('id', entry.id);

      if (error) {
        console.error('Error updating mood:', error);
      } else {
        onUpdate({ ...entry, mood: selectedMood });
      }
    } catch (e) {
      console.error('Update failed:', e);
    } finally {
      setSaving(false);
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-emerald-900">Modifier l'entrée</h2>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {formatDate(entry.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(entry.durationSeconds)}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Résumé</p>
            <p className="text-emerald-900 bg-mint-50 p-4 rounded-xl">{entry.summary}</p>
          </div>

          {/* Mood Selector */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Comment te sentais-tu ?</p>
            <div className="grid grid-cols-5 gap-2">
              {MOOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedMood(option.value)}
                  className={`flex flex-col items-center p-3 rounded-2xl transition-all ${
                    selectedMood === option.value
                      ? 'bg-emerald-100 ring-2 ring-emerald-500 scale-105'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-2xl mb-1">{option.emoji}</span>
                  <span className={`text-[10px] font-medium ${
                    selectedMood === option.value ? 'text-emerald-700' : 'text-gray-500'
                  }`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          {entry.tags && entry.tags.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {entry.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transcript Preview */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Transcription</p>
            <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl line-clamp-4">
              {entry.transcript || "Aucune transcription disponible"}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
          >
            Annuler
          </button>
          <button
            onClick={handleSaveMood}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-semibold text-white bg-emerald-800 hover:bg-emerald-700 transition disabled:opacity-50"
          >
            {saving ? 'Sauvegarde...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EntryModal;
