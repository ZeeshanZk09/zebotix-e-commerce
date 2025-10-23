'use client';
import Counter from '@/components/Counter';
import OrderSummary from '@/components/OrderSummary';
import PageTitle from '@/components/PageTitle';
import { OrderItem } from '@/generated/prisma/browser';
import { OrderItemCreateInput } from '@/generated/prisma/models';
import { deleteItemFromCart } from '@/lib/redux/features/cart/cartSlice';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { Trash2Icon } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function Cart() {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

  const { cartItems } = useAppSelector((state) => state.cart);
  const products = useAppSelector((state) => state.product.list);

  const dispatch = useAppDispatch();

  const [cartArray, setCartArray] = useState<OrderItemCreateInput[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);

  const createCartArray = () => {
    setTotalPrice(0);
    const cartArray: OrderItemCreateInput[] = [];
    for (const [key, value] of Object.entries(cartItems)) {
      const product = products.find((product) => product.id === key);
      if (product) {
        cartArray.push({
          order: {
            connect: { id: value?.orderId! },
          },
          product: { connect: { id: product.id } },
          quantity: +value?.price!,
          price: product.price,
        });
        setTotalPrice((prev) => prev + product.price * +value);
      }
    }
    setCartArray(cartArray);
  };

  const handleDeleteItemFromCart = (productId: string) => {
    dispatch(deleteItemFromCart({ productId }));
  };

  useEffect(() => {
    if (products.length > 0) {
      createCartArray();
    }
  }, [cartItems, products]);

  return cartArray.length > 0 ? (
    <div className='min-h-screen mx-6 text-slate-800'>
      <div className='max-w-7xl mx-auto '>
        {/* Title */}
        <PageTitle heading='My Cart' text='items in your cart' linkText='Add more' />

        <div className='flex items-start justify-between gap-5 max-lg:flex-col'>
          <table className='w-full max-w-4xl text-slate-600 table-auto'>
            <thead>
              <tr className='max-sm:text-sm'>
                <th className='text-left'>Product</th>
                <th>Quantity</th>
                <th>Total Price</th>
                <th className='max-md:hidden'>Remove</th>
              </tr>
            </thead>
            <tbody>
              {cartArray.map((item, index) => (
                <tr key={index} className='space-x-2'>
                  <td className='flex gap-3 my-4'>
                    <div className='flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md'>
                      <Image
                        src={
                          (Array.isArray(item.product.connect?.images) &&
                            (item.product.connect?.images[0] as string)) ||
                          ''
                        }
                        className='h-14 w-auto'
                        alt=''
                        width={45}
                        height={45}
                      />
                    </div>
                    <div>
                      <p className='max-sm:text-sm'>{item.product?.connect?.name! as string}</p>
                      <p className='text-xs text-slate-500'>
                        {item?.product?.connect?.category as string}
                      </p>
                      <p>
                        {currency}
                        {item.price}
                      </p>
                    </div>
                  </td>
                  <td className='text-center'>
                    <Counter productId={item.product?.connect?.id as string} />
                  </td>
                  <td className='text-center'>
                    {currency}
                    {(item.price * item.quantity).toLocaleString()}
                  </td>
                  <td className='text-center max-md:hidden'>
                    <button
                      onClick={() => handleDeleteItemFromCart(item.product.connect?.id as string)}
                      className=' text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all'
                    >
                      <Trash2Icon size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <OrderSummary totalPrice={totalPrice} items={cartArray} />
        </div>
      </div>
    </div>
  ) : (
    <div className='min-h-[80vh] mx-6 flex items-center justify-center text-slate-400'>
      <h1 className='text-2xl sm:text-4xl font-semibold'>Your cart is empty</h1>
    </div>
  );
}
