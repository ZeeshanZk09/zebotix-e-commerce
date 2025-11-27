// hooks/useSellerStore.ts
'use client';
import { useAuth } from '@clerk/clerk-react';
import { useUser } from '@clerk/nextjs';
import axios from '@/lib/axios';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

type StoreForm = {
  name: string;
  username: string;
  description: string;
  address: string;
  email: string;
  contact: string;
  status?: string;
  isActive?: boolean;
  logo?: File | string | null;
};

const initialForm: StoreForm = {
  name: '',
  username: '',
  description: '',
  address: '',
  email: '',
  contact: '',
  status: 'pending',
  isActive: false,
  logo: null,
};

export function useSellerStore() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const [storeForm, setStoreForm] = useState<StoreForm>(initialForm);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // --- fetch seller status ---
  const statusQueryKey = ['seller', 'status', user?.id ?? 'anon'];
  const statusQuery = useQuery({
    queryKey: statusQueryKey,
    queryFn: async ({ signal }) => {
      console.debug('[useSellerStore] fetchSellerStatus fn start, userId=', user?.id);
      if (!user) throw new Error('No user');

      const token = await getToken();
      const res = await axios.get<{ message?: string; data?: any }>('/api/store/create', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      console.debug('[useSellerStore] fetchSellerStatus response', res.data);
      return res.data;
    },

    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    refetchOnWindowFocus: false,
    throwOnError: (err: any) => {
      console.error('[useSellerStore] fetchSellerStatus error', err);
      // don't auto-toast here unless you want immediate UX noise
      if (!err.response) {
        toast.error('Network error — unable to reach server. Check your connection.');
      } else if (err.response.status === 503) {
        toast.error('Service unavailable — database unreachable. Try again later.');
      } else {
        toast.error(err.response?.data?.error || err.message || 'Something went wrong');
      }
      return false;
    },
  });

  // keep derived values for convenience
  const alreadySubmitted = !!statusQuery.data?.data && statusQuery.data?.data?.status === 'pending';
  const status = statusQuery.data?.data?.status ?? '';
  const message = statusQuery.data?.message ?? '';

  // --- submit mutation ---
  const submitMutation = useMutation({
    mutationFn: async (form: StoreForm) => {
      console.debug('[useSellerStore] submitStore mutationFn start', form);
      if (!user) throw new Error('No user');

      const token = await getToken();
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('username', form.username);
      fd.append('description', form.description);
      fd.append('address', form.address);
      fd.append('email', form.email);
      fd.append('contact', form.contact);

      // only append image if it's a File
      if (form.logo && form.logo instanceof File) {
        fd.append('image', form.logo, form.logo.name);
      }

      const res = await axios.post('/api/store/create', fd, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });

      console.debug('[useSellerStore] submitStore response', res.data);
      return res.data;
    },
    onMutate: () => {
      console.debug('[useSellerStore] submitStore onMutate');
    },
    onSuccess: (res) => {
      console.debug('[useSellerStore] submitStore onSuccess', res);
      toast.success(res?.message || 'Submitted');
      // invalidate status so fetchSellerStatus reflects new status
      queryClient.invalidateQueries({ queryKey: statusQueryKey });
    },
    onError: (err: any) => {
      console.error('[useSellerStore] submitStore onError', err);
      if (!err.response) {
        toast.error('Network error — unable to reach server. Check your connection.');
      } else if (err.response.status === 503) {
        toast.error('Service unavailable — database unreachable. Try again later.');
      } else {
        toast.error(err.response?.data?.error || err.message || 'Something went wrong');
      }
    },
  });

  // expose a promise-returning submit function (suitable for toast.promise)
  const submitStore = (overrideForm?: Partial<StoreForm>) => {
    const payload = { ...storeForm, ...overrideForm };
    return submitMutation.mutateAsync(payload);
  };

  // --- helpers for form input ---
  const onChangeHandler = useCallback(
    (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setStoreForm((s) => ({ ...s, [name]: value }));
    },
    []
  );

  const onFileChange = useCallback((file?: File | null) => {
    setStoreForm((s) => ({ ...s, logo: file ?? null }));
  }, []);

  // --- preview management: create & revoke object URL when storeForm.logo is a File ---
  useEffect(() => {
    let url: string | null = null;
    if (storeForm.logo instanceof File) {
      url = URL.createObjectURL(storeForm.logo as Blob);
      setPreviewUrl(url);
      console.debug('[useSellerStore] created preview URL', url);
    } else {
      setPreviewUrl('');
    }

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
        console.debug('[useSellerStore] revoked preview URL', url);
      }
    };
    // only watch the file object reference
  }, [storeForm.logo]);

  // Prevent multiple toasts on re-renders: use a ref to show only once
  const shownSuccessToast = useRef(false);
  const shownErrorToast = useRef(false);

  // Show success toast when loading finishes and we have data
  useEffect(() => {
    if (!statusQuery.isLoading && !statusQuery.isFetching && !shownSuccessToast.current) {
      toast.success('Store approved.');
      shownSuccessToast.current = true;
    }
  }, [statusQuery.isLoading, statusQuery.isFetching]);

  // Show error toast once if there's an error
  useEffect(() => {
    if (statusQuery.isError && !shownErrorToast.current) {
      toast.error('Failed to fetch store.'); // you can include error details if desired
      shownErrorToast.current = true;
    }
  }, [statusQuery.isError]);

  return {
    // form + helpers
    user,
    loading: statusQuery.isPending,
    storeForm,
    setStoreForm,
    onChangeHandler,
    onFileChange,
    previewUrl,

    // status query
    fetchStatus: statusQuery.refetch,
    status,
    message,
    alreadySubmitted,
    statusLoading: statusQuery.isLoading,
    statusError: statusQuery.isError,

    // submit
    submitStore, // returns Promise -> use with await or toast.promise(submitStore(...))
    submitState: {
      loading: submitMutation.isPending,
      error: submitMutation.isError,
    },
  };
}
