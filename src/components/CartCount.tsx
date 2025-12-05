import { selectCartTotalQuantity } from '@/lib/redux/features/cart/cartSlice';
import { useAppSelector } from '@/lib/redux/hooks';
import { ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

export default function CartCount() {
  const cartCount = useAppSelector(selectCartTotalQuantity);

  return (
    <Link href='/cart' className='relative flex items-center gap-2 text-slate-600'>
      <ShoppingCart size={18} />
      Cart
      <button className='absolute -top-1 left-3 text-[8px] text-white bg-slate-600 size-3.5 rounded-full'>
        {cartCount}
      </button>
    </Link>
  );
}
