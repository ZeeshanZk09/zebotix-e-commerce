'use client';
import { addAddress } from '@/lib/redux/features/address/addressSlice';
import { fetchCart } from '@/lib/redux/features/cart/cartSlice';
import { useAppDispatch } from '@/lib/redux/hooks';
import { useAuth, useUser } from '@clerk/nextjs';
import axios from 'axios';
import { XIcon } from 'lucide-react';
import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

const AddressModal = ({ setShowAddressModal }: { setShowAddressModal: (b: boolean) => void }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const dispatch = useAppDispatch();

  const [address, setAddress] = useState({
    name: '',
    email: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    phone: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAddress((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // small helper to refresh cart (keeps your original logic)
  const refreshCart = async () => {
    try {
      await dispatch(fetchCart(getToken));
    } catch (err) {
      // don't break UI if cart fetch fails
      console.error('fetchCart error', err);
    }
  };

  // submit returns a promise we can pass to toast.promise
  const handleSubmit = async (): Promise<void | string> => {
    setIsSubmitting(true);
    try {
      if (!user) return toast.error('Please login to proceed.');
      const token = await getToken();
      const res = await axios.post(
        '/api/address',
        // server accepts either raw address object or { address: ... } — your server tolerates both
        address,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // server returns shape like: { message, statusCode, success, data: <address> }
      const newAddress = res.data?.data ?? res.data;

      if (!newAddress) {
        throw new Error('Address not returned from server');
      }

      // 1) Update local store optimistically by dispatching addAddress with created address
      // Ensure your addAddress reducer expects an address object (not a token).
      dispatch(addAddress(newAddress));

      // 2) Refresh cart (you had this previously). Keep it but don't block UI if it fails.
      await refreshCart();

      // 3) Close modal
      setShowAddressModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // On mount (or user change) you were fetching cart; keep that behaviour if you want
  useEffect(() => {
    if (!user) return;
    // fetch cart once
    dispatch(fetchCart(getToken)).catch((e) => console.error('fetchCart', e));
  }, [dispatch, user, getToken]);

  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        // Use toast.promise to show loading/success/error with the same promise
        toast.promise(handleSubmit(), {
          loading: 'Adding Address...',
          success: 'Address added',
          error: (err: any) => err?.message ?? 'Could not add address',
        });
      }}
      className='fixed inset-0 z-50 bg-white/60 backdrop-blur h-screen flex items-center justify-center'
    >
      <div className='flex flex-col gap-5 text-slate-700 w-full max-w-sm mx-6'>
        <h2 className='text-3xl '>
          Add New <span className='font-semibold'>Address</span>
        </h2>

        <input
          name='name'
          onChange={handleAddressChange}
          value={address.name}
          className='p-2 px-4 ...'
          type='text'
          placeholder='Enter your name'
          required
        />

        <input
          name='email'
          onChange={handleAddressChange}
          value={address.email}
          className='p-2 px-4 ...'
          type='email'
          placeholder='Email address'
          required
        />

        <input
          name='street'
          onChange={handleAddressChange}
          value={address.street}
          className='p-2 px-4 ...'
          type='text'
          placeholder='Street'
          required
        />

        <div className='flex gap-4'>
          <input
            name='city'
            onChange={handleAddressChange}
            value={address.city}
            className='p-2 px-4 ...'
            type='text'
            placeholder='City'
            required
          />
          <input
            name='state'
            onChange={handleAddressChange}
            value={address.state}
            className='p-2 px-4 ...'
            type='text'
            placeholder='State'
            required
          />
        </div>

        <div className='flex gap-4'>
          <input
            name='zip'
            onChange={handleAddressChange}
            value={address.zip}
            className='p-2 px-4 ...'
            type='number'
            placeholder='Zip code'
            required
          />
          <input
            name='country'
            onChange={handleAddressChange}
            value={address.country}
            className='p-2 px-4 ...'
            type='text'
            placeholder='Country'
            required
          />
        </div>

        <input
          name='phone'
          onChange={handleAddressChange}
          value={address.phone}
          className='p-2 px-4 ...'
          type='text'
          placeholder='Phone'
          required
        />

        <button
          type='submit'
          disabled={isSubmitting}
          className={`bg-slate-800 text-white text-sm font-medium py-2.5 rounded-md hover:bg-slate-900 active:scale-95 transition-all ${
            isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? 'Saving…' : 'SAVE ADDRESS'}
        </button>
      </div>

      <XIcon
        size={30}
        className='absolute top-5 right-5 text-slate-500 hover:text-slate-700 cursor-pointer'
        onClick={() => setShowAddressModal(false)}
      />
    </form>
  );
};

export default AddressModal;
