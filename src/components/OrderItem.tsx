'use client';
import Image from 'next/image';
import { DotIcon } from 'lucide-react';
import Rating from './Rating';
import { useState } from 'react';
import RatingModal from './RatingModal';
import { Rating as RatingType, Order } from '@/generated/prisma/browser';
import { useAppSelector } from '@/lib/redux/hooks';
import { OrderCreateInput, OrderModel } from '@/generated/prisma/models';

const OrderItem = ({ order }: { order: OrderModel | OrderCreateInput | any }) => {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
  const [ratingModal, setRatingModal] = useState<RatingType | null>(null);

  const { ratings } = useAppSelector((state) => state.rating);
  const orderItems = Array.isArray((order as any)?.orderItems)
    ? (order as any).orderItems
    : Array.isArray((order as any)?.orderItems?.connect)
    ? (order as any)?.orderItems?.connect
    : [];
  return (
    <>
      <tr className='text-sm'>
        <td className='text-left'>
          <div className='flex flex-col gap-6'>
            {orderItems.map((item: any, index: any) => (
              <div key={index} className='flex items-center gap-4'>
                <div className='w-20 aspect-square bg-slate-100 flex items-center justify-center rounded-md'>
                  <Image
                    className='h-14 w-auto'
                    src={item.product.images[0]}
                    alt='product_img'
                    width={50}
                    height={50}
                  />
                </div>
                <div className='flex flex-col justify-center text-sm'>
                  <p className='font-medium text-slate-600 text-base'>{item.product.name}</p>
                  <p>
                    {currency}
                    {item.price} Qty : {item.quantity}{' '}
                  </p>
                  <p className='mb-1'>{new Date(order.createdAt as Date).toDateString()}</p>
                  <div>
                    {ratings.find(
                      (rating) =>
                        order.id === rating.orderId && item.product.id === rating.productId
                    ) ? (
                      <Rating
                        value={
                          ratings?.find(
                            (rating) =>
                              order?.id === rating?.orderId &&
                              item?.product.id === rating?.productId
                          )?.rating as number
                        }
                      />
                    ) : (
                      <button
                        onClick={() =>
                          setRatingModal({ orderId: order.id, productId: item.product.id } as any)
                        }
                        className={`text-green-500 hover:bg-green-50 transition ${
                          order.status !== 'DELIVERED' && 'hidden'
                        }`}
                      >
                        Rate Product
                      </button>
                    )}
                  </div>
                  {ratingModal && (
                    <RatingModal ratingModal={ratingModal} setRatingModal={setRatingModal} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </td>

        <td className='text-center max-md:hidden'>
          {currency}
          {order.total}
        </td>

        <td className='text-left max-md:hidden'>
          <p>
            {order.address.connect?.name as string}, {order.address.connect?.street as string},
          </p>
          <p>
            {order.address.connect?.city as string}, {order.address.connect?.state as string},{' '}
            {order.address.connect?.zip as string}, {order.address.connect?.country as string},
          </p>
          <p>{order.address?.connect?.phone as string}</p>
        </td>

        <td className='text-left space-y-2 text-sm max-md:hidden'>
          <div
            className={`flex items-center justify-center gap-1 rounded-full p-1 ${
              order.status === 'ORDER_PLACED'
                ? 'text-yellow-500 bg-yellow-100'
                : order.status === 'DELIVERED'
                ? 'text-green-500 bg-green-100'
                : 'text-slate-500 bg-slate-100'
            }`}
          >
            <DotIcon size={10} className='scale-250' />
            {order?.status?.split('_').join(' ').toLowerCase()}
          </div>
        </td>
      </tr>
      {/* Mobile */}
      <tr className='md:hidden'>
        <td colSpan={5}>
          <p>
            {order.address?.connect?.name as string}, {order.address?.connect?.street as string}
          </p>
          <p>
            {order.address.connect?.city as string}, {order.address?.connect?.state as string},{' '}
            {order.address.connect?.zip as string}, {order.address?.connect?.country as string}
          </p>
          <p>{order.address?.connect?.phone as string}</p>
          <br />
          <div className='flex items-center'>
            <span className='text-center mx-auto px-6 py-1.5 rounded bg-green-100 text-green-700'>
              {order?.status?.replace(/_/g, ' ').toLowerCase()}
            </span>
          </div>
        </td>
      </tr>
      <tr>
        <td colSpan={4}>
          <div className='border-b border-slate-300 w-6/7 mx-auto' />
        </td>
      </tr>
    </>
  );
};

export default OrderItem;
