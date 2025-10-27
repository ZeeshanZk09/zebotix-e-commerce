// hooks/useAdminStores.ts
import { useAuth } from '@clerk/clerk-react';
import { useUser } from '@clerk/nextjs';
import { AxiosError } from 'axios';
import axios from '@/lib/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useEffect, useRef } from 'react';

export function useAdminStores() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const userKey = user?.id ?? 'anonymous';

  const storesQuery = useQuery<any[], AxiosError>({
    queryKey: ['admin', 'stores', userKey],
    queryFn: async ({ signal }) => {
      console.debug('[storesQuery] fetching stores for userKey=', userKey);
      if (!user) throw new Error('No user');
      const token = await getToken();
      const res = await axios.get<{ data: any[] }>('/api/admin/stores', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      console.debug('[storesQuery] response', res.data);
      return res.data.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    refetchOnWindowFocus: false,
    throwOnError: (err: AxiosError) => {
      console.error('[storesQuery] Failed to fetch stores:', err);
      if (!err.cause) {
        toast.error('Network error — unable to reach server. Check your connection.');
      } else if (err.status === 503) {
        toast.error('Service unavailable — database unreachable. Try again later.');
      } else {
        toast.error((err.response?.data as any)?.error || err.message || 'Something went wrong');
      }
      return false;
    },
  });

  // separate query for stores awaiting approval (different cache key!)
  const storesToApproveQuery = useQuery<any[], AxiosError>({
    queryKey: ['admin', 'storesToApprove', userKey],
    queryFn: async ({ signal }) => {
      console.debug('[storesToApproveQuery] fetching stores to approve for userKey=', userKey);
      if (!user) throw new Error('No user');
      const token = await getToken();
      const res = await axios.get<{ data: any[] }>('/api/admin/approve-store', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      console.debug('[storesToApproveQuery] response', res.data);
      return res.data.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    refetchOnWindowFocus: false,
    throwOnError: (err: AxiosError) => {
      console.error('[storesToApproveQuery] Failed to fetch stores to approve:', err);
      if (!err.cause) {
        toast.error('Network error — unable to reach server. Check your connection.');
      } else if (err.status === 503) {
        toast.error('Service unavailable — database unreachable. Try again later.');
      } else {
        toast.error((err.response?.data as any)?.error || err.message || 'Something went wrong');
      }
      return false;
    },
  });

  const toggleMutation = useMutation<any, any, { storeId: string }>({
    mutationFn: async ({ storeId }) => {
      console.debug('[toggleMutation] calling API for storeId=', storeId);
      const token = await getToken();
      const res = await axios.post<any>(
        '/api/admin/toggle-store',
        { storeId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.debug('[toggleMutation] response', res.data);
      return res.data;
    },
    onMutate: async ({ storeId }) => {
      console.debug('[toggleMutation] onMutate for storeId=', storeId);
      await queryClient.cancelQueries({ queryKey: ['admin', 'stores', userKey] });
      const previous = queryClient.getQueryData<any[]>(['admin', 'stores', userKey]);

      queryClient.setQueryData<any[]>(['admin', 'stores', userKey], (old = []) =>
        old.map((s) => (s.id === storeId ? { ...s, isActive: !s.isActive } : s))
      );

      return { previous };
    },
    onError: (err: AxiosError, variables, context: any) => {
      console.error('[toggleMutation] error', err, variables, context);
      // rollback
      if (context?.previous) {
        queryClient.setQueryData(['admin', 'stores', userKey], context.previous);
      }
      if (!err.cause) {
        toast.error('Network error — unable to reach server. Check your connection.');
      } else if (err.status === 503) {
        toast.error('Service unavailable — database unreachable. Try again later.');
      } else {
        toast.error((err.response?.data as any)?.error || err.message || 'Something went wrong');
      }
    },
    onSettled: () => {
      console.debug('[toggleMutation] settled — invalidating cache');
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores', userKey] });
    },
    onSuccess: (res) => {
      console.debug('[toggleMutation] success', res);
      toast.success(res?.message || 'Updated');
    },
  });

  const toggleIsActive = (storeId: string) => {
    // returns a Promise so callers can await or use toast.promise
    return toggleMutation.mutateAsync({ storeId });
  };

  const approveMutation = useMutation<
    { message: string; data?: any }, // server response shape (adjust as needed)
    any,
    { storeId: string; status: string }
  >({
    mutationFn: async ({ storeId, status }) => {
      console.debug('[approveMutation] calling API', { storeId, status });
      const token = await getToken();
      const res = await axios.post(
        '/api/admin/approve-store',
        { storeId, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.debug('[approveMutation] response', res.data);
      // return the full response body so onSuccess can access message/data
      return res.data as { message: string; data?: any };
    },
    onSuccess: (res) => {
      console.debug('[approveMutation] success', res);
      toast.success(res?.message || 'Updated');
      // invalidate both lists so UI stays in sync
      queryClient.invalidateQueries({ queryKey: ['admin', 'stores', userKey] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'storesToApprove', userKey] });
    },
    onError: (err: AxiosError) => {
      console.error('[approveMutation] error', err);
      if (!err.cause) {
        toast.error('Network error — unable to reach server. Check your connection.');
      } else if (err.status === 503) {
        toast.error('Service unavailable — database unreachable. Try again later.');
      } else {
        toast.error((err.response?.data as any)?.error || err.message || 'Something went wrong');
      }
    },
  });

  // returns a Promise for callers
  const handleApprove = ({ storeId, status }: { storeId: string; status: string }) => {
    return approveMutation.mutateAsync({ storeId, status });
  };

  // Prevent multiple toasts on re-renders: use a ref to show only once
  // stores
  const shownSuccessToastForStores = useRef(false);
  const shownErrorToastForStores = useRef(false);

  // Show success toast when loading finishes and we have data
  useEffect(() => {
    if (!storesQuery.isLoading && !storesQuery.isFetching && !shownSuccessToastForStores.current) {
      toast.success('Approved stores fetched successfully.');
      shownSuccessToastForStores.current = true;
    }
  }, [storesQuery.isLoading, storesQuery.isFetching]);

  // Show error toast once if there's an error
  useEffect(() => {
    if (storesQuery.isError && !shownErrorToastForStores.current) {
      toast.error('Failed to fetch stores.'); // you can include error details if desired
      shownErrorToastForStores.current = true;
    }
  }, [storesQuery.isError]);
  // approve store
  const shownSuccessToastForApproveStore = useRef(false);
  const shownErrorToastForApproveStore = useRef(false);

  // Show success toast when loading finishes and we have data
  useEffect(() => {
    if (
      !storesToApproveQuery.isLoading &&
      !storesToApproveQuery.isFetching &&
      !shownSuccessToastForApproveStore.current
    ) {
      toast.success('Stores fetched successfully.');
      shownSuccessToastForApproveStore.current = true;
    }
  }, [storesToApproveQuery.isLoading, storesToApproveQuery.isFetching]);

  // Show error toast once if there's an error
  useEffect(() => {
    if (storesToApproveQuery.isError && !shownErrorToastForApproveStore.current) {
      toast.error('Failed to fetch dashboard.'); // you can include error details if desired
      shownErrorToastForApproveStore.current = true;
    }
  }, [storesToApproveQuery.isError]);

  return {
    stores: storesQuery.data ?? [],
    loading: storesQuery.isLoading,
    isError: storesQuery.isError,
    refetch: storesQuery.refetch,

    storesToApprove: storesToApproveQuery.data ?? [],
    storesToApproveLoading: storesToApproveQuery.isLoading,
    storesToApproveError: storesToApproveQuery.isError,
    storesToApproveRefetch: storesToApproveQuery.refetch,

    toggleIsActive,
    toggleState: {
      loading: toggleMutation.isPending,
      error: toggleMutation.isError,
    },

    handleApprove,
    approveState: {
      loading: approveMutation.isPending,
      error: approveMutation.isError,
    },
  };
}
