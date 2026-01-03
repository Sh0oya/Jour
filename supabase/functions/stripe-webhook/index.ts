// Stripe Webhook Handler for Journaly
// Handles subscription events and updates user tier in Supabase

import Stripe from "https://esm.sh/stripe@13.6.0?target=deno"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event: Stripe.Event

  // 1. Verify webhook signature
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

  console.log('Received Stripe event:', event.type)

  try {
    switch (event.type) {

      // ✅ Checkout completed via Payment Link
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // client_reference_id contains the Supabase user_id (passed in URL)
        const userId = session.client_reference_id
        const customerId = session.customer as string
        const customerEmail = session.customer_email

        console.log('Checkout completed:', { userId, customerId, customerEmail })

        if (userId) {
          // Update profile to PRO tier
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

      // 🔄 Subscription updated (renewal, plan change)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const status = subscription.status

        console.log('Subscription updated:', { customerId, status })

        // Find user by stripe_customer_id
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

      // ❌ Subscription canceled or expired
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

      // ⚠️ Payment failed
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

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
