// hooks/useAdminCoupons.ts
import { useAuth } from '@clerk/clerk-react';
import { useUser } from '@clerk/nextjs';
import axios from '@/lib/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

type Coupon = {
  code: string;
  description?: string;
  discount: number;
  forNewUser?: boolean;
  forMember?: boolean;
  isPublic?: boolean;
  expiresAt?: string | Date;
  [k: string]: any;
};

const DEFAULT_COUPON = (): Coupon => ({
  code: '',
  description: '',
  discount: 0,
  forNewUser: false,
  forMember: false,
  isPublic: false,
  expiresAt: new Date(),
});

/** Helpers ------------------------------------------------------------- */
const looksLikeDomNode = (v: any) =>
  v && (v.nodeType || v.tagName || v.__reactFiber || v.__reactInternalInstance);

const looksLikeReactEvent = (v: any) =>
  v && (v.nativeEvent || v._reactName || v.nativeEvent !== undefined);

function sanitizeValue(v: any): any {
  if (v == null) return undefined;
  if (v instanceof File) return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') return v;
  if (looksLikeDomNode(v)) return v.value ?? undefined;
  if (looksLikeReactEvent(v)) return undefined;

  if (Array.isArray(v)) return v.map(sanitizeValue).filter((x) => x !== undefined);
  if (typeof v === 'object') {
    // keep only primitive-ish children; drop keys that start with "_" or that look like events
    const out: any = {};
    for (const [k, val] of Object.entries(v)) {
      if (k.startsWith('_')) continue;
      if (k === 'nativeEvent' || k === 'target' || k === '_reactName') continue;
      const s = sanitizeValue(val);
      if (s !== undefined) out[k] = s;
    }
    return Object.keys(out).length ? out : undefined;
  }

  return undefined;
}

function buildPayload(obj: Record<string, any>) {
  const payload: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const s = sanitizeValue(v);
    if (s !== undefined) payload[k] = s;
  }
  // Normalize common fields
  if (payload.expiresAt && payload.expiresAt instanceof Date)
    payload.expiresAt = payload.expiresAt.toISOString();
  if (typeof payload.discount === 'string' && payload.discount.trim() !== '')
    payload.discount = Number(payload.discount);
  return payload;
}

/** Hook --------------------------------------------------------------- */
export function useAdminCoupons() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const userKey = user?.id ?? 'anon';

  const [newCoupon, setNewCoupon] = useState<Coupon>(DEFAULT_COUPON());

  const queryKey = ['admin', 'coupons', userKey];

  const couponsQuery = useQuery<Coupon[], AxiosError>({
    queryKey,
    enabled: !!user,
    queryFn: async ({ signal }) => {
      if (!user) throw new Error('No user');
      const token = await getToken();
      const res = await axios.get<{ data: Coupon[] }>('/api/admin/coupon', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      return res.data.data;
    },
    staleTime: 1000 * 60 * 2,
    retry: 1,
    refetchOnWindowFocus: false,
    throwOnError: (err) => {
      console.error('[useAdminCoupons] fetchCoupons error', err);
      if (!(err as any).response) {
        toast.error('Network error — unable to reach server. Check your connection.');
      } else if ((err as any).response?.status === 503) {
        toast.error('Service unavailable — database unreachable. Try again later.');
      } else {
        toast.error((err as any).response?.data?.error || err.message || 'Something went wrong');
      }
      return false;
    },
  });

  const addMutation = useMutation<any, AxiosError, { coupon: Partial<Coupon> }>({
    mutationFn: async ({ coupon }) => {
      if (!user) throw new Error('No user');

      const payload = buildPayload(coupon as Record<string, any>);

      const hasFile = Object.values(payload).some((v) => v instanceof File);

      const token = await getToken();

      if (hasFile) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(payload)) {
          if (v instanceof File) fd.append(k, v, v.name);
          else if (v instanceof Date) fd.append(k, v.toISOString());
          else if (typeof v === 'object') fd.append(k, JSON.stringify(v));
          else if (v != null) fd.append(k, String(v));
        }
        const res = await axios.post('/api/admin/coupon', fd, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        });
        return res.data;
      } else {
        const res = await axios.post(
          '/api/admin/coupon',
          { coupon: payload },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
      }
    },
    onSuccess: (res) => {
      toast.success(res?.data?.message || 'Coupon added');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (err) => {
      console.error('[useAdminCoupons] addCoupon error', err);
      toast.error((err as any)?.response?.data?.error || err.message || 'Failed to add coupon');
    },
  });

  const deleteMutation = useMutation<any, AxiosError, { code: string }>({
    mutationFn: async ({ code }) => {
      if (!user) throw new Error('No user');
      const token = await getToken();
      const confirm = window.confirm('Are you sure? This will permanently delete the coupon.');
      if (!confirm) return;
      const res = await axios.delete(`/api/admin/coupon?code=${code}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },
    onMutate: async ({ code }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = (queryClient.getQueryData<Coupon[]>(queryKey) ?? []) as Coupon[];
      queryClient.setQueryData<Coupon[]>(
        queryKey,
        previous.filter((c) => c.code !== code)
      );
      return { previous };
    },
    onError: (err, variables, context: any) => {
      console.error('[useAdminCoupons] deleteCoupon error', err);
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
      toast.error((err as any)?.response?.data?.error || err.message || 'Failed to delete coupon');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
    onSuccess: (res) => toast.success(res?.data?.message || 'Coupon deleted'),
  });

  // helpers
  const fetchCoupons = () => couponsQuery.refetch();

  const handleAddCoupon = (payload?: Partial<Coupon>) => {
    // defensive: only allow objects (avoid passing event directly)
    const coupon = newCoupon;
    return addMutation.mutateAsync({ coupon });
  };

  const handleDeleteCoupon = (code: string) => deleteMutation.mutateAsync({ code });

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, type } = e.target;
      let value: any = (e.target as HTMLInputElement).value;
      if (type === 'checkbox') value = (e.target as HTMLInputElement).checked;
      if (name === 'discount') value = Number(value);
      if (name === 'expiresAt') value = new Date(value);
      setNewCoupon((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const resetForm = useCallback(() => setNewCoupon(DEFAULT_COUPON()), []);
  const setField = useCallback((field: keyof Coupon, value: any) => {
    setNewCoupon((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Prevent multiple toasts on re-renders: use a ref to show only once
  const shownSuccessToast = useRef(false);
  const shownErrorToast = useRef(false);

  // Show success toast when loading finishes and we have data
  useEffect(() => {
    if (!couponsQuery.isLoading && !couponsQuery.isFetching && !shownSuccessToast.current) {
      toast.success(`Coupons fetched.`);
      shownSuccessToast.current = true;
    }
  }, [couponsQuery.isLoading, couponsQuery.isFetching]);

  // Show error toast once if there's an error
  useEffect(() => {
    if (couponsQuery.isError && !shownErrorToast.current) {
      toast.error('Failed to fetch coupons.'); // you can include error details if desired
      shownErrorToast.current = true;
    }
  }, [couponsQuery.isError]);

  return {
    coupons: couponsQuery.data ?? [],
    loading: couponsQuery.isLoading,
    couponsError: couponsQuery.isError,
    fetchCoupons,

    newCoupon,
    setNewCoupon,
    handleChange,
    resetForm,
    setField,

    handleAddCoupon,
    addState: {
      loading: addMutation.isPending,
      error: addMutation.isError,
    },

    handleDeleteCoupon,
    deleteState: {
      loading: deleteMutation.isPending,
      error: deleteMutation.isError,
    },
  };
}
