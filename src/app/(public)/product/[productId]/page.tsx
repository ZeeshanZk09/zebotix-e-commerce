'use client';
import ProductDescription from '@/components/ProductDescription';
import ProductDetails from '@/components/ProductDetails';
import { Product as ProductType } from '@/generated/prisma/browser';
import { ProductCreateInput } from '@/generated/prisma/models';
import { useAppSelector } from '@/lib/redux/hooks';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

export default function Product() {
  const { productId } = useParams();
  const [product, setProduct] = useState<ProductType | null>(null);
  const products = useAppSelector((state) => state.product.list);

  const fetchProduct = async () => {
    const product = products.find(
      (product) => (product as ProductCreateInput).id === productId
    ) as ProductType;
    setProduct(product);
  };

  useEffect(() => {
    if (products.length > 0) {
      fetchProduct();
    }
    scrollTo(0, 0);
  }, [productId, products]);

  return (
    <div className='mx-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Breadcrums */}
        <div className='  text-gray-600 text-sm mt-8 mb-5'>
          Home / Products / {product?.category}
        </div>

        {/* Product Details */}
        {product && <ProductDetails product={product} />}

        {/* Description & Reviews */}
        {product && <ProductDescription product={product} />}
      </div>
    </div>
  );
}
