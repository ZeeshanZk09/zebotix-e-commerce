// hooks/useHeader.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@/lib/axios';
import { useAdmin } from './useAdmin';
import { useAppSelector } from '../redux/hooks';
import toast from 'react-hot-toast';
import { selectCartItemsCount, selectCartTotalQuantity } from '../redux/features/cart/cartSlice';

type SearchResult = {
  id: string;
  title: string;
  price?: number;
  // add other fields
};

export function useHeader(opts?: { prefetchMs?: number }) {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const { openSignIn } = useClerk();
  const { isAdmin } = useAdmin();
  const queryClient = useQueryClient();
  const cartCount = selectCartTotalQuantity(useAppSelector((state) => state));

  console.log('cart count: ', cartCount);

  const [search, setSearch] = useState<string>('');
  const debMs = opts?.prefetchMs ?? 300;

  // debounce + abort control
  const timerRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ---------- store / seller info via react-query ----------
  // Keyed by user id so it refetches when user changes
  const storeQuery = useQuery({
    queryKey: ['store', 'isSeller', user?.id || 'anon'],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.post('/api/store/is-seller', {
        headers: { Authorization: `Bearer ${token}` },
      });
      // expected: { data: { isSeller: boolean, store: {...} } }
      console.log(res.data);
      return res.data.data;
    },

    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const isSeller = !!storeQuery.data?.isSeller;
  const storeInfo = storeQuery.data?.storeInfo ?? null;
  const loading = storeQuery.isPending;

  // ---------- prefetch search (debounced, cancelable) ----------
  const prefetchSearch = useCallback(
    async (q: string) => {
      if (!q || !q.trim()) return;

      // cancel previous in-flight request (if any)
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
        abortRef.current = null;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      const key = ['search', q.trim()];

      try {
        await queryClient.prefetchQuery({
          queryKey: key,
          queryFn: async () => {
            const res = await axios.get<{ data: SearchResult[] }>(
              `/api/shop/search?q=${encodeURIComponent(q.trim())}`,
              { signal: controller.signal }
            );
            return res.data.data;
          },
          staleTime: 1000 * 60 * 2,
        });
      } catch (err) {
        // if aborted, ignore silently
        if ((err as any)?.name === 'CanceledError' || (err as any)?.message === 'canceled') {
          // noop
        } else {
          console.debug('prefetchSearch failed', err);
        }
      } finally {
        // clear controller if it is still ours
        if (abortRef.current === controller) abortRef.current = null;
      }
    },
    [queryClient]
  );

  // debounce watcher
  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!search || !search.trim()) {
      // cancel pending abort when search cleared
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      return;
    }

    timerRef.current = window.setTimeout(() => {
      prefetchSearch(search.trim());
    }, debMs);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [search, prefetchSearch, debMs]);

  // ---------- submit handler ----------
  const handleSearch = useCallback(
    (e?: React.FormEvent<HTMLFormElement>) => {
      if (e) e.preventDefault();
      const q = (search ?? '').trim();
      router.push(`/shop${q ? `?search=${encodeURIComponent(q)}` : ''}`);
    },
    [router, search]
  );

  // ---------- auth/admin helper ----------
  const handleAuthAction = useCallback(
    (opts?: { adminRedirect?: string }) => {
      if (!user) {
        openSignIn?.();
        return;
      }
      if (isAdmin && opts?.adminRedirect) {
        router.push(opts.adminRedirect);
      }
    },
    [user, isAdmin, openSignIn, router]
  );

  // synchronous access to cached results
  const getCachedSearchResults = useCallback(
    (q: string) => {
      if (!q) return undefined;
      return queryClient.getQueryData<SearchResult[]>(['search', q.trim()]);
    },
    [queryClient]
  );

  // cleanup abort on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        try {
          abortRef.current.abort();
        } catch {}
        abortRef.current = null;
      }
    };
  }, []);

  // Prevent multiple toasts on re-renders: use a ref to show only once
  const shownSuccessToast = useRef(false);
  const shownErrorToast = useRef(false);

  // Show success toast when loading finishes and we have data
  useEffect(() => {
    if (!storeQuery.isLoading && !storeQuery.isFetching && !shownSuccessToast.current) {
      toast.success('Store fetched successfully.');
      shownSuccessToast.current = true;
    }
  }, [storeQuery.isLoading, storeQuery.isFetching]);

  // Show error toast once if there's an error
  useEffect(() => {
    if (storeQuery.isError && !shownErrorToast.current) {
      toast.error('Failed to fetch store.'); // you can include error details if desired
      shownErrorToast.current = true;
    }
  }, [storeQuery.isError]);

  return {
    // state
    search,
    setSearch,

    // user / auth
    user,
    isAdmin,
    handleAuthAction,
    openSignIn,

    // store / seller
    isSeller,
    storeInfo,
    loading,

    // actions
    handleSearch,

    // derived
    cartCount,

    // utilities
    prefetchSearch,
    getCachedSearchResults,
    router,
  };
}

export default useHeader;
