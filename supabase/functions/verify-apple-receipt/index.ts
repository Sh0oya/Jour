// Verify Apple In-App Purchase Receipt
// Validates receipt with Apple's servers and updates user tier in Supabase

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const APPLE_VERIFY_URL_PRODUCTION = 'https://buy.itunes.apple.com/verifyReceipt';
const APPLE_VERIFY_URL_SANDBOX = 'https://sandbox.itunes.apple.com/verifyReceipt';

const VALID_PRODUCT_IDS = ['pro_monthly', 'pro_yearly'];

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyWithApple(receiptData: string, isRetry = false): Promise<any> {
  const url = isRetry ? APPLE_VERIFY_URL_SANDBOX : APPLE_VERIFY_URL_PRODUCTION;
  const sharedSecret = Deno.env.get('APPLE_SHARED_SECRET');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      'password': sharedSecret,
      'exclude-old-transactions': true,
    }),
  });

  const result = await response.json();

  // Status 21007 = sandbox receipt sent to production, retry with sandbox
  if (result.status === 21007 && !isRetry) {
    console.log('Sandbox receipt detected, retrying with sandbox URL');
    return verifyWithApple(receiptData, true);
  }

  return result;
}

function hasActiveSubscription(verifyResult: any): { active: boolean; productId: string | null; expiresDate: string | null } {
  if (verifyResult.status !== 0) {
    return { active: false, productId: null, expiresDate: null };
  }

  // Check latest_receipt_info for active subscriptions
  const latestReceipts = verifyResult.latest_receipt_info || [];
  const now = Date.now();

  for (const receipt of latestReceipts) {
    const expiresMs = parseInt(receipt.expires_date_ms, 10);
    const productId = receipt.product_id;

    if (VALID_PRODUCT_IDS.includes(productId) && expiresMs > now) {
      return {
        active: true,
        productId,
        expiresDate: new Date(expiresMs).toISOString(),
      };
    }
  }

  // Also check pending_renewal_info
  const pendingRenewals = verifyResult.pending_renewal_info || [];
  const hasAutoRenew = pendingRenewals.some(
    (r: any) => VALID_PRODUCT_IDS.includes(r.product_id) && r.auto_renew_status === '1'
  );

  // If no active subscription found in latest_receipt_info
  // but auto-renew is on, check the most recent transaction
  if (hasAutoRenew && latestReceipts.length > 0) {
    const sorted = [...latestReceipts]
      .filter((r: any) => VALID_PRODUCT_IDS.includes(r.product_id))
      .sort((a: any, b: any) => parseInt(b.expires_date_ms) - parseInt(a.expires_date_ms));

    if (sorted.length > 0) {
      const latest = sorted[0];
      const expiresMs = parseInt(latest.expires_date_ms, 10);
      if (expiresMs > now) {
        return {
          active: true,
          productId: latest.product_id,
          expiresDate: new Date(expiresMs).toISOString(),
        };
      }
    }
  }

  return { active: false, productId: null, expiresDate: null };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Authenticate the user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Parse request body
    const body = await req.json()
    const receiptData = body.receipt

    if (!receiptData) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Missing receipt data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Verifying receipt for user ${user.id}`)

    // 3. Verify receipt with Apple
    const verifyResult = await verifyWithApple(receiptData)

    if (verifyResult.status !== 0) {
      console.error('Apple verification failed, status:', verifyResult.status)
      return new Response(
        JSON.stringify({ ok: false, error: `Apple verification failed (status: ${verifyResult.status})` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Check if there's an active subscription
    const subscription = hasActiveSubscription(verifyResult)
    console.log('Subscription status:', subscription)

    // 5. Update user profile
    const tier = subscription.active ? 'PRO' : 'FREE'
    const subscriptionStatus = subscription.active ? 'active' : 'expired'

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        tier,
        subscription_status: subscriptionStatus,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return new Response(
        JSON.stringify({ ok: false, error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`User ${user.id} → tier: ${tier}, status: ${subscriptionStatus}`)

    return new Response(
      JSON.stringify({
        ok: true,
        tier,
        subscriptionStatus,
        productId: subscription.productId,
        expiresDate: subscription.expiresDate,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error verifying receipt:', error)
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
