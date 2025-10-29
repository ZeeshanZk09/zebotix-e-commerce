'use client';
import { makeStore } from '@/lib/redux/store';
import { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';

/**
 * Toggle logs:
 * - Defaults to true in development (client-side only).
 * - To force logs on in prod for debugging set `process.env.DEBUG_REDUX === '1'` at build time.
 */
const ENABLE_LOG =
  typeof window !== 'undefined' &&
  (process.env.NODE_ENV === 'development' || process.env.DEBUG_REDUX === '1');

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);

  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
    if (ENABLE_LOG) {
      try {
        console.debug('[StoreProvider] store created');
      } catch {
        /* ignore logging errors */
      }
    }
  }

  useEffect(() => {
    if (!ENABLE_LOG) return;

    const store = storeRef.current!;
    // initial snapshot
    try {
      const state = store.getState() as any;
      const snapshot = {
        cart: {
          totalPrice: state.cart?.totalPrice,
          totalQuantity: state.cart?.totalQuantity,
          items: Object.keys(state.cart?.cartItems ?? {}).length,
        },
        product: { count: Array.isArray(state.product?.list) ? state.product.list.length : 0 },
        address: { count: Array.isArray(state.address?.list) ? state.address.list.length : 0 },
      };
      console.debug('[StoreProvider] initial snapshot', snapshot);
    } catch (err) {
      console.debug('[StoreProvider] initial snapshot error', err);
    }

    // subscribe to store updates and log compact snapshots
    const unsubscribe = store.subscribe(() => {
      try {
        const state = store.getState() as any;
        const snapshot = {
          cart: {
            totalPrice: state.cart?.totalPrice,
            totalQuantity: state.cart?.totalQuantity,
            items: Object.keys(state.cart?.cartItems ?? {}).length,
          },
          product: { count: Array.isArray(state.product?.list) ? state.product.list.length : 0 },
          address: { count: Array.isArray(state.address?.list) ? state.address.list.length : 0 },
        };
        console.debug('[StoreProvider] state update', snapshot);
      } catch (err) {
        console.debug('[StoreProvider] subscription error', err);
      }
    });

    return () => {
      try {
        unsubscribe();
        console.debug('[StoreProvider] unsubscribed store listener');
      } catch (error: any) {
        console.debug('[StoreProvider] unsubscribe error', error);
        console.debug('[StoreProvider] unsubscribe error', error.message);
        console.debug('[StoreProvider] unsubscribe error', error.stack);
        console.debug('[StoreProvider] unsubscribe error', error.name);
        console.debug('[StoreProvider] unsubscribe error', error.code);
      }
    };
  }, []);

  return <Provider store={storeRef.current}>{children}</Provider>;
}
