'use client';

import { useEffect, useState, useTransition } from 'react';
import { UserButton } from '@clerk/nextjs';
import { ListOrdered, Shield, Store, ShoppingCart } from 'lucide-react';
import useHeader from '@/lib/hooks/useHeader';

type Props = {
  actionDebounce?: number;
};

export default function NavbarAuth({ actionDebounce = 600 }: Props) {
  const [isPending, startTransition] = useTransition();
  const { user, router, isAdmin, isSeller, handleAuthAction } = useHeader();
  const [isLoading, setIsLoading] = useState(true);

  // Debounced loading state
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (user !== undefined) {
      timer = setTimeout(() => {
        setIsLoading(false);
      }, actionDebounce);
    }

    return () => clearTimeout(timer);
  }, [user, actionDebounce]);

  // Handle navigation with transition
  const handleNavigation = (path: string) => {
    if (isPending) return;
    startTransition(() => {
      router.push(path);
    });
  };

  // 1. Skeleton while loading
  if (isLoading) {
    return <div className='w-8 h-8 bg-slate-200 rounded-full animate-pulse' aria-hidden />;
  }

  // 2. Login button if no user
  if (!user) {
    return (
      <button
        onClick={() => handleAuthAction()}
        className='px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed'
        disabled={isPending}
      >
        Login
      </button>
    );
  }

  // 3. User button if user exists
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Action
          labelIcon={<ListOrdered size={16} />}
          label='My Orders'
          onClick={() => handleNavigation('/orders')}
        />
        {isAdmin && (
          <UserButton.Action
            labelIcon={<Shield size={16} />}
            label='Admin Dashboard'
            onClick={() => handleNavigation('/admin')}
          />
        )}
        {isSeller && (
          <UserButton.Action
            labelIcon={<Store size={16} />}
            label='Seller Dashboard'
            onClick={() => handleNavigation('/store')}
          />
        )}
      </UserButton.MenuItems>
    </UserButton>
  );
}

/** Mobile variant - simplified */
export function DebounceMobileNavbarAuth({ actionDebounce = 600 }: Props) {
  const [isPending, startTransition] = useTransition();
  const { user, router, isAdmin, isSeller, handleAuthAction } = useHeader();
  const [isLoading, setIsLoading] = useState(true);

  // Debounced loading state for mobile
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (user !== undefined) {
      timer = setTimeout(() => {
        setIsLoading(false);
      }, actionDebounce);
    }

    return () => clearTimeout(timer);
  }, [user, actionDebounce]);

  // Handle navigation
  const handleNavigation = (path: string) => {
    if (isPending) return;
    startTransition(() => {
      router.push(path);
    });
  };

  // 1. Skeleton while loading
  if (isLoading) {
    return (
      <div className='sm:hidden w-8 h-8 bg-slate-200 rounded-full animate-pulse' aria-hidden />
    );
  }
  // 2. Login button if no user
  if (!user) {
    return (
      <button
        onClick={() => handleAuthAction()}
        className='sm:hidden px-8 py-2 bg-indigo-500 hover:bg-indigo-600 transition text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed'
        disabled={isPending}
      >
        Login
      </button>
    );
  }

  // 2. Login or User button based on user
  return (
    <div className='sm:hidden'>
      <UserButton>
        <UserButton.MenuItems>
          <UserButton.Action
            labelIcon={<ShoppingCart size={16} />}
            label='Cart'
            onClick={() => handleNavigation('/cart')}
          />
          <UserButton.Action
            labelIcon={<ListOrdered size={16} />}
            label='My Orders'
            onClick={() => handleNavigation('/orders')}
          />
          {isAdmin && (
            <UserButton.Action
              labelIcon={<Shield size={16} />}
              label='Admin Dashboard'
              onClick={() => handleNavigation('/admin')}
            />
          )}
          {isSeller && (
            <UserButton.Action
              labelIcon={<Store size={16} />}
              label='Seller Dashboard'
              onClick={() => handleNavigation('/store')}
            />
          )}
        </UserButton.MenuItems>
      </UserButton>
    </div>
  );
}
