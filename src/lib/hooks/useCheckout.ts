import { useState, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { useAppDispatch } from '../redux/hooks';
import { clearCart, fetchCart } from '../redux/features/cart/cartSlice';

// --- Types (adjust fields to your API) ---
export type Address = {
  id: string;
  name: string;
  zip: string;
  state: string;
  label?: string;
  line1?: string;
  city?: string;
  postalCode?: string;
  country?: string;
};

export type Coupon = {
  code: string;
  description?: string;
  discount?: number; // percent or flat depending on your backend
};

export type CartItem = {
  productId: string;
  quantity: number;
  price: number;
};

type OrderPayload = {
  addressId: string;
  items: CartItem[];
  paymentMethod: 'COD' | 'STRIPE';
  couponCode?: string;
};

// --- Hook ---
export default function useCheckout() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
  const dispatch = useAppDispatch();
  // local UI state
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'STRIPE'>('COD');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);

  // --- Queries ---
  const addressesQuery = useQuery<Address[]>({
    queryKey: ['addresses'],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get('/api/address', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.data ?? res.data;
    },

    enabled: !!user,
    // onSuccess(addresses) {
    //   // default select first address if not already selected
    //   if (!selectedAddress && addresses?.length) setSelectedAddress(addresses[0]);
    // },
  });

  const cartQuery = useQuery<{ items: CartItem[]; total?: number }>({
    queryKey: ['cart'],
    queryFn: async () => {
      const token = await getToken();
      const res = await axios.get('/api/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data?.data ?? res.data;
    },
    enabled: !!user,
  });

  // --- Mutations ---
  const applyCouponMutation = useMutation({
    mutationKey: ['applyCoupon'],
    mutationFn: async (code: string) => {
      const token = await getToken();
      const res = await axios.post(
        '/api/coupon',
        { code },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data?.data ?? res.data;
    },

    onSuccess(data) {
      setCoupon(data);
      // refetch cart (in case discount affects totals)
      // queryClient.invalidateQueries(['cart'] as any);
      toast.success('Coupon applied successfully!');
    },
    onError(error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to apply coupon');
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (payload: OrderPayload) => {
      const token = await getToken();
      const res = await axios.post('/api/orders', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.data;
    },

    onSuccess(data) {
      console.log('place order data: ', data);
      // backend may return a session.url for stripe
      const paymentMethodFromResp = data?.data?.paymentMethod;
      if (paymentMethodFromResp === 'STRIPE') {
        const url = data?.data?.url;
        if (url) window.location.href = url;
        return;
      }

      toast.success(data?.message ?? 'Order placed successfully!');
      // Refresh cart and orders list
      // dispatch(fetchCart(getToken));
      dispatch(clearCart());

      router.push('/orders');
    },
    onError(error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to place order');
    },
  });

  // --- Handlers ---
  const handleApplyCoupon = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!user) return toast.error('Please login to proceed.');
    if (!couponCodeInput?.trim()) return toast.error('Please enter a coupon code');
    await applyCouponMutation.mutateAsync(couponCodeInput.trim());
  };

  const handlePlaceOrder = async (
    e?: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>,
    itemsParam?: CartItem[]
  ) => {
    e?.preventDefault();

    if (!user) {
      toast.error('Please login to proceed.');
      return;
    }

    console.log('useCheckout ', itemsParam, cartQuery?.data);

    const items =
      itemsParam ??
      ((Array.isArray(cartQuery?.data)
        ? cartQuery.data
        : cartQuery?.data
        ? Object.values(cartQuery.data)
        : []) as CartItem[]);
    if (!selectedAddress) {
      toast.error('Please select or add an address.');
      return;
    }

    if (!items.length) {
      toast.error('Cart is empty.');
      return;
    }

    const orderData: OrderPayload = {
      addressId: selectedAddress.id,
      items,
      paymentMethod,
      ...(coupon ? { couponCode: coupon.code } : {}),
    };

    await placeOrderMutation.mutateAsync(orderData);
  };

  // convenience toggles
  const toggleAddressModal = () => setShowAddressModal((v) => !v);

  return {
    // data
    addresses: addressesQuery.data ?? [],
    cart: cartQuery.data,
    currency,

    // state
    paymentMethod,
    setPaymentMethod,
    selectedAddress,
    setSelectedAddress,
    showAddressModal,
    toggleAddressModal,
    couponCodeInput,
    setCoupon,
    setCouponCodeInput,
    coupon,

    // status flags
    isLoadingAddresses: addressesQuery.isLoading,
    isLoadingCart: cartQuery.isLoading,
    isApplyingCoupon: applyCouponMutation.isPending,
    isPlacingOrder: placeOrderMutation.isPending,

    // handlers
    handleApplyCoupon,
    handlePlaceOrder,
    setShowAddressModal,

    // query/mutation objects (exposed for advanced usage)
    queries: { addressesQuery, cartQuery },
    mutations: { applyCouponMutation, placeOrderMutation },
  } as const;
}

/*
  --- Example usage in a component ---

  // then use `handlePlaceOrder(undefined, items)` if you want to pass a custom items array
*/
