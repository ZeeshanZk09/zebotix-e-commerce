import { useAuth } from '@clerk/clerk-react';
import { useUser } from '@clerk/nextjs';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import axios from '@/lib/axios';
type IsAdminResponse = {
  data: {
    isAdmin: boolean;
  };
};

export function useAdmin() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const query = useQuery<boolean, AxiosError>({
    queryKey: ['admin', user?.id],
    queryFn: async ({ signal }): Promise<boolean> => {
      if (!user) throw new AxiosError('No user');

      const token = await getToken();
      const res = await axios.get<IsAdminResponse>('/api/admin/is-admin', {
        headers: { Authorization: `Bearer ${token}` },
        signal, // axios v1+ supports AbortSignal
      });

      return res.data.data.isAdmin;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
    retry: 1,
    refetchOnWindowFocus: false,
    throwOnError(err, query) {
      console.error('[useAdmin] Admin query throwOnError', err);
      if (!err.cause) {
        toast.error('Network error — unable to reach server. Check your connection.');
      } else if (err.status === 503) {
        toast.error('Service unavailable — database unreachable. Try again later.');
      } else {
        toast.error((err.response?.data as any)?.error || err.message || 'Something went wrong');
      }
      setTimeout(() => router.push('/'), 1500);
      return false; // don't throw the error
    },
  });

  return {
    isAdmin: query.data ?? false,
    loading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
