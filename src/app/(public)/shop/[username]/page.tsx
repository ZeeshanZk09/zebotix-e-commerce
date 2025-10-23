import ProductCard from '@/components/ProductCard';
import { MailIcon, MapPinIcon } from 'lucide-react';
import Image from 'next/image';
import {
  dummyStoreData,
  productDummyData,
  storesDummyData,
} from './../../../../../public/assets/assets';
import { Product, Store } from '@/generated/prisma/browser';

export async function generateMetadata({ params }: { params: { username: string } }) {
  const store = dummyStoreData;
  return {
    title: `${store.name} | Shop`,
    description: store.description,
    openGraph: {
      images: [store.logo],
    },
  };
}

export const revalidate = 60;

export default async function StoreShop({ params }: { params: Promise<{ username: string }> }) {
  // Simulate server-side fetching (replace with DB call later)
  const storeInfo = dummyStoreData;
  const products = productDummyData;

  const username = (await params).username;

  if (!storeInfo) {
    return (
      <div className='min-h-[70vh] flex items-center justify-center'>
        <p className='text-slate-500'>Store not found.</p>
      </div>
    );
  }

  return (
    <div className='min-h-[70vh] mx-6'>
      {/* Store Info Banner */}
      <div className='max-w-7xl mx-auto bg-slate-50 rounded-xl p-6 md:p-10 mt-6 flex flex-col md:flex-row items-center gap-6 shadow-xs'>
        <Image
          src={storeInfo.logo}
          alt={storeInfo.name}
          className='size-32 sm:size-38 object-cover border-2 border-slate-100 rounded-md'
          width={200}
          height={200}
          priority
        />
        <div className='text-center md:text-left'>
          <h1 className='text-3xl font-semibold text-slate-800'>{storeInfo.name}</h1>
          <p className='text-sm text-slate-600 mt-2 max-w-lg'>{storeInfo.description}</p>
          <div className='space-y-2 text-sm text-slate-500 mt-4'>
            <div className='flex items-center'>
              <MapPinIcon className='w-4 h-4 text-gray-500 mr-2' />
              <span>{storeInfo.address}</span>
            </div>
            <div className='flex items-center'>
              <MailIcon className='w-4 h-4 text-gray-500 mr-2' />
              <span>{storeInfo.email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className='max-w-7xl mx-auto mb-40'>
        <h1 className='text-2xl mt-12'>
          Shop <span className='text-slate-800 font-medium'>Products</span>
        </h1>
        <div className='mt-5 grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12 mx-auto'>
          {products.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  // ✅ Predefine or fetch from DB all usernames
  const stores = storesDummyData;
  return stores.map((store) => ({ username: store.username }));
}
