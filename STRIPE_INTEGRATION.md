# Guide d'Intégration Stripe pour Journaly

## Vue d'ensemble

Journaly utilise **Stripe Payment Links** pour les paiements. C'est l'approche la plus simple : redirection directe vers une page Stripe hébergée.

### Flow utilisateur
```
1. User clique "Upgrade to Pro" dans Settings
2. Redirection vers Stripe Payment Link (page hébergée par Stripe)
3. User paie
4. Stripe envoie un webhook à notre Edge Function
5. Le webhook met à jour tier = 'PRO' dans Supabase
6. User revient sur l'app avec son nouveau statut
```

### Configuration actuelle
| Plan | Prix | Payment Link |
|------|------|--------------|
| Mensuel | 6,90€/mois | `https://buy.stripe.com/3cI4gzb741RB0Whg8b7ok00` |
| Annuel | 70€/an | `https://buy.stripe.com/fZu28rejg67R9sNf477ok01` |

---

## Étape 1 : Vérifier la configuration Stripe Dashboard

1. Connecte-toi sur [dashboard.stripe.com](https://dashboard.stripe.com)
2. Vérifie que tes Payment Links sont actifs dans **Products** → **Payment Links**

---

## Étape 2 : Mettre à jour la base de données Supabase

Exécuter ce SQL dans **Supabase SQL Editor** :

```sql
-- Ajouter les colonnes Stripe à la table profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none';

-- Index pour rechercher par stripe_customer_id
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
ON public.profiles(stripe_customer_id);

-- SÉCURITÉ : Empêcher les users de modifier leur propre tier via l'API client
-- Créer une politique RLS restrictive
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile except tier" ON public.profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND tier = (SELECT tier FROM public.profiles WHERE id = auth.uid())
);
```

---

## Étape 3 : Supabase CLI ✅ FAIT

```bash
# Utiliser npx (pas d'installation globale nécessaire)
npx supabase --version

# Token d'accès Supabase
export SUPABASE_ACCESS_TOKEN=sbp_3de3f4a3a7b77a807a47061e84a653b0bf9e3e15

# Initialiser et lier
npx supabase init
npx supabase link --project-ref lhcyhbudeybjqqjivifq
```

### Infos projet
- **Project Ref** : `lhcyhbudeybjqqjivifq`
- **URL** : `https://lhcyhbudeybjqqjivifq.supabase.co`
- **Webhook URL** : `https://lhcyhbudeybjqqjivifq.supabase.co/functions/v1/stripe-webhook`

---

## Étape 4 : Créer l'Edge Function `stripe-webhook` ✅ FAIT

```bash
npx supabase functions new stripe-webhook
```

> Fichier créé : `supabase/functions/stripe-webhook/index.ts`

Éditer `supabase/functions/stripe-webhook/index.ts` :

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@13.6.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event

  // 1. Vérifier la signature du webhook
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  console.log('Received event:', event.type)

  try {
    switch (event.type) {

      // ✅ Checkout complété via Payment Link
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // client_reference_id contient le user_id Supabase (passé dans l'URL)
        const userId = session.client_reference_id
        const customerId = session.customer as string
        const customerEmail = session.customer_email

        console.log('Checkout completed:', { userId, customerId, customerEmail })

        if (userId) {
          // Mettre à jour le profil avec le tier PRO
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              tier: 'PRO',
              stripe_customer_id: customerId,
              subscription_status: 'active'
            })
            .eq('id', userId)

          if (error) {
            console.error('Error updating profile:', error)
          } else {
            console.log(`✅ User ${userId} upgraded to PRO`)
          }
        } else {
          console.warn('No client_reference_id found in session')
        }
        break
      }

      // 🔄 Abonnement mis à jour
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status

        console.log('Subscription updated:', { customerId, status })

        // Trouver l'utilisateur par stripe_customer_id
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          const tier = status === 'active' ? 'PRO' : 'FREE'

          await supabaseAdmin
            .from('profiles')
            .update({
              tier,
              subscription_status: status
            })
            .eq('id', profile.id)

          console.log(`🔄 User ${profile.id} subscription: ${status} → tier: ${tier}`)
        }
        break
      }

      // ❌ Abonnement annulé
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('Subscription deleted:', { customerId })

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabaseAdmin
            .from('profiles')
            .update({
              tier: 'FREE',
              subscription_status: 'canceled'
            })
            .eq('id', profile.id)

          console.log(`❌ User ${profile.id} downgraded to FREE`)
        }
        break
      }

      // ⚠️ Paiement échoué
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        console.log('Payment failed:', { customerId })

        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          await supabaseAdmin
            .from('profiles')
            .update({ subscription_status: 'past_due' })
            .eq('id', profile.id)

          console.log(`⚠️ User ${profile.id} payment failed`)
        }
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
```

---

## Étape 5 : Configurer les secrets ✅ FAIT

```bash
# Toujours inclure le token d'accès
export SUPABASE_ACCESS_TOKEN=sbp_3de3f4a3a7b77a807a47061e84a653b0bf9e3e15

# Clé secrète Stripe
npx supabase secrets set STRIPE_SECRET_KEY=sk_live_XXXXXXX
```

---

## Étape 6 : Déployer l'Edge Function ⏳ À FAIRE

```bash
export SUPABASE_ACCESS_TOKEN=sbp_3de3f4a3a7b77a807a47061e84a653b0bf9e3e15 && npx supabase functions deploy stripe-webhook
```

URL de la fonction :
```
https://lhcyhbudeybjqqjivifq.supabase.co/functions/v1/stripe-webhook
```

---

## Étape 7 : Configurer le Webhook dans Stripe Dashboard ⏳ À FAIRE

1. Va sur [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Clique **Add endpoint**
3. Configure :
   - **Endpoint URL** : `https://lhcyhbudeybjqqjivifq.supabase.co/functions/v1/stripe-webhook`
   - **Events to send** (clique "Select events") :
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_failed`
4. Clique **Add endpoint**
5. Copie le **Signing secret** (commence par `whsec_`)

---

## Étape 8 : Ajouter le Webhook Secret ⏳ À FAIRE

```bash
export SUPABASE_ACCESS_TOKEN=sbp_3de3f4a3a7b77a807a47061e84a653b0bf9e3e15 && npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXXXX
```

---

## Étape 9 : Tester

1. Va dans l'app → Settings → "Upgrade to Pro"
2. Tu devrais être redirigé vers Stripe
3. Utilise une carte de test : `4242 4242 4242 4242`
4. Après paiement, vérifie dans Supabase que `tier = 'PRO'`

### Vérifier les logs
```bash
supabase functions logs stripe-webhook
```

---

## Code Frontend (Settings.tsx)

Le code est déjà en place dans `components/Settings.tsx` :

```typescript
// Stripe Payment Links
const STRIPE_LINKS = {
  monthly: 'https://buy.stripe.com/3cI4gzb741RB0Whg8b7ok00',
  yearly: 'https://buy.stripe.com/fZu28rejg67R9sNf477ok01',
};

const handleCheckout = (plan: 'monthly' | 'yearly') => {
  setLoading(plan);

  // L'URL inclut client_reference_id pour identifier l'utilisateur
  const baseUrl = STRIPE_LINKS[plan];
  const checkoutUrl = `${baseUrl}?client_reference_id=${user.id}&prefilled_email=${encodeURIComponent(user.email)}`;

  window.location.href = checkoutUrl;
};
```

---

## Checklist

- [ ] Payment Links créés et actifs dans Stripe Dashboard
- [ ] Colonnes `stripe_customer_id` et `subscription_status` ajoutées à `profiles`
- [ ] RLS mis à jour pour protéger la colonne `tier`
- [ ] Edge Function `stripe-webhook` créée et déployée
- [ ] Webhook configuré dans Stripe Dashboard avec les 4 événements
- [ ] Secrets configurés : `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- [ ] Test effectué avec carte `4242 4242 4242 4242`
- [ ] Vérification : `tier = 'PRO'` dans Supabase après paiement

---

## Dépannage

### Le tier ne se met pas à jour après paiement

1. Vérifie les logs : `supabase functions logs stripe-webhook`
2. Vérifie que `client_reference_id` est bien passé (regarde dans Stripe Dashboard → Payments → le paiement → metadata)
3. Vérifie que le webhook est bien configuré dans Stripe

### Erreur "Invalid signature"

- Vérifie que `STRIPE_WEBHOOK_SECRET` est correct
- Assure-toi d'utiliser le secret du bon endpoint (test vs live)

### CORS errors

Les Payment Links n'ont pas de problème CORS car c'est une redirection simple (`window.location.href`), pas un fetch.

### L'utilisateur n'est pas reconnu après paiement

Vérifie que l'URL de redirection inclut bien `?client_reference_id=${user.id}`.
