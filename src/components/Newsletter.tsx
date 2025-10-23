'use client';
import React from 'react';
import Title from './Title';

const Newsletter = () => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className='flex flex-col items-center mx-4 my-36'>
      <Title
        title='Join Newsletter'
        description='Subscribe to get exclusive deals, new arrivals, and insider updates delivered straight to your inbox every week.'
        visibleButton={false}
      />
      {/* For Desktop */}

      <div className='hidden sm:flex bg-slate-100 text-sm p-1 rounded-full w-full max-w-xl my-10 border-2 border-white ring ring-slate-200'>
        <input
          className='flex-1 pl-5 outline-none'
          type='text'
          placeholder='Enter your email address'
        />
        <button className='font-medium bg-green-500 text-white px-7 py-3 rounded-full hover:scale-103 active:scale-95 transition'>
          Get Updates
        </button>
      </div>
      {/* For Mobile */}
      <div className='flex items-center flex-col sm:hidden my-10 gap-4'>
        <input
          className='pl-5 outline-none border-2 bg-slate-100 text-lg p-1 rounded-lg w-[88vw] border-white ring ring-slate-200'
          type='text'
          placeholder='Enter your email address'
        />
        <button className='w-fit text-base font-medium bg-green-500 text-white px-7 py-3 rounded-full hover:scale-103 active:scale-95 transition'>
          Get Updates
        </button>
      </div>
    </div>
  );
};

export default Newsletter;
