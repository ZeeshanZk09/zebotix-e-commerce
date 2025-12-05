import Link from 'next/link';
import NavbarAuth, { DebounceMobileNavbarAuth } from './DebounceNavbar';
import SearchInput from './SearchInput';
import CartCount from './CartCount';
import { Protect } from '@clerk/nextjs';
export default function Navbar() {
  return (
    <nav className='relative bg-white'>
      <div className='mx-6'>
        <div className='flex items-center justify-between max-w-7xl mx-auto py-4  transition-all'>
          <Link href='/' className='relative text-4xl font-semibold text-slate-700'>
            <span className='text-green-600'>go</span>cart
            <span className='text-green-600 text-5xl leading-0'>.</span>
            <Protect plan={'plus'}>
              <p className='absolute text-xs font-semibold -top-1 -right-8 px-3 p-0.5 rounded-full flex items-center gap-2 text-white bg-green-500'>
                plus
              </p>
            </Protect>
          </Link>

          {/* Desktop Menu */}
          <div className='hidden sm:flex items-center gap-4 lg:gap-8 text-slate-600'>
            <Link href='/'>Home</Link>
            <Link href='/shop'>Shop</Link>
            <Link href='/'>About</Link>
            <Link href='/'>Contact</Link>

            <SearchInput />

            <CartCount />

            <NavbarAuth />
          </div>

          {/* Mobile User Button  */}
          <DebounceMobileNavbarAuth />
        </div>
      </div>
      <hr className='border-gray-300' />
    </nav>
  );
}
