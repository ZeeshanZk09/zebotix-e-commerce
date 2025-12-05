import useHeader from '@/lib/hooks/useHeader';
import { Search } from 'lucide-react';
import React from 'react';

export default function SearchInput() {
  const {
    search,
    user,
    router,
    isAdmin,
    openSignIn,
    setSearch,
    handleSearch,
    handleAuthAction,
    isSeller,
    loading,
  } = useHeader();
  return (
    <form
      onSubmit={handleSearch}
      className='hidden xl:flex items-center w-xs text-sm gap-2 bg-slate-100 px-4 py-3 rounded-full'
    >
      <input
        className='w-full bg-transparent outline-none placeholder-slate-600'
        type='text'
        placeholder='Search products'
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <button type='submit'>
        <Search size={18} className='text-slate-600' />
      </button>
    </form>
  );
}
