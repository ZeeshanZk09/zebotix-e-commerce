'use client';

import { PlusIcon, SquarePenIcon, XIcon } from 'lucide-react';
import React, { useState, FormEvent, ChangeEvent } from 'react';
import AddressModal from './AddressModal';
import { useAppSelector } from '@/lib/redux/hooks';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Address, Coupon, OrderItem } from '@/generated/prisma/browser';
import { OrderItemCreateInput } from '@/generated/prisma/models';

// ✅ Component props
interface OrderSummaryProps {
  totalPrice: number;
  items: OrderItemCreateInput[];
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ totalPrice, items }) => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
  const router = useRouter();

  // ✅ Typed Redux state selector
  const addressList = useAppSelector((state) => state.address.list as Address[]);

  // ✅ Local state types
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'STRIPE'>('COD');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [coupon, setCoupon] = useState<Coupon | null>(null);

  // ✅ Handlers
  const handleCouponCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Example mock logic (replace with API later)
    if (couponCodeInput.toLowerCase() === 'save10') {
      setCoupon({
        code: 'SAVE10',
        description: '10% off your order',
        discount: 10,
      } as Coupon);
      toast.success('Coupon applied successfully!');
    } else {
      toast.error('Invalid coupon code');
    }
  };

  const handlePlaceOrder = async (
    e: FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    if (!selectedAddress) {
      toast.error('Please select or add an address.');
      return;
    }

    // Add order logic (API call etc.)
    router.push('/orders');
  };

  return (
    <div className='w-full max-w-lg lg:max-w-[340px] bg-slate-50/30 border border-slate-200 text-slate-500 text-sm rounded-xl p-7'>
      <h2 className='text-xl font-medium text-slate-600'>Payment Summary</h2>

      {/* Payment Method */}
      <p className='text-slate-400 text-xs my-4'>Payment Method</p>
      <div className='flex gap-2 items-center'>
        <input
          type='radio'
          id='COD'
          name='payment'
          onChange={() => setPaymentMethod('COD')}
          checked={paymentMethod === 'COD'}
          className='accent-gray-500'
        />
        <label htmlFor='COD' className='cursor-pointer'>
          Cash on Delivery
        </label>
      </div>

      <div className='flex gap-2 items-center mt-1'>
        <input
          type='radio'
          id='STRIPE'
          name='payment'
          onChange={() => setPaymentMethod('STRIPE')}
          checked={paymentMethod === 'STRIPE'}
          className='accent-gray-500'
        />
        <label htmlFor='STRIPE' className='cursor-pointer'>
          Stripe Payment
        </label>
      </div>

      {/* Address Section */}
      <div className='my-4 py-4 border-y border-slate-200 text-slate-400'>
        <p>Address</p>
        {selectedAddress ? (
          <div className='flex gap-2 items-center'>
            <p>
              {selectedAddress.name}, {selectedAddress.city}, {selectedAddress.state},{' '}
              {selectedAddress.zip}
            </p>
            <SquarePenIcon
              onClick={() => setSelectedAddress(null)}
              className='cursor-pointer'
              size={18}
            />
          </div>
        ) : (
          <div>
            {addressList.length > 0 && (
              <select
                className='border border-slate-400 p-2 w-full my-3 outline-none rounded'
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  setSelectedAddress(addressList[Number(e.target.value)])
                }
              >
                <option value=''>Select Address</option>
                {addressList.map((address, index) => (
                  <option key={index} value={index}>
                    {address.name}, {address.city}, {address.state}, {address.zip}
                  </option>
                ))}
              </select>
            )}
            <button
              className='flex items-center gap-1 text-slate-600 mt-1'
              onClick={() => setShowAddressModal(true)}
            >
              Add Address <PlusIcon size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Price Summary */}
      <div className='pb-4 border-b border-slate-200'>
        <div className='flex justify-between'>
          <div className='flex flex-col gap-1 text-slate-400'>
            <p>Subtotal:</p>
            <p>Shipping:</p>
            {coupon && <p>Coupon:</p>}
          </div>
          <div className='flex flex-col gap-1 font-medium text-right'>
            <p>
              {currency}
              {totalPrice.toLocaleString()}
            </p>
            <p>Free</p>
            {coupon && (
              <p>
                -{currency}
                {((coupon.discount / 100) * totalPrice).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Coupon Code */}
        {!coupon ? (
          <form
            onSubmit={(e) => toast.promise(handleCouponCode(e), { loading: 'Checking Coupon...' })}
            className='flex justify-center gap-3 mt-3'
          >
            <input
              onChange={(e) => setCouponCodeInput(e.target.value)}
              value={couponCodeInput}
              type='text'
              placeholder='Coupon Code'
              className='border border-slate-400 p-1.5 rounded w-full outline-none'
            />
            <button className='bg-slate-600 text-white px-3 rounded hover:bg-slate-800 active:scale-95 transition-all'>
              Apply
            </button>
          </form>
        ) : (
          <div className='w-full flex items-center justify-center gap-2 text-xs mt-2'>
            <p>
              Code: <span className='font-semibold ml-1'>{coupon.code.toUpperCase()}</span>
            </p>
            <p>{coupon.description}</p>
            <XIcon
              size={18}
              onClick={() => setCoupon(null)}
              className='hover:text-red-700 transition cursor-pointer'
            />
          </div>
        )}
      </div>

      {/* Total */}
      <div className='flex justify-between py-4'>
        <p>Total:</p>
        <p className='font-medium text-right'>
          {currency}
          {coupon
            ? (totalPrice - (coupon.discount / 100) * totalPrice).toFixed(2)
            : totalPrice.toLocaleString()}
        </p>
      </div>

      {/* Place Order Button */}
      <button
        onClick={(e) => toast.promise(handlePlaceOrder(e), { loading: 'Placing Order...' })}
        className='w-full bg-slate-700 text-white py-2.5 rounded hover:bg-slate-900 active:scale-95 transition-all'
      >
        Place Order
      </button>

      {/* Modal */}
      {showAddressModal && <AddressModal setShowAddressModal={setShowAddressModal} />}
    </div>
  );
};

export default OrderSummary;
