import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/nextjs';

export type Order = {
  id: string | number;
  status: string;
  // add other order fields you use
};

export default function useOrders() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  // Modal / selection UI state (keeps component simpler)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const openModal = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setSelectedOrder(null);
    setIsModalOpen(false);
  };

  // Fetch orders
  const fetchOrdersFn = async (): Promise<Order[]> => {
    const token = await getToken();
    const res = await axios.get('/api/store/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    // adapt to your API shape
    return res.data?.data ?? [];
  };

  const ordersQuery = useQuery<Order[], Error>({
    queryKey: ['store', 'orders'],
    queryFn: fetchOrdersFn,
    throwOnError: (err) => {
      console.error('Error fetching orders:', err);
      toast.error('Error fetching orders');
      return false;
    },
    // keep previous data while refetching
    staleTime: 1000 * 30,
  });

  // Mutation: update order status with optimistic update
  const updateOrderMutation = useMutation<
    { orderId: string | number; status: string }, // returned (we don't rely on server return)
    unknown,
    { orderId: string | number; status: string }
  >({
    mutationFn: async ({ orderId, status }) => {
      const token = await getToken();
      await axios.post(
        '/api/store/orders',
        { orderId, status },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return { orderId, status };
    },
    onMutate: async (variables) => {
      // optimistic update: update cache immediately
      await queryClient.cancelQueries({ queryKey: ['store', 'orders'] });
      const previous = queryClient.getQueryData<Order[]>(['store', 'orders']);

      queryClient.setQueryData<Order[] | undefined>(
        ['store', 'orders'],
        (old) =>
          old?.map((o) => (o.id === variables.orderId ? { ...o, status: variables.status } : o)) ??
          []
      );

      // return context for rollback
      return { previous };
    },
    onError: (err, variables, context: any) => {
      // rollback
      if (context?.previous) {
        queryClient.setQueryData(['store', 'orders'], context.previous);
      }
      console.error('Error updating order:', err);
      toast.error('Failed to update order');
    },
    onSuccess: (_, variables) => {
      toast.success('Order status updated');
      // optionally invalidate to get server canonical state
      queryClient.invalidateQueries({ queryKey: ['store', 'orders'] });
    },
    onSettled: () => {
      // ensure fresh state eventually
      queryClient.invalidateQueries({ queryKey: ['store', 'orders'] });
    },
  });

  // Prevent multiple toasts on re-renders: use a ref to show only once
  const shownSuccessToast = useRef(false);
  const shownErrorToast = useRef(false);

  // Show success toast when loading finishes and we have data
  useEffect(() => {
    if (!ordersQuery.isLoading && !ordersQuery.isFetching && !shownSuccessToast.current) {
      toast.success('Orders fetched successfully.');
      shownSuccessToast.current = true;
    }
  }, [ordersQuery.isLoading, ordersQuery.isFetching]);

  // Show error toast once if there's an error
  useEffect(() => {
    if (ordersQuery.isError && !shownErrorToast.current) {
      toast.error('Failed to fetch Orders.'); // you can include error details if desired
      shownErrorToast.current = true;
    }
  }, [ordersQuery.isError]);

  return {
    // query state & helpers
    orders: ordersQuery.data ?? [],
    isLoading: ordersQuery.isLoading,
    isFetching: ordersQuery.isFetching,
    isError: ordersQuery.isError,
    refetch: ordersQuery.refetch,

    // mutation helper
    updateOrderStatus: (orderId: string | number, status: string) =>
      updateOrderMutation.mutate({ orderId, status }),

    // modal helpers
    selectedOrder,
    isModalOpen,
    openModal,
    closeModal,

    // mutation state if you need it:
    updateStatusLoading: updateOrderMutation.isPending,
  };
}
