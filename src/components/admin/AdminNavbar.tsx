import useHeader from '@/lib/hooks/useHeader';
import { UserButton, useUser } from '@clerk/nextjs';
import { ListOrdered, Shield, ShoppingCart, Store } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const AdminNavbar = () => {
  const { user } = useUser();
  const router = useRouter();
  const { isSeller } = useHeader();
  return (
    <div className='flex items-center justify-between px-6 sm:px-12 py-3 border-b border-slate-200 transition-all'>
      <Link href='/' className='relative text-lg sm:text-4xl font-semibold text-slate-700'>
        <span className='text-green-600'>go</span>cart
        <span className='text-green-600 text-5xl leading-0'>.</span>
        <p className='absolute text-[10px] font-semibold -top-1 -right-13 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500'>
          Admin
        </p>
      </Link>
      <div className='flex items-center gap-3'>
        <p>Hi, {user?.fullName || 'Admin'}</p>
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
          {isSeller && (
            <UserButton.MenuItems>
              <UserButton.Action
                labelIcon={<Store size={16} />}
                label='Seller Dashboard'
                onClick={() => router.push('/store')}
              />
            </UserButton.MenuItems>
          )}
        </UserButton>
      </div>
    </div>
  );
};

export default AdminNavbar;
