# Journaly - Documentation Projet

## 1. Vue d'ensemble du Produit

**Journaly** est un journal intime audio piloté par IA ("June").

### Flux Principal
```
User parle → Gemini Live API (WebSocket) → Réponse + Transcription → Fin session → Gemini Flash analyse (résumé, humeur, tags) → Sauvegarde Supabase
```

### Modèle Économique
**Freemium** avec quotas de temps quotidiens et fonctionnalités bloquées (historique, analytics).

> "An intelligent audio journal that listens, understands, and organizes your life."

---

## 2. Stack Technique

| Technologie | Usage |
|-------------|-------|
| **React 19** | Framework frontend |
| **TypeScript** | Typage statique |
| **Tailwind CSS** | Styles |
| **Vite** | Build tool & dev server |
| **Supabase** | PostgreSQL + Auth + Realtime |
| **Google Gemini** | Live API (WebSocket) + Flash 2.0 (REST) |
| **Recharts** | Graphiques |
| **Lucide React** | Icônes |

### Gestion d'état
- React Local State (`App.tsx` comme source de vérité)
- Supabase Realtime pour la sync

---

## 3. Architecture des Fichiers

```
Jour/
├── App.tsx                 # Composant principal, état global (SOURCE DE VÉRITÉ)
├── index.tsx               # Point d'entrée React
├── types.ts                # Types (User, JournalEntry, Mood, etc.)
│
├── components/
│   ├── Auth.tsx            # Connexion/inscription
│   ├── Layout.tsx          # Navigation
│   ├── Dashboard.tsx       # Accueil + bouton "Start Session" + Daily Allowance bar
│   ├── VoiceSession.tsx    # Session vocale avec June (COEUR DE L'APP)
│   ├── History.tsx         # Historique des entrées (cadenas si FREE > 3 jours)
│   ├── Analytics.tsx       # Stats et graphiques (cadenas si FREE)
│   └── Settings.tsx        # Paramètres + Upgrade + Checkout
│
├── hooks/
│   └── useGeminiLive.ts    # Hook audio bidirectionnel avec Gemini
│
├── lib/
│   └── supabase.ts         # Client Supabase
│
└── utils/
    └── audioUtils.ts       # Utilitaires audio (PCM, décodage)
```

---

## 4. Architecture des Données (Supabase)

### Tables

#### `auth.users` (géré par Supabase Auth)

#### `public.profiles`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | FK vers auth.users |
| `first_name` | text | Prénom |
| `last_name` | text | Nom |
| `tier` | enum | `'FREE'` \| `'PRO'` — **Cible des webhooks paiement** |
| `goal` | enum | Objectif utilisateur |
| `stripe_customer_id` | text (nullable) | **À implémenter** |
| `subscription_status` | text (nullable) | **À implémenter** (`active`, `canceling`, `past_due`) |

#### `public.entries`
| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | PK |
| `user_id` | uuid | FK vers profiles |
| `date` | timestamp | Date de l'entrée |
| `summary` | text | Résumé généré par IA |
| `transcript` | text | Transcription complète |
| `mood` | enum | GREAT, GOOD, NEUTRAL, BAD, TERRIBLE |
| `tags` | text[] | Tags générés par IA |
| `duration_seconds` | int | **Utilisé pour calculer le quota journalier** |

---

## 5. Système de Quotas (Hard Limits)

### Limites par Tier
| Tier | Limite/jour | Pub avant session |
|------|-------------|-------------------|
| **FREE** | 30 secondes (cumulatif) | 10 secondes |
| **PRO** | 20 minutes / 1200s (cumulatif) | Aucune |

### Mécanisme (côté client)
1. Au chargement (`App.tsx`) : somme `duration_seconds` des entrées du jour
2. Temps restant passé à `VoiceSession.tsx`
3. Session coupée automatiquement (`WebSocket session.close()`) à la limite

### Code concerné
- `App.tsx:113-119` : Calcul de `todayUsage`
- `VoiceSession.tsx:21-28` : Calcul de `maxSessionDuration`
- `VoiceSession.tsx:77-81` : Enforcement de la limite

---

## 6. Modèles TypeScript

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

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  tier: UserTier;
  goal: UserGoal;
  streak: number;
  totalWords: number;
  todayUsageSeconds: number;
}

enum Mood {
  GREAT = 'GREAT',
  GOOD = 'GOOD',
  NEUTRAL = 'NEUTRAL',
  BAD = 'BAD',
  TERRIBLE = 'TERRIBLE'
}

interface JournalEntry {
  id: string;
  date: string;
  summary: string;
  transcript: string;
  mood: Mood;
  tags: string[];
  durationSeconds: number;
}
```

---

## 7. Intégration Paiement (Stripe)

### Configuration Stripe (Payment Links)
```typescript
// Settings.tsx - Redirection vers Stripe Payment Links
const STRIPE_LINKS = {
  monthly: 'https://buy.stripe.com/3cI4gzb741RB0Whg8b7ok00',  // 6,90€/mois
  yearly: 'https://buy.stripe.com/fZu28rejg67R9sNf477ok01',   // 70€/an
};

const handleCheckout = (plan: 'monthly' | 'yearly') => {
  const checkoutUrl = `${STRIPE_LINKS[plan]}?client_reference_id=${user.id}&prefilled_email=${encodeURIComponent(user.email)}`;
  window.location.href = checkoutUrl;
};
```

### IDs Stripe
| Plan | Prix | Product ID | Price ID |
|------|------|------------|----------|
| Mensuel | 6,90€/mois | `prod_TX37pvXS5g2QO0` | `price_1SZz1FFquI8bV4qH5jmBIkOO` |
| Annuel | 70€/an (~15%) | `prod_TX39kkalgnmXK8` | `price_1SZz3BFquI8bV4qHtdbJkrnB` |

### Supabase
- **Project Ref** : `lhcyhbudeybjqqjivifq`
- **URL** : `https://lhcyhbudeybjqqjivifq.supabase.co`

### Architecture Cible (À implémenter)

```
┌─────────────┐     1. Clic "Upgrade"      ┌─────────────────┐
│   Frontend  │ ──────────────────────────▶│ Stripe Checkout │
│ Settings.tsx│                            │  (Page hébergée)│
└─────────────┘                            └────────┬────────┘
                                                    │
       ┌────────────────────────────────────────────┘
       │ 2. Paiement réussi
       ▼
┌─────────────────┐  3. Webhook POST   ┌──────────────────┐
│     Stripe      │ ──────────────────▶│ Supabase Edge    │
│    Serveurs     │                    │ Function         │
└─────────────────┘                    └────────┬─────────┘
                                                │ 4. UPDATE profiles
                                                ▼
                                       ┌──────────────────┐
                                       │    Supabase DB   │
                                       │  tier = 'PRO'    │
                                       └──────────────────┘
```

### Edge Functions à créer

#### `create-checkout-session`
- Reçoit `price_id` + `access_token`
- Récupère/crée `stripe_customer_id`
- Génère session Stripe Checkout
- Retourne URL de redirection

#### `stripe-webhook`
Écoute les événements Stripe :
- `checkout.session.completed` → `tier = 'PRO'`, `subscription_status = 'active'`
- `customer.subscription.deleted` → `tier = 'FREE'`, `subscription_status = 'canceled'`

#### `create-portal-session`
- Génère lien Stripe Customer Portal
- Permet annulation/changement de carte

---

## 8. Design System

### Couleurs
- **Primary** : Emerald-800 (`#2E5C55`) — Actions principales
- **Background** : Mint-50 (`#F5F9F8`) — Fond

### Comportements UX
- **FREE** : Cadenas sur historique > 3 jours + Analytics
- **Clic sur élément verrouillé** → Modale d'upgrade
- **Dashboard** : Barre "Daily Allowance" reflète le statut PRO instantanément

---

## 9. Sécurité

### Row Level Security (RLS)
- Tables `profiles` et `entries` : politiques strictes (`auth.uid() = user_id`)

### Protection du Tier
- **INTERDIT** : Update de `tier` via API client publique
- **SEULE** la "Service Role Key" (webhook) peut modifier ce champ

### Variables d'environnement
```bash
# .env.local (frontend)
GEMINI_API_KEY=xxx
VITE_SUPABASE_URL=xxx
VITE_SUPABASE_ANON_KEY=xxx

# Supabase Edge Functions (secrets)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

---

## 10. Personnalité de June

> "Warm, empathetic, curious journaling companion. Asks concise, open-ended questions to help the user reflect on their day. Keep responses brief to let the user talk more. Tone: Serene, Intimate, Non-judgmental."

### Configuration Gemini
- **Model Live** : `gemini-2.5-flash-native-audio-preview-09-2025`
- **Model Analyse** : `gemini-3-flash-preview`
- **Voice** : `Puck`

---

## 11. Commandes

```bash
npm install    # Installer dépendances
npm run dev    # Serveur de dev
npm run build  # Build production

# Supabase Edge Functions
supabase functions new <name>
supabase secrets set KEY=value
supabase functions deploy <name>
```

---

## 12. Liens Utiles
- AI Studio App: https://ai.studio/apps/drive/1p9At8e9XNIp3rRqLhPrcwjlARP_34NoN
