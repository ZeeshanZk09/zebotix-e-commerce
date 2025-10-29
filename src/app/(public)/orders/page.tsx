'use client';
import PageTitle from '@/components/PageTitle';
import { useEffect, useState } from 'react';
import OrderItem from '@/components/OrderItem';
import { orderDummyData } from '../../../../public/assets/assets';
import { Order } from '@/generated/prisma/browser';
import axios from 'axios';
import toast from 'react-hot-toast';
import { SignedIn, SignedOut, SignIn } from '@clerk/nextjs';
import Loading from '@/components/Loading';

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyOrders = async () => {
      try {
        const response = await axios.get('/api/orders');
        console.log(response.data);
        setOrders(response.data.data);
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        toast.error(error.response.data.message || 'Error fetching orders');
      } finally {
        setLoading(false);
      }
    };
    fetchMyOrders();
  }, []);

  if (loading) return <Loading />;

  return (
    <>
      <SignedIn>
        <div className='min-h-[70vh] mx-6'>
          {orders.length > 0 ? (
            <div className='my-20 max-w-7xl mx-auto'>
              <PageTitle
                heading='My Orders'
                text={`Showing total ${orders.length} orders`}
                linkText='Go to home'
              />

              <table className='w-full max-w-5xl text-slate-500 table-auto border-separate border-spacing-y-12 border-spacing-x-4'>
                <thead>
                  <tr className='max-sm:text-sm text-slate-600 max-md:hidden'>
                    <th className='text-left'>Product</th>
                    <th className='text-center'>Total Price</th>
                    <th className='text-left'>Address</th>
                    <th className='text-left'>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <OrderItem order={order} key={order.id} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className='min-h-[80vh] mx-6 flex items-center justify-center text-slate-400'>
              <h1 className='text-2xl sm:text-4xl font-semibold'>You have no orders</h1>
            </div>
          )}
        </div>
      </SignedIn>
      <SignedOut>
        <div className='min-h-screen flex justify-center items-center'>
          <SignIn routing='hash' fallbackRedirectUrl={'/orders'} />
        </div>
      </SignedOut>
    </>
  );
}
