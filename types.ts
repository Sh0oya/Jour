export enum UserTier {
  FREE = 'FREE',
  PRO = 'PRO'
}

export enum UserGoal {
  JOURNAL = 'Journal Intime',
  MEMORY = 'Mémoire & Souvenirs',
  DISCIPLINE = 'Discipline & Habitudes',
  WORK = 'Travail & Productivité',
  OTHER = 'Autre'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  tier: UserTier;
  goal: UserGoal;
  streak: number;
  totalWords: number;
  todayUsageSeconds: number; // To track daily limits across devices
}

export enum Mood {
  GREAT = 'GREAT',
  GOOD = 'GOOD',
  NEUTRAL = 'NEUTRAL',
  BAD = 'BAD',
  TERRIBLE = 'TERRIBLE'
}

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  summary: string;
  transcript: string;
  mood: Mood;
  tags: string[];
  durationSeconds: number;
}

export interface AudioVisualizerState {
  isSpeaking: boolean;
  volume: number;
}

// Navigation Tabs
export enum Tab {
  DASHBOARD = 'DASHBOARD',
  HISTORY = 'HISTORY',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS'
}