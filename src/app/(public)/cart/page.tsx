'use client';
import Counter from '@/components/Counter';
import ImageKit from '@/components/imagekit/Image';
import OrderSummary from '@/components/OrderSummary';
import PageTitle from '@/components/PageTitle';
import { OrderItemCreateInput } from '@/generated/prisma/models';
import { deleteItemFromCart } from '@/lib/redux/features/cart/cartSlice';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { Trash2Icon } from 'lucide-react';
import { useMemo } from 'react';

export default function Cart() {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

  const { cartItems } = useAppSelector((state) => state.cart);
  const products = useAppSelector((state) => state.product.list);
  const dispatch = useAppDispatch();

  /**
   * Build a display-friendly array from cartItems + products.
   * Each item has:
   *  - product: full product object from products[]
   *  - quantity: number
   *  - price: product.price (fallback 0)
   *  - orderId?: maybe present from cartItems
   */
  const cartArray = useMemo(() => {
    const arr: {
      product: any;
      quantity: number;
      price: number;
      orderId?: string | null;
    }[] = [];

    if (!cartItems || !products) return arr;

    for (const [productId, value] of Object.entries(cartItems)) {
      // value should be your CartItem object (quantity, price, orderId, etc.)
      if (!value) continue;

      const product = products.find((p: any) => p.id === productId);
      if (!product) continue; // product not loaded yet

      const quantity = Number(value.quantity ?? 0);
      const price = Number(product.price ?? value.price ?? 0);

      // only include items with positive quantity
      if (quantity <= 0) continue;

      arr.push({
        product,
        quantity,
        price,
        orderId: (value as any).orderId ?? null,
      });
    }

    return arr;
  }, [cartItems, products]);

  const totalPrice = useMemo(() => {
    return cartArray.reduce(
      (sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0),
      0
    );
  }, [cartArray]);

  const handleDeleteItemFromCart = (productId: string) => {
    dispatch(deleteItemFromCart({ productId }));
  };

  if (!cartArray || cartArray.length === 0) {
    return (
      <div className='min-h-[80vh] mx-6 flex items-center justify-center text-slate-400'>
        <h1 className='text-2xl sm:text-4xl font-semibold'>Your cart is empty</h1>
      </div>
    );
  }

  return (
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
              {cartArray.map((item) => {
                const product = item.product;
                const thumbnail =
                  (product?.images && product.images.length > 0 && product.images[0]) ??
                  '/default-image.png';
                return (
                  <tr key={product.id} className='space-x-2'>
                    <td className='flex gap-3 my-4'>
                      <div className='flex gap-3 items-center justify-center bg-slate-100 size-18 rounded-md'>
                        {product && (
                          <ImageKit
                            src={thumbnail}
                            className='h-14 w-auto'
                            alt={product.name ?? 'product'}
                          />
                        )}
                      </div>
                      <div>
                        <p className='max-sm:text-sm'>{product?.name ?? 'Product'}</p>
                        <p className='text-xs text-slate-500'>{product?.category ?? ''}</p>
                        <p>
                          {currency}
                          {item.price}
                        </p>
                      </div>
                    </td>
                    <td className='text-center'>
                      <Counter productId={product.id} />
                    </td>
                    <td className='text-center'>
                      {currency}
                      {(item.price * item.quantity).toLocaleString()}
                    </td>
                    <td className='text-center max-md:hidden'>
                      <button
                        onClick={() => handleDeleteItemFromCart(product.id)}
                        className=' text-red-500 hover:bg-red-50 p-2.5 rounded-full active:scale-95 transition-all'
                      >
                        <Trash2Icon size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <OrderSummary totalPrice={totalPrice} items={cartArray as any} />
        </div>
      </div>
    </div>
  );
}
