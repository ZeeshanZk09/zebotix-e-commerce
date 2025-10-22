'use client';
import Title from './Title';
import ProductCard from './ProductCard';
import { useSelector } from 'react-redux';
import type { RootState } from '@/lib/redux/store';
import { useAppSelector } from '@/lib/redux/hooks';
import { productDummyData } from '../../public/assets/assets';

const BestSelling = () => {
  const displayQuantity = 8;
  // const products = useAppSelector((state: RootState) => state.product.list);
  const products = productDummyData;
  return (
    <div className='px-6 my-30 max-w-6xl mx-auto'>
      <Title
        title='Best Selling'
        description={`Showing ${
          products.length < displayQuantity ? products.length : displayQuantity
        } of ${products.length} products`}
        href='/shop'
      />
      <div className='mt-12  grid grid-cols-2 sm:flex flex-wrap gap-6 xl:gap-12'>
        {products
          .slice()
          .sort((a, b) => b?.rating.length - a.rating.length)
          .slice(0, displayQuantity)
          .map((product, index) => (
            <ProductCard key={index} product={product as any} />
          ))}
      </div>
    </div>
  );
};

export default BestSelling;
