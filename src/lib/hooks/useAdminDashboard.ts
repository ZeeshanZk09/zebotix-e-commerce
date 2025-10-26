// hooks/useAdminDashboard.ts
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CircleDollarSignIcon, ShoppingBasketIcon, StoreIcon, TagsIcon } from 'lucide-react';

export type DashboardData = {
  products: number;
  revenue: string;
  orders: number;
  stores: number;
  allOrders: any[];
};

const emptyDashboard: DashboardData = {
  products: 0,
  revenue: '0',
  orders: 0,
  stores: 0,
  allOrders: [],
};

export function useAdminDashboard(enabled = true) {
  const { getToken } = useAuth();
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL ?? '$';

  const query = useQuery<DashboardData, Error>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async ({ signal }) => {
      console.debug('[useAdminDashboard] fetching dashboard');
      const token = await getToken();
      const res = await axios.get<{ data: DashboardData }>('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      console.debug('[useAdminDashboard] response', res.data);
      return res.data.data;
    },
    enabled,
    staleTime: 1000 * 60 * 1, // 1 minute
    retry: 1,
    refetchOnWindowFocus: false,
    throwOnError: (err: any) => {
      console.error('[useAdminDashboard] error', err);
      // Friendly user message — don't leak internals
      if (!err.response) {
        toast.error('Network error — unable to reach server.');
      } else if (err.response.status === 503) {
        toast.error('Service unavailable — try again later.');
      } else {
        toast.error(err.response?.data?.error ?? err.message ?? 'Failed to load dashboard');
      }
      return err;
    },
  });

  const data = query.data ?? emptyDashboard;

  const cards = [
    { title: 'Total Products', value: data.products, icon: ShoppingBasketIcon },
    { title: 'Total Revenue', value: `${currency}${data.revenue}`, icon: CircleDollarSignIcon },
    { title: 'Total Orders', value: data.orders, icon: TagsIcon },
    { title: 'Total Stores', value: data.stores, icon: StoreIcon },
  ];

  return {
    dashboard: data,
    allOrders: data.allOrders,
    loading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    cards,
  };
}
