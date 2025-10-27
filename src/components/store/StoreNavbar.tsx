'use client';
import { useAdmin } from '@/lib/hooks/useAdmin';
import { UserButton, useUser } from '@clerk/nextjs';
import { ListOrdered, Shield, ShoppingCart } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const StoreNavbar = () => {
  const { user } = useUser();
  const router = useRouter();
  const { isAdmin } = useAdmin();
  return (
    <div className='flex items-center justify-between px-6 sm:px-12 py-3 border-b border-slate-200 transition-all'>
      <Link href='/' className='relative text-4xl font-semibold text-slate-700'>
        <span className='text-green-600'>go</span>cart
        <span className='text-green-600 text-5xl leading-0'>.</span>
        <p className='absolute text-xs font-semibold -top-1 -right-11 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500'>
          Store
        </p>
      </Link>
      <div className='flex items-center gap-3'>
        <p>Hi, {user?.firstName}</p>
        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Action
              labelIcon={<ListOrdered size={16} />}
              label='My Orders'
              onClick={() => router.push('/orders')}
            />
          </UserButton.MenuItems>
          <UserButton.MenuItems>
            <UserButton.Action
              labelIcon={<ShoppingCart size={16} />}
              label='Cart'
              onClick={() => router.push('/cart')}
            />
          </UserButton.MenuItems>
          {isAdmin && (
            <UserButton.MenuItems>
              <UserButton.Action
                labelIcon={<Shield size={16} />}
                label='Admin Dashboard'
                onClick={() => router.push('/admin')}
              />
            </UserButton.MenuItems>
          )}
        </UserButton>
      </div>
    </div>
  );
};

export default StoreNavbar;
