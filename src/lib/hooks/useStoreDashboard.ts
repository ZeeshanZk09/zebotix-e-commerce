// hooks/useStoreDashboard.ts
import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@clerk/clerk-react';
import axios from '@/lib/axios';
import toast from 'react-hot-toast';

// import your icons types
import { ShoppingBasketIcon, CircleDollarSignIcon, TagsIcon, StarIcon } from 'lucide-react';

type DashboardData = {
  totalProducts: number;
  totalEarnings: number;
  totalOrders: number;
  ratings: any[];
};

export default function useStoreDashboard(opts?: { currency?: string }) {
  const { currency = '₨' } = opts ?? {};
  const { user } = useUser();
  const { getToken } = useAuth();

  const query = useQuery<
    DashboardData,
    Error,
    DashboardData,
    readonly ['store', 'dashboard', string]
  >({
    queryKey: ['store', 'dashboard', user?.id ?? 'anon'],
    queryFn: async ({ signal }) => {
      // fetch token each call (Clerk)
      const token = await getToken();
      const res = await axios.get<{ data: DashboardData }>('/api/store/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      return res.data.data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    throwOnError: (err) => {
      console.error('Error fetching dashboard data:', err);
      toast.error('Error fetching dashboard data');
      return false;
    },
  });

  const dashboardData = query.data ?? {
    totalProducts: 0,
    totalEarnings: 0,
    totalOrders: 0,
    ratings: [],
  };

  const dashboardCardsData = useMemo(
    () => [
      { title: 'Total Products', value: dashboardData.totalProducts, icon: ShoppingBasketIcon },
      {
        title: 'Total Earnings',
        value: `${currency}${dashboardData.totalEarnings}`,
        icon: CircleDollarSignIcon,
      },
      { title: 'Total Orders', value: dashboardData.totalOrders, icon: TagsIcon },
      { title: 'Total Ratings', value: dashboardData.ratings.length, icon: StarIcon },
    ],
    [dashboardData, currency]
  );

  // Prevent multiple toasts on re-renders: use a ref to show only once
  const shownSuccessToast = useRef(false);
  const shownErrorToast = useRef(false);

  // Show success toast when loading finishes and we have data
  useEffect(() => {
    if (!query.isLoading && !query.isFetching && dashboardData && !shownSuccessToast.current) {
      toast.success('Dashboard fetched successfully.');
      shownSuccessToast.current = true;
    }
  }, [query.isLoading, query.isFetching, dashboardData]);

  // Show error toast once if there's an error
  useEffect(() => {
    if (query.isError && !shownErrorToast.current) {
      toast.error('Failed to fetch dashboard.'); // you can include error details if desired
      shownErrorToast.current = true;
    }
  }, [query.isError]);

  return {
    // query state
    data: dashboardData,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,

    // memoized UI helper
    cards: dashboardCardsData,
  };
}
