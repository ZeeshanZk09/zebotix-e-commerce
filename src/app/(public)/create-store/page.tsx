'use client';
import { assets } from './../../../../public/assets/assets';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import Loading from '@/components/Loading';
import { Store } from '@/generated/prisma/browser';
import { StoreCreateInput } from '@/generated/prisma/models';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useSellerStore } from '@/lib/hooks/useSellerStore';
export default function CreateStore() {
  const {
    submitStore,
    submitState,
    alreadySubmitted,
    storeForm,
    statusLoading,
    statusError,
    setStoreForm,
    status,
    previewUrl,
    onFileChange,
    onChangeHandler,
    message,
    user,
    loading,
  } = useSellerStore();
  if (!user) {
    return (
      <div className='min-h-screen mx-6 flex items-center justify-center text-slate-400'>
        <h1 className='text-2xl sm:text-4xl font-semibold'>
          Please
          <span className='text-slate-500'> login </span>
          to continue
        </h1>
      </div>
    );
  }

  return !loading ? (
    <>
      {!alreadySubmitted ? (
        <div className='mx-6 min-h-[70vh] my-16'>
          <form
            onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;

              const payload = {
                username: (form.elements.namedItem('username') as HTMLInputElement).value,
                name: (form.elements.namedItem('name') as HTMLInputElement).value,
                description: (form.elements.namedItem('description') as HTMLTextAreaElement).value,
                address: (form.elements.namedItem('address') as HTMLInputElement).value,
                email: (form.elements.namedItem('email') as HTMLInputElement).value,
                contact: (form.elements.namedItem('contact') as HTMLInputElement).value,
              };

              // submitStore(payload) returns a Promise — pass it directly
              toast.promise(submitStore(payload), {
                loading: 'Submitting data...',
                success: 'Submitted successfully',
                error: 'Submit failed',
              });
            }}
            className='max-w-7xl mx-auto flex flex-col items-start gap-3 text-slate-500'
          >
            {/* Title */}
            <div>
              <h1 className='text-3xl '>
                Add Your <span className='text-slate-800 font-medium'>Store</span>
              </h1>
              <p className='max-w-lg'>
                To become a seller on GoCart, submit your store details for review. Your store will
                be activated after admin verification.
              </p>
            </div>

            <label className='mt-10 cursor-pointer'>
              Store Logo
              <Image
                src={previewUrl ? previewUrl : assets.upload_area}
                className='rounded-lg mt-2 h-16 w-auto'
                alt=''
                width={150}
                height={100}
              />
              <input
                type='file'
                accept='image/*'
                onChange={(e) =>
                  setStoreForm({ ...storeForm, logo: (e.target.files?.[0] as any) || '' })
                }
                hidden
              />
            </label>

            <p>Username</p>
            <input
              name='username'
              onChange={onChangeHandler}
              value={storeForm.username}
              type='text'
              placeholder='Enter your store username'
              className='border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded'
            />

            <p>Name</p>
            <input
              name='name'
              onChange={onChangeHandler}
              value={storeForm.name}
              type='text'
              placeholder='Enter your store name'
              className='border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded'
            />

            <p>Description</p>
            <textarea
              name='description'
              onChange={onChangeHandler}
              value={storeForm.description}
              rows={5}
              placeholder='Enter your store description'
              className='border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none'
            />

            <p>Email</p>
            <input
              name='email'
              onChange={onChangeHandler}
              value={storeForm.email}
              type='email'
              placeholder='Enter your store email'
              className='border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded'
            />

            <p>Contact Number</p>
            <input
              name='contact'
              onChange={onChangeHandler}
              value={storeForm.contact}
              type='text'
              placeholder='Enter your store contact number'
              className='border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded'
            />

            <p>Address</p>
            <textarea
              name='address'
              onChange={onChangeHandler}
              value={storeForm.address}
              rows={5}
              placeholder='Enter your store address'
              className='border border-slate-300 outline-slate-400 w-full max-w-lg p-2 rounded resize-none'
            />

            <button className='bg-slate-800 text-white px-12 py-2 rounded mt-10 mb-40 active:scale-95 hover:bg-slate-900 transition '>
              Submit
            </button>
          </form>
        </div>
      ) : (
        <div className='min-h-[80vh] flex flex-col items-center justify-center text-center px-6'>
          <div className='max-w-xl bg-white/5 border border-slate-200/20 rounded-2xl p-8 shadow-md backdrop-blur-sm'>
            <p className='text-slate-600 sm:text-2xl lg:text-3xl font-semibold mb-4'>
              {alreadySubmitted && status}
            </p>

            {status === 'approved' ? (
              <p className='text-emerald-500 text-sm sm:text-base'>
                🎉 Store approved! Redirecting to dashboard in{' '}
                <span className='font-semibold text-emerald-600'>5 seconds...</span>
              </p>
            ) : status === 'rejected' ? (
              <p className='text-rose-500 text-sm sm:text-base'>
                ❌ Store rejected. Redirecting to store dashboard in{' '}
                <span className='font-semibold text-rose-600'>5 seconds...</span>
              </p>
            ) : (
              <p className='text-slate-500 text-sm sm:text-base animate-pulse'>⏳ {message}</p>
            )}
          </div>
        </div>
      )}
    </>
  ) : (
    <Loading />
  );
}
