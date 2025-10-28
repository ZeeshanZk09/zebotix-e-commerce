'use client';

import { StarIcon, TagIcon, EarthIcon, CreditCardIcon, UserIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Counter from './Counter';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { addToCart } from '@/lib/redux/features/cart/cartSlice';
import ImageKit from './imagekit/Image';
import Loading from './Loading';

type Props = { productId: string };

export default function ProductDetails({ productId }: Props) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart.cartItems);

  const [loading, setLoading] = useState(true);
  const products = useAppSelector((state) => state.product.list);
  const product = products?.find((p: any) => p.id === productId);

  // ---------------------
  // Hooks (always called in same order)
  // ---------------------
  const [mainImage, setMainImage] = useState<string>('');
  const failedImagesRef = useRef<Set<string>>(new Set());

  // sync main image when product changes
  useEffect(() => {
    if (product && Array.isArray(product.images) && product.images.length > 0) {
      failedImagesRef.current.clear();
      setMainImage(product.images[0] ?? '');
    } else {
      failedImagesRef.current.clear();
      setMainImage('');
    }
    setLoading(false);
  }, [setLoading, product?.id]);

  // derived values memoized for stability
  const averageRating = useMemo(() => {
    if (!product || !Array.isArray(product.rating) || product.rating.length === 0) return 0;
    const sum = product.rating.reduce((acc: number, r: any) => acc + (r?.rating || 0), 0);
    return sum / product.rating.length;
  }, [product]);

  const discountPercentage = useMemo(() => {
    if (!product || !product.mrp) return '0';
    const discount = (((product.mrp - product.price) / product.mrp) * 100).toFixed(0);
    return discount;
  }, [product]);

  // callbacks
  const handleThumbnailClick = useCallback((img: string) => {
    if (!img) return;
    setMainImage(img);
  }, []);

  const handleImageError = useCallback(() => {
    // mark current as failed, then try next image, finally a fallback
    if (!product || !Array.isArray(product.images)) {
      return;
    }

    if (mainImage) failedImagesRef.current.add(mainImage);

    const next = product.images.find((img: string) => !failedImagesRef.current.has(img));
    setMainImage(next);
  }, [mainImage, product]);

  const addToCartHandler = useCallback(() => {
    if (!product) return;
    dispatch(addToCart({ productId, item: product }));
  }, [dispatch, productId, product]);

  const isInCart = Boolean(cart && cart[productId]);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '$';

  if (!product || loading) return <Loading />;

  // ---------------------
  // Render
  // ---------------------
  if (product) {
    return (
      <div className='flex max-lg:flex-col gap-12'>
        {/* --- Images Section --- */}
        <div className='flex max-sm:flex-col-reverse gap-3'>
          <div className='flex sm:flex-col gap-3'>
            {Array.isArray(product.images) &&
              product.images.map((image: string, index: number) => (
                <button
                  key={image || index}
                  type='button'
                  onClick={() => handleThumbnailClick(image)}
                  aria-label={`Show thumbnail ${index + 1}`}
                  className={`bg-slate-100 flex items-center justify-center size-26 rounded-lg group cursor-pointer p-1 ${
                    mainImage === image ? 'ring-2 ring-offset-1 ring-slate-300' : ''
                  }`}
                >
                  {image ? (
                    <ImageKit
                      src={image}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className='w-20 h-20 group-hover:scale-103 group-active:scale-95 transition object-contain'
                      handleError={() => handleImageError()}
                    />
                  ) : (
                    <div className='w-20 h-20 bg-gray-50 rounded' />
                  )}
                </button>
              ))}
          </div>

          <div className='flex justify-center items-center h-100 sm:size-113 bg-slate-100 rounded-lg overflow-hidden'>
            {mainImage ? (
              <ImageKit
                src={mainImage}
                alt={product.name}
                handleError={handleImageError}
                className='max-h-[420px] max-w-full object-contain'
              />
            ) : (
              <div className='flex items-center justify-center w-full h-full text-slate-400'>
                <span>No image available</span>
              </div>
            )}
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
              {Array.isArray(product.rating) ? product.rating.length : 0} Reviews
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
                <Counter productId={productId} />
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
  }

  return (
    <div className='min-h-[70vh] flex items-center justify-center text-slate-500'>
      Product not found.
    </div>
  );
}
