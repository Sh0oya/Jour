# Journaly - Notes de Session (8 Janvier 2026)

## Ce qui a été fait

### 1. Stripe - Gestion d'abonnement
- [x] Créé Edge Function `create-portal-session` pour le Customer Portal Stripe
- [x] Modifié `Settings.tsx` pour appeler dynamiquement le portal (plus d'URL test hardcodée)
- [ ] **À faire** : Déployer la fonction avec `supabase functions deploy create-portal-session`

### 2. Chiffrement E2E (RGPD)
- [x] Créé `utils/crypto.ts` avec chiffrement AES-256-GCM
- [x] Les `transcript` et `summary` sont chiffrés côté client avant envoi à Supabase
- [x] Déchiffrement automatique à la récupération dans `App.tsx`
- [x] Ajouté section "Sécurité & Chiffrement" dans Settings avec :
  - Export de la clé de chiffrement
  - Import/restauration de la clé

### 3. RGPD - Consentement
- [x] Ajouté checkbox RGPD obligatoire à l'inscription (`Auth.tsx`)
- [x] Créé page `PrivacyPolicy.tsx` avec :
  - Explication du chiffrement E2E
  - Données collectées
  - Droits RGPD (accès, rectification, suppression, export)
  - Hébergement et sous-traitants
  - Contact : contact@journaly.fr

### 4. Analyse d'humeur améliorée
- [x] **Sauvegarde instantanée** - Plus d'attente pour l'utilisateur
- [x] **Analyse en arrière-plan** - L'IA analyse après la sauvegarde
- [x] **Mood par défaut = GOOD** (au lieu de NEUTRAL)
- [x] Prompt IA raccourci et plus décisif
- [x] **Modification manuelle du mood** :
  - Clic sur une entrée dans History → Modal
  - Choix parmi 5 moods : 🤩 🙂 😐 😔 😢
  - Sauvegarde directe en base

### 5. Capacitor / iOS
- [x] Installé Capacitor (`@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`)
- [x] Créé `capacitor.config.ts`
- [x] Créé `codemagic.yaml` pour CI/CD iOS
- [x] Ajouté support safe-area iOS dans `index.css`
- [x] Mis à jour `index.html` avec meta tags iOS

### 6. Codemagic - Configuration en cours
- [x] Repo GitHub connecté : `Sh0oya/Jour`
- [x] Variables d'environnement configurées (groupe `journaly_env`) :
  - `VITE_SUPABASE_URL` = `https://lhcyhbudeybjqqjivifq.supabase.co` (non secret)
  - `VITE_SUPABASE_ANON_KEY` = `***` (secret ✓)
  - `VITE_GEMINI_API_KEY` = `***` (secret ✓)
- [x] Inscription Apple Developer Program (99$/an) - **En attente de validation (24-48h)**

---

## Ce qu'il reste à faire

### Priorité Haute - Après validation Apple

#### Apple Developer (dès validation reçue)
1. [ ] **Créer l'App ID** sur developer.apple.com :
   - Certificates, Identifiers & Profiles → Identifiers → +
   - Bundle ID : `com.journaly.app`
   - Capability : Push Notifications ✓

2. [ ] **Créer la clé API** sur appstoreconnect.apple.com :
   - Users and Access → Integrations → App Store Connect API → +
   - Name : `Codemagic`
   - Access : `App Manager`
   - **Télécharger le .p8** (une seule fois !)
   - Noter : **Issuer ID** + **Key ID**

3. [ ] **Créer l'app** sur App Store Connect :
   - Apps → + → New App
   - Bundle ID : `com.journaly.app`
   - SKU : `journaly-app`

4. [ ] **Configurer Codemagic** :
   - Developer Portal → Connecter avec la clé API (.p8)
   - Nommer l'intégration : `Journaly_ASC`

5. [ ] **Lancer le premier build** → Upload automatique TestFlight

6. [ ] **Créer groupe Beta Testers** sur TestFlight

#### Stripe Production
- [ ] Déployer Edge Function : `supabase functions deploy create-portal-session`
- [ ] Vérifier que `STRIPE_SECRET_KEY` est en mode **LIVE** (pas test)
- [ ] Activer les codes promo sur les Payment Links (Dashboard Stripe)
- [ ] Configurer le Customer Portal dans Stripe Dashboard

### Priorité Moyenne

#### Améliorations UX
- [ ] Ajouter notification quand l'analyse background est terminée
- [ ] Permettre de supprimer une entrée
- [ ] Ajouter pull-to-refresh sur History

#### Analytics
- [ ] Vérifier que les graphiques fonctionnent avec les moods variés
- [ ] Ajouter filtre par période

#### Notifications
- [ ] Implémenter les rappels quotidiens (notifications push)

### Priorité Basse

- [ ] Dark mode complet (vérifier tous les composants)
- [ ] Export des données (PDF ou JSON)
- [ ] Partage d'entrée
- [ ] Widget iOS

---

## Commandes utiles

```bash
# Développement
npm run dev

# Build production
npm run build

# Déployer Edge Functions
supabase functions deploy create-portal-session
supabase functions deploy stripe-webhook

# Configurer secrets Supabase
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets list

# Capacitor
npx cap sync ios
npx cap open ios  # (sur Mac uniquement)
```

---

## Architecture actuelle

```
Jour/
├── App.tsx                    # État global, routing, déchiffrement
├── components/
│   ├── Auth.tsx               # Login/Signup + RGPD checkbox
│   ├── Dashboard.tsx          # Accueil + bouton session
│   ├── History.tsx            # Liste entrées + modal edit
│   ├── EntryModal.tsx         # Modal modification mood
│   ├── Analytics.tsx          # Graphiques
│   ├── Settings.tsx           # Paramètres + Stripe + Export clé
│   ├── VoiceSession.tsx       # Session vocale + save instant
│   └── PrivacyPolicy.tsx      # Page confidentialité
├── utils/
│   ├── crypto.ts              # Chiffrement E2E AES-256-GCM
│   └── audioUtils.ts
├── supabase/functions/
│   ├── stripe-webhook/        # Webhook Stripe existant
│   └── create-portal-session/ # Customer Portal
├── capacitor.config.ts        # Config iOS
└── codemagic.yaml             # CI/CD iOS
```

---

## Configuration Codemagic

### Variables d'environnement (groupe: journaly_env)
| Variable | Valeur | Secret |
|----------|--------|--------|
| `VITE_SUPABASE_URL` | `https://lhcyhbudeybjqqjivifq.supabase.co` | Non |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Oui ✓ |
| `VITE_GEMINI_API_KEY` | `AIza...` | Oui ✓ |

### Intégration Apple (à configurer après validation)
- **Integration name** : `Journaly_ASC`
- **Issuer ID** : *(à récupérer sur App Store Connect)*
- **Key ID** : *(à récupérer sur App Store Connect)*
- **API Key** : *(fichier .p8 à uploader)*

---

## Contacts & Liens

- **Repo GitHub** : https://github.com/Sh0oya/Jour
- **Supabase** : https://supabase.com/dashboard/project/lhcyhbudeybjqqjivifq
- **Stripe Dashboard** : https://dashboard.stripe.com
- **Codemagic** : https://codemagic.io
- **Apple Developer** : https://developer.apple.com/account
- **App Store Connect** : https://appstoreconnect.apple.com

---

## Statut actuel

```
✅ Code prêt pour iOS
✅ Codemagic configuré (variables)
⏳ En attente validation Apple Developer (24-48h)
⏳ Puis : Config App ID + API Key + Premier build TestFlight
```
