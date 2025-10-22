'use client';
import React from 'react';
import Title from './Title';
import ProductCard from './ProductCard';
import { useAppSelector } from '@/lib/redux/hooks';
import { productDummyData } from '../../public/assets/assets';

const LatestProducts = () => {
  const displayQuantity = 4;
  // const products = useAppSelector((state) => state.product.list);
  const products = productDummyData;

  return (
    <div className='px-6 my-30 max-w-6xl mx-auto'>
      <Title
        title='Latest Products'
        description={`Showing ${
          products.length < displayQuantity ? products.length : displayQuantity
        } of ${products.length} products`}
        href='/shop'
      />
      <div className='mt-12 grid grid-cols-2 sm:flex flex-wrap gap-6 justify-between'>
        {products
          .slice()
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, displayQuantity)
          .map((product, index) => (
            <ProductCard key={index} product={product as any} />
          ))}
      </div>
    </div>
  );
};

export default LatestProducts;
