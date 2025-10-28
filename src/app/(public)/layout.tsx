'use client';

import Banner from '@/components/Banner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { fetchProducts } from '@/lib/redux/features/product/productSlice';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@clerk/clerk-react';
import { fetchCart, uploadCart } from '@/lib/redux/features/cart/cartSlice';
import { fetchAddress } from '@/lib/redux/features/address/addressSlice';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const { user } = useUser();
  const { getToken } = useAuth();

  const cartItems = useAppSelector((state) => state.cart.cartItems);

  // debounce timer ref for uploads
  const uploadTimerRef = useRef<number | null>(null);

  // 1) Fetch products once on mount
  useEffect(() => {
    dispatch(fetchProducts());
    // intentionally no other side effects here
  }, [dispatch]);

  // 2) Fetch user's cart once when they log in
  useEffect(() => {
    if (!user) return;

    // If getToken throws or is undefined, guard it
    const safeFetch = async () => {
      try {
        await dispatch(fetchCart(getToken));
        await dispatch(fetchAddress(getToken));
      } catch (err) {
        // Optional: show toast/log, but avoid noisy console logs
        console.error('fetchCart or fetchAddress error', err);
      }
    };

    safeFetch();
  }, [dispatch, user, getToken]);

  // 3) Debounced uploadCart when cartItems change (only when user is present)
  useEffect(() => {
    // don't upload if user not logged in
    if (!user) return;

    // do not upload empty carts (helps avoid unnecessary network calls)
    const hasItems = Boolean(cartItems && Object.keys(cartItems).length > 0);
    if (!hasItems) return;

    // clear previous timer
    if (uploadTimerRef.current) {
      window.clearTimeout(uploadTimerRef.current);
    }

    // schedule an upload after a short debounce (1s)
    uploadTimerRef.current = window.setTimeout(async () => {
      try {
        await dispatch(uploadCart(getToken));
      } catch (err) {
        // upload failure is non-blocking — log for observability
        console.error('uploadCart error', err);
      } finally {
        uploadTimerRef.current = null;
      }
    }, 1000);

    // cleanup on re-render/unmount
    return () => {
      if (uploadTimerRef.current) {
        window.clearTimeout(uploadTimerRef.current);
        uploadTimerRef.current = null;
      }
    };
  }, [dispatch, user, cartItems, getToken]);

  // 4) Optional manual upload helper (in case you need to trigger from UI)
  const manualUpload = useCallback(async () => {
    if (!user) return;
    if (uploadTimerRef.current) {
      window.clearTimeout(uploadTimerRef.current);
      uploadTimerRef.current = null;
    }
    try {
      await dispatch(uploadCart(getToken));
    } catch (err) {
      console.error('manual uploadCart failed', err);
    }
  }, [dispatch, getToken, user]);

  return (
    <>
      <Banner />
      <Navbar />
      {/* Consider passing manualUpload as context or prop to Navbar if you want a "Sync Cart" button */}
      {children}
      <Footer />
    </>
  );
}
