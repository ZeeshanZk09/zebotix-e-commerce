'use client';

import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import Counter from './Counter';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { addToCart } from '@/lib/redux/features/cart/cartSlice';
import type { Product } from '@/generated/prisma/client';
import { ProductCreateInput } from '@/generated/prisma/models';

interface ProductDetailsProps {
  product: ProductCreateInput;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({ product }) => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart.cartItems);

  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';
  const productId = product.id;
  const [mainImage, setMainImage] = useState(
    Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : ''
  );

  const addToCartHandler = () => {
    dispatch(addToCart({ productId: productId as string, item: product }));
  };

  const averageRating =
    Array.isArray(product.rating) && product.rating.length > 0
      ? product.rating.reduce((acc, item) => acc + item.rating, 0) / product.rating.length
      : 0;

  const discountPercentage = product.mrp
    ? (((product.mrp - product.price) / product.mrp) * 100).toFixed(0)
    : '0';

  const isInCart = Boolean(cart[productId as string]);

  return (
    <div className='flex max-lg:flex-col gap-12'>
      {/* --- Images Section --- */}
      <div className='flex max-sm:flex-col-reverse gap-3'>
        <div className='flex sm:flex-col gap-3'>
          {Array.isArray(product.images) &&
            product.images.map((image, index) => (
              <div
                key={index}
                onClick={() => setMainImage(image)}
                className='bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer'
              >
                <Image
                  src={image}
                  className='group-hover:scale-103 group-active:scale-95 transition'
                  alt={`${product.name} thumbnail ${index + 1}`}
                  width={45}
                  height={45}
                />
              </div>
            ))}
        </div>

        <div className='flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg'>
          <Image src={mainImage} alt={product.name} width={250} height={250} priority />
        </div>
      </div>

      {/* --- Details Section --- */}
      <div className='flex-1'>
        <h1 className='text-3xl font-semibold text-slate-800'>{product.name}</h1>

        {/* Rating */}
        <div className='flex items-center mt-2'>
          {Array.from({ length: 5 }).map((_, index) => (
            <StarIcon
              key={index}
              size={14}
              className='text-transparent mt-0.5'
              fill={averageRating >= index + 1 ? '#00C950' : '#D1D5DB'}
            />
          ))}
          <p className='text-sm ml-3 text-slate-500'>
            {Array.isArray(product.rating) && product.rating.length} Reviews
          </p>
        </div>

        {/* Price Section */}
        <div className='flex items-start my-6 gap-3 text-2xl font-semibold text-slate-800'>
          <p>
            {currency}
            {product.price}
          </p>
          {product.mrp && (
            <p className='text-xl text-slate-500 line-through'>
              {currency}
              {product.mrp}
            </p>
          )}
        </div>

        {/* Discount */}
        <div className='flex items-center gap-2 text-slate-500'>
          <TagIcon size={14} />
          <p>Save {discountPercentage}% right now</p>
        </div>

        {/* Actions */}
        <div className='flex items-end gap-5 mt-10'>
          {isInCart && (
            <div className='flex flex-col gap-3'>
              <p className='text-lg text-slate-800 font-semibold'>Quantity</p>
              <Counter productId={productId!} />
            </div>
          )}

          <button
            onClick={() => (isInCart ? router.push('/cart') : addToCartHandler())}
            className='bg-slate-800 text-white px-10 py-3 text-sm font-medium rounded hover:bg-slate-900 active:scale-95 transition'
          >
            {isInCart ? 'View Cart' : 'Add to Cart'}
          </button>
        </div>

        <hr className='border-gray-300 my-5' />

        {/* Info */}
        <div className='flex flex-col gap-4 text-slate-500'>
          <p className='flex gap-3'>
            <EarthIcon className='text-slate-400' /> Free shipping worldwide
          </p>
          <p className='flex gap-3'>
            <CreditCardIcon className='text-slate-400' /> 100% Secured Payment
          </p>
          <p className='flex gap-3'>
            <UserIcon className='text-slate-400' /> Trusted by top brands
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
