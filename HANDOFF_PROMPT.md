# CONTEXTE PROJET : JOURNALY - PROMPT DE PASSATION

Tu reprends le développement de **Journaly**, un journal intime audio avec IA.

---

## CREDENTIALS & API KEYS

### Supabase
| Clé | Valeur |
|-----|--------|
| **Project Ref** | `lhcyhbudeybjqqjivifq` |
| **URL** | `https://lhcyhbudeybjqqjivifq.supabase.co` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxoY3loYnVkZXlianFxaml2aWZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczOTk4NzIsImV4cCI6MjA4Mjk3NTg3Mn0.9Jd7UFWwjYBMxvW2iUgH_H-7ZnkQbKjwo62lvG3l3ms` |
| **CLI Access Token** | `sbp_3de3f4a3a7b77a807a47061e84a653b0bf9e3e15` |

### Stripe
| Clé | Valeur |
|-----|--------|
| **Payment Link Mensuel** (6.90€) | `https://buy.stripe.com/3cI4gzb741RB0Whg8b7ok00` |
| **Payment Link Annuel** (70€) | `https://buy.stripe.com/fZu28rejg67R9sNf477ok01` |
| **Product ID Mensuel** | `prod_TX37pvXS5g2QO0` |
| **Product ID Annuel** | `prod_TX39kkalgnmXK8` |
| **Price ID Mensuel** | `price_1SZz1FFquI8bV4qH5jmBIkOO` |
| **Price ID Annuel** | `price_1SZz3BFquI8bV4qHtdbJkrnB` |
| **Webhook URL** | `https://lhcyhbudeybjqqjivifq.supabase.co/functions/v1/stripe-webhook` |
| **Secret Key** | ⚠️ À configurer : `supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx` |
| **Webhook Secret** | ⚠️ À configurer : `supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx` |

### Gemini (Google AI)
| Clé | Valeur |
|-----|--------|
| **Variable d'env** | `VITE_GEMINI_API_KEY` (dans `.env.local`, non versionné) |
| **Model Live Audio** | `gemini-2.5-flash-native-audio-preview-09-2025` |
| **Model Analyse** | `gemini-2.0-flash` |
| **Voix par défaut** | `Puck` |
| **Voix disponibles** | `Puck`, `Charon`, `Kore`, `Fenrir`, `Aoede` |

---

## RÉSUMÉ DU PROJET

**Journaly** = Journal intime vocal avec compagne IA "June" (Gemini Live API)

### Flux Principal
```
User parle → Gemini Live WebSocket → June répond vocalement
→ Fin session → Gemini Flash analyse (JSON: summary, mood, tags)
→ Sauvegarde Supabase
```

### Modèle Freemium
| Tier | Quota/jour | Pub avant session | Historique | Analytics |
|------|------------|-------------------|------------|-----------|
| FREE | 30 secondes | Oui (10s) | 3 entrées max | Bloqué |
| PRO | 20 minutes | Non | Illimité | Complet |

---

## STACK TECHNIQUE

| Technologie | Usage |
|-------------|-------|
| **React 19** + TypeScript 5.8 | Frontend |
| **Tailwind CSS v4** | Styling + Dark mode |
| **Vite 6** | Build tool |
| **Supabase** | PostgreSQL + Auth + Realtime |
| **Gemini Live API** | Conversation vocale WebSocket |
| **Gemini 2.0 Flash** | Analyse post-session (REST) |
| **Stripe Payment Links** | Paiement |
| **Recharts** | Graphiques analytics |
| **Lucide React** | Icônes |

---

## ARCHITECTURE FICHIERS

```
Jour/
├── App.tsx                 # État global, source de vérité
├── types.ts                # Types (User, JournalEntry, Mood, UserTier, UserGoal)
├── index.css               # Tailwind + dark mode classes
├── index.tsx               # Point d'entrée React
│
├── components/
│   ├── Auth.tsx            # Login/Signup avec sélection objectif
│   ├── Layout.tsx          # Shell UI + navigation bottom
│   ├── Dashboard.tsx       # Accueil + bouton session + barre quota journalier
│   ├── VoiceSession.tsx    # Session vocale avec June (CŒUR DE L'APP)
│   ├── History.tsx         # Historique des entrées (verrouillé FREE > 3)
│   ├── Analytics.tsx       # Stats humeur 7 jours (verrouillé FREE)
│   ├── Settings.tsx        # Préférences + checkout Stripe
│   └── DebugConsole.tsx    # Diagnostics système
│
├── hooks/
│   └── useGeminiLive.ts    # WebSocket bidirectionnel Gemini Live API
│
├── contexts/
│   └── SettingsContext.tsx # Dark mode, rappels navigateur, choix voix (localStorage)
│
├── lib/
│   └── supabase.ts         # Client Supabase (clés hardcodées)
│
├── utils/
│   └── audioUtils.ts       # Encodage/décodage PCM audio (16kHz → Base64)
│
├── supabase/
│   ├── config.toml         # Config Supabase CLI
│   └── functions/
│       └── stripe-webhook/ # Edge function Deno (à déployer)
│           └── index.ts
│
├── CLAUDE.md               # Documentation projet originale
├── STRIPE_INTEGRATION.md   # Guide intégration paiement
└── HANDOFF_PROMPT.md       # Ce fichier
```

---

## MODÈLE DE DONNÉES

### Types TypeScript (`types.ts`)

```typescript
enum UserTier {
  FREE = 'FREE',
  PRO = 'PRO'
}

enum UserGoal {
  JOURNAL = 'Journal Intime',
  MEMORY = 'Mémoire & Souvenirs',
  DISCIPLINE = 'Discipline & Habitudes',
  WORK = 'Travail & Productivité',
  OTHER = 'Autre'
}

enum Mood {
  GREAT = 'GREAT',
  GOOD = 'GOOD',
  NEUTRAL = 'NEUTRAL',
  BAD = 'BAD',
  TERRIBLE = 'TERRIBLE'
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  tier: UserTier;
  goal: UserGoal;
  streak: number;           // Jours consécutifs avec entrées
  totalWords: number;       // Mots total (lifetime)
  todayUsageSeconds: number; // Secondes utilisées aujourd'hui
}

interface JournalEntry {
  id: string;
  date: string;             // ISO timestamp
  summary: string;          // Résumé IA (2 lignes)
  transcript: string;       // Transcription complète User + June
  mood: Mood;               // Humeur détectée par Gemini
  tags: string[];           // Tags français générés (3-5)
  durationSeconds: number;  // Durée session
}
```

### Tables Supabase (À CRÉER)

#### Table `profiles`
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  tier TEXT DEFAULT 'FREE' CHECK (tier IN ('FREE', 'PRO')),
  goal TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'none',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS : Users peuvent lire leur profil
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- RLS : Users peuvent update SAUF le tier (protégé)
CREATE POLICY "Users can update own profile except tier" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND tier = (SELECT tier FROM public.profiles WHERE id = auth.uid())
  );

-- Index pour recherche Stripe
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
```

#### Table `entries`
```sql
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  summary TEXT NOT NULL,
  transcript TEXT NOT NULL,
  mood TEXT NOT NULL CHECK (mood IN ('GREAT', 'GOOD', 'NEUTRAL', 'BAD', 'TERRIBLE')),
  tags TEXT[] DEFAULT '{}',
  duration_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS : Users peuvent lire leurs entrées
CREATE POLICY "Users can read own entries" ON public.entries
  FOR SELECT USING (auth.uid() = user_id);

-- RLS : Users peuvent créer leurs entrées
CREATE POLICY "Users can insert own entries" ON public.entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Index pour tri par date
CREATE INDEX idx_entries_user_date ON public.entries(user_id, date DESC);
```

---

## INTÉGRATION GEMINI

### A. Gemini Live API (Session vocale temps réel)

**Fichier** : `hooks/useGeminiLive.ts`

```typescript
// Configuration
const MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

const systemInstruction = `Tu es June, une compagne de journal intime chaleureuse
et empathique. Tu parles UNIQUEMENT en français. Tu poses des questions ouvertes
et concises pour aider l'utilisateur à réfléchir sur sa journée. Garde tes
réponses brèves pour laisser l'utilisateur s'exprimer.
Ton: Serein, Intime, Sans jugement.`;

// Audio specs
- Input: 16kHz mono PCM encodé Base64
- Output: 24kHz mono (décodé via AudioContext)
- Voices: Puck (défaut), Charon, Kore, Fenrir, Aoede
```

**Fonctionnement** :
1. `start()` → Ouvre WebSocket vers Gemini Live
2. ScriptProcessorNode capture audio micro → PCM → Base64 → WebSocket
3. Gemini répond avec audio + transcription
4. `turnComplete` event → Ajoute au transcript
5. `stop()` → Ferme connexion, retourne transcript complet

### B. Gemini Flash API (Analyse post-session)

**Fichier** : `components/VoiceSession.tsx` (lignes 120-160)

```typescript
// Après fin de session, analyse du transcript
const analyzeTranscript = async (transcript: string) => {
  const ai = new GoogleGenAI({ apiKey });
  const model = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Analyse cette conversation de journal intime et retourne un JSON:
  {
    "summary": "Résumé en 2 phrases maximum",
    "mood": "GREAT|GOOD|NEUTRAL|BAD|TERRIBLE",
    "tags": ["tag1", "tag2", "tag3"] // 3-5 tags en français
  }

  Conversation:
  ${transcript}`;

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  });

  return JSON.parse(result.response.text());
};
```

---

## SYSTÈME DE QUOTAS

### Limites par Tier
| Tier | Limite quotidienne | En secondes |
|------|-------------------|-------------|
| FREE | 30 secondes | 30 |
| PRO | 20 minutes | 1200 |

### Implémentation

**1. Calcul usage du jour** (`App.tsx`)
```typescript
const todayUsage = entries
  .filter(e => new Date(e.date).toDateString() === new Date().toDateString())
  .reduce((sum, e) => sum + e.durationSeconds, 0);
```

**2. Calcul temps restant** (`VoiceSession.tsx`)
```typescript
const dailyLimit = user.tier === UserTier.PRO ? 1200 : 30;
const maxSessionDuration = Math.max(0, dailyLimit - user.todayUsageSeconds);
```

**3. Enforcement** (`VoiceSession.tsx`)
```typescript
// Timer vérifie chaque seconde
if (duration >= maxSessionDuration) {
  handleStopAndSave(); // Coupe automatiquement
}
```

**4. Pub avant session** (FREE uniquement)
- Timer 10s avec overlay publicitaire
- Skip impossible pour FREE

---

## PAIEMENT STRIPE

### Flow
```
1. User clique "Upgrade" → Settings.tsx
2. Redirection vers Stripe Payment Link avec client_reference_id=user.id
3. User paie (carte test: 4242 4242 4242 4242)
4. Stripe envoie webhook checkout.session.completed
5. Edge function met à jour profiles.tier = 'PRO'
6. User revient, app refetch → tier mis à jour
```

### Edge Function (`supabase/functions/stripe-webhook/index.ts`)

Gère les événements :
- `checkout.session.completed` → tier = 'PRO', subscription_status = 'active'
- `customer.subscription.updated` → Met à jour statut
- `customer.subscription.deleted` → tier = 'FREE', subscription_status = 'canceled'
- `invoice.payment_failed` → subscription_status = 'past_due'

---

## FONCTIONNALITÉS IMPLÉMENTÉES ✅

| Fonctionnalité | Fichier | Statut |
|----------------|---------|--------|
| Authentification (login/signup) | `Auth.tsx` | ✅ |
| Session vocale avec June | `VoiceSession.tsx` + `useGeminiLive.ts` | ✅ |
| Analyse IA post-session | `VoiceSession.tsx` | ✅ |
| Système de quotas | `App.tsx` + `VoiceSession.tsx` | ✅ |
| Pub avant session (FREE) | `VoiceSession.tsx` | ✅ |
| Historique des entrées | `History.tsx` | ✅ |
| Verrouillage historique (FREE > 3) | `History.tsx` | ✅ |
| Analytics humeur | `Analytics.tsx` | ✅ |
| Verrouillage analytics (FREE) | `Analytics.tsx` | ✅ |
| Dark mode | `SettingsContext.tsx` + `index.css` | ✅ |
| Rappels navigateur | `SettingsContext.tsx` | ✅ |
| Choix voix June | `Settings.tsx` + `SettingsContext.tsx` | ✅ |
| Checkout Stripe | `Settings.tsx` | ✅ |
| Console debug | `DebugConsole.tsx` | ✅ |

---

## TODO CRITIQUE ⏳

### 1. Créer les tables Supabase
Exécuter le SQL ci-dessus dans Supabase SQL Editor.

### 2. Déployer l'Edge Function
```bash
export SUPABASE_ACCESS_TOKEN=sbp_3de3f4a3a7b77a807a47061e84a653b0bf9e3e15
npx supabase link --project-ref lhcyhbudeybjqqjivifq
npx supabase functions deploy stripe-webhook
```

### 3. Configurer les Secrets Supabase
```bash
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_VOTRE_CLE
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET
```

### 4. Configurer le Webhook dans Stripe Dashboard
1. Aller sur https://dashboard.stripe.com/webhooks
2. Add endpoint : `https://lhcyhbudeybjqqjivifq.supabase.co/functions/v1/stripe-webhook`
3. Sélectionner events : `checkout.session.completed`, `customer.subscription.deleted`
4. Copier le signing secret → configurer comme `STRIPE_WEBHOOK_SECRET`

### 5. Tester le flow complet
1. Créer compte FREE
2. Aller dans Settings → Upgrade
3. Payer avec carte test `4242 4242 4242 4242`
4. Vérifier que tier = PRO dans Supabase

---

## PERSONNALITÉ DE JUNE

> "Tu es June, une compagne de journal intime chaleureuse et empathique. Tu parles UNIQUEMENT en français. Tu poses des questions ouvertes et concises pour aider l'utilisateur à réfléchir sur sa journée. Garde tes réponses brèves pour laisser l'utilisateur s'exprimer davantage. Ton: Serein, Intime, Sans jugement."

### Exemples de questions June
- "Comment s'est passée ta journée ?"
- "Qu'est-ce qui t'a marqué aujourd'hui ?"
- "Comment te sens-tu par rapport à ça ?"
- "Qu'est-ce que tu aimerais retenir de ce moment ?"

---

## COMMANDES DE DÉVELOPPEMENT

```bash
# Installation
npm install

# Développement (localhost:3000)
npm run dev

# Build production
npm run build

# Preview build
npm run preview

# Supabase CLI
export SUPABASE_ACCESS_TOKEN=sbp_3de3f4a3a7b77a807a47061e84a653b0bf9e3e15
npx supabase link --project-ref lhcyhbudeybjqqjivifq
npx supabase functions deploy stripe-webhook
npx supabase functions logs stripe-webhook
```

---

## DESIGN SYSTEM

### Couleurs
- **Primary** : Emerald-800 (`#2E5C55`)
- **Background** : Mint-50 (`#F5F9F8`)
- **Dark mode** : Classes Tailwind `dark:` prefix

### UI Patterns
- Cartes arrondies (`rounded-[2.5rem]`)
- Ombres douces (`shadow-sm`)
- Navigation bottom fixe
- Modales centrées avec backdrop

---

## DERNIERS COMMITS

| Hash | Message |
|------|---------|
| `3628e0b` | feat: Implement functional settings (dark mode, reminders, voice selection) |
| `44bf2d1` | fix: Multiple bug fixes and French localization |
| `97b92f7` | fix: Setup Tailwind CSS v4 for production |
| `ddaebcf` | fix: Use Vite env variable for Gemini API key |
| `8bd16ab` | feat: Add Stripe payment integration |

---

## INSTRUCTIONS POUR L'ASSISTANT

Quand tu travailles sur ce projet :

1. **Respecte l'architecture** - État global dans `App.tsx`, pas de Redux/Zustand
2. **Utilise les types** définis dans `types.ts`
3. **Langue UI** : Français uniquement
4. **Style** : Tailwind CSS v4, couleur primaire emerald
5. **Gemini** : Utilise les modèles spécifiés (Live pour audio, Flash pour analyse)
6. **Sécurité** : Ne jamais permettre au client de modifier `tier` directement

---

## STATUT GLOBAL

**Progression** : ~90% complet

- ✅ Core fonctionnel (auth, voice, quotas, history, analytics, settings)
- ⏳ Stripe webhook à déployer
- ⏳ Tables Supabase à créer
- ⏳ Test E2E du flow paiement

**Prêt pour production après configuration paiement !**
