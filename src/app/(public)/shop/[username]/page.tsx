import ProductCard from '@/components/ProductCard';
import { MailIcon, MapPinIcon } from 'lucide-react';
import Image from 'next/image';

import { Product, Store } from '@/generated/prisma/browser';
import { getStoreByUsername, getStores } from '@/lib/server-actions/store';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const username = (await params).username;

  const response = (await getStoreByUsername(username)).json();
  console.log(await response);
  const store = (await response).data as Store;
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
  const username = (await params).username;

  const response = (await getStoreByUsername(username)).json();

  // Simulate server-side fetching (replace with DB call later)
  const storeInfo = (await response).data;
  const products = (await response).data.Product;

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
          {products.map((product: Product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      </div>
    </div>
  );
}

export async function generateStaticParams(): Promise<({ username: string } | undefined)[]> {
  try {
    const stores =
      ((await getStores()) as {
        status: string;
        id: string;
        userId: string;
        username: string;
        name: string;
        description: string;
        address: string;
        isActive: boolean;
        logo: string;
        email: string;
        contact: string;
        createdAt: Date;
        updatedAt: Date;
      }[]) ?? [];
    console.log(stores);
    return stores?.map((store) => ({ username: store.username }));
  } catch (error) {
    return [];
  }
}
