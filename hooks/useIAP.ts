/**
 * In-App Purchase hook for iOS (native StoreKit 2)
 * Handles subscription purchase, restore, and tier sync.
 *
 * On web: does nothing (Stripe is used instead)
 * On iOS: manages StoreKit 2 subscriptions via custom Capacitor plugin
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase, SUPABASE_URL } from '../lib/supabase';

// Register native StoreKit plugin (only works on iOS)
interface StoreKitPluginInterface {
  getProducts(options: { productIds: string[] }): Promise<{
    products: Array<{
      id: string;
      title: string;
      description: string;
      price: string;
      priceValue: number;
      currencyCode: string;
    }>;
  }>;
  purchase(options: { productId: string }): Promise<{
    success: boolean;
    cancelled?: boolean;
    pending?: boolean;
    transactionId?: string;
    productId?: string;
    expirationDate?: string;
    originalTransactionId?: string;
  }>;
  restorePurchases(): Promise<{
    success: boolean;
    subscriptions: Array<{
      productId: string;
      expirationDate: string;
      transactionId: string;
      originalTransactionId: string;
    }>;
  }>;
  getCurrentEntitlements(): Promise<{
    entitlements: Array<{
      productId: string;
      productType: string;
      expirationDate: string;
      transactionId: string;
      isUpgraded: boolean;
    }>;
  }>;
}

const StoreKit = registerPlugin<StoreKitPluginInterface>('StoreKitPlugin');

// Product IDs matching App Store Connect
const PRODUCT_IDS = {
  monthly: 'pro_monthly',
  yearly: 'pro_yearly',
};

export interface IAPProduct {
  id: string;
  title: string;
  price: string;
  description: string;
}

export interface UseIAPReturn {
  isNative: boolean;
  products: IAPProduct[];
  loading: boolean;
  purchasing: boolean;
  error: string | null;
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<void>;
}

async function syncTierWithServer(productId: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    await fetch(`${SUPABASE_URL}/functions/v1/verify-apple-receipt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        receipt: 'storekit2',
        productId,
      }),
    });
  } catch (err) {
    console.error('Tier sync error:', err);
  }
}

export function useIAP(userId: string): UseIAPReturn {
  const isNative = Capacitor.isNativePlatform();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isNative || initializedRef.current) {
      setLoading(false);
      return;
    }

    const loadProducts = async () => {
      try {
        const result = await StoreKit.getProducts({
          productIds: [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly],
        });

        const loaded: IAPProduct[] = result.products.map((p) => ({
          id: p.id,
          title: p.title,
          price: p.price,
          description: p.description,
        }));

        setProducts(loaded);
        initializedRef.current = true;
      } catch (err: any) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [isNative, userId]);

  const purchase = useCallback(async (productId: string) => {
    if (!isNative) return;

    setError(null);
    setPurchasing(true);

    try {
      const result = await StoreKit.purchase({ productId });

      if (result.success) {
        // Transaction verified by StoreKit 2, sync tier with our server
        await syncTierWithServer(productId);
      } else if (result.cancelled) {
        // User cancelled, no error to show
      } else if (result.pending) {
        setError('Purchase pending approval');
      }
    } catch (err: any) {
      setError(err.message || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  }, [isNative]);

  const restore = useCallback(async () => {
    if (!isNative) return;

    setError(null);
    setPurchasing(true);

    try {
      const result = await StoreKit.restorePurchases();

      if (result.success && result.subscriptions.length > 0) {
        // Sync the most recent subscription with our server
        const latest = result.subscriptions[0];
        await syncTierWithServer(latest.productId);
      }
    } catch (err: any) {
      setError(err.message || 'Restore failed');
    } finally {
      setPurchasing(false);
    }
  }, [isNative]);

  return {
    isNative,
    products,
    loading,
    purchasing,
    error,
    purchase,
    restore,
  };
}

export { PRODUCT_IDS };
