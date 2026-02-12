/**
 * In-App Purchase hook for iOS (cordova-plugin-purchase v13)
 * Handles subscription purchase, restore, and receipt validation.
 *
 * On web: does nothing (Stripe is used instead)
 * On iOS: manages StoreKit subscriptions via CdvPurchase
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { supabase, SUPABASE_URL } from '../lib/supabase';

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

export function useIAP(userId: string): UseIAPReturn {
  const isNative = Capacitor.isNativePlatform();
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const storeRef = useRef<any>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!isNative || initializedRef.current) {
      setLoading(false);
      return;
    }

    // Wait for deviceready event (Cordova plugins load after this)
    const init = () => {
      const CdvPurchase = (window as any).CdvPurchase;
      if (!CdvPurchase) {
        console.warn('CdvPurchase not available');
        setLoading(false);
        return;
      }

      const { store, ProductType, Platform } = CdvPurchase;
      storeRef.current = store;

      // Register products
      store.register([
        {
          id: PRODUCT_IDS.monthly,
          type: ProductType.PAID_SUBSCRIPTION,
          platform: Platform.APPLE_APPSTORE,
        },
        {
          id: PRODUCT_IDS.yearly,
          type: ProductType.PAID_SUBSCRIPTION,
          platform: Platform.APPLE_APPSTORE,
        },
      ]);

      // Set up server-side receipt validator
      store.validator = async (receipt: any, callback: any) => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;

          const response = await fetch(
            `${SUPABASE_URL}/functions/v1/verify-apple-receipt`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({
                receipt: receipt.nativeData,
                productId: receipt.products?.[0]?.id,
              }),
            }
          );

          const result = await response.json();

          if (result.ok) {
            callback({
              ok: true,
              data: { id: receipt.id, latest_receipt: true },
            });
          } else {
            callback({
              ok: false,
              data: { error: result.error || 'Validation failed' },
            });
          }
        } catch (err: any) {
          console.error('Receipt validation error:', err);
          callback({
            ok: false,
            data: { error: err.message },
          });
        }
      };

      // Event listeners
      store.when()
        .productUpdated(() => {
          updateProducts(store);
        })
        .approved((transaction: any) => {
          // Transaction approved, verify receipt
          transaction.verify();
        })
        .verified((receipt: any) => {
          // Receipt verified by our server, finish the transaction
          receipt.finish();
        })
        .finished((transaction: any) => {
          console.log('Transaction finished:', transaction.products?.[0]?.id);
          setPurchasing(false);
          setError(null);
        })
        .receiptUpdated((receipt: any) => {
          // Check if user has an active subscription
          updateProducts(store);
        });

      // Error handling
      store.error((err: any) => {
        console.error('Store error:', err);
        if (err.code !== 'CdvPurchase.PAYMENT_CANCELLED') {
          setError(err.message || 'Purchase failed');
        }
        setPurchasing(false);
      });

      // Initialize the store
      store.initialize([Platform.APPLE_APPSTORE])
        .then(() => {
          updateProducts(store);
          setLoading(false);
          initializedRef.current = true;
        })
        .catch((err: any) => {
          console.error('Store init failed:', err);
          setLoading(false);
        });
    };

    // Cordova plugins are available after deviceready
    if ((window as any).cordova) {
      document.addEventListener('deviceready', init, false);
    } else {
      // Fallback: try after a short delay (Capacitor sometimes loads faster)
      setTimeout(init, 500);
    }
  }, [isNative, userId]);

  const updateProducts = (store: any) => {
    const loaded: IAPProduct[] = [];

    [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly].forEach((pid) => {
      const product = store.get(pid);
      if (product) {
        const offer = product.getOffer();
        loaded.push({
          id: product.id,
          title: product.title || product.id,
          price: offer?.pricingPhases?.[0]?.price || product.price || '',
          description: product.description || '',
        });
      }
    });

    if (loaded.length > 0) {
      setProducts(loaded);
    }
  };

  const purchase = useCallback(async (productId: string) => {
    const store = storeRef.current;
    if (!store) return;

    setError(null);
    setPurchasing(true);

    const product = store.get(productId);
    const offer = product?.getOffer();

    if (!offer) {
      setError('Product not available');
      setPurchasing(false);
      return;
    }

    try {
      await offer.order();
    } catch (err: any) {
      if (err.code !== 'CdvPurchase.PAYMENT_CANCELLED') {
        setError(err.message || 'Purchase failed');
      }
      setPurchasing(false);
    }
  }, []);

  const restore = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return;

    setError(null);
    setPurchasing(true);

    try {
      await store.restorePurchases();
      setPurchasing(false);
    } catch (err: any) {
      setError(err.message || 'Restore failed');
      setPurchasing(false);
    }
  }, []);

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
