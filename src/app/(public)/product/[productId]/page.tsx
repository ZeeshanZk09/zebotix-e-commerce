import ProductDescription from '@/components/ProductDescription';
import ProductDetails from '@/components/ProductDetails';
import { Product } from '@/generated/prisma/browser';
import { productDummyData } from '../../../../../public/assets/assets';

// ✅ Static page revalidation time (in seconds)
export const revalidate = 60;

// ✅ Generate metadata dynamically for each product (SEO + OG)
export async function generateMetadata({ params }: { params: { productId: string } }) {
  const product = productDummyData.find((p) => p.id === params.productId);
  if (!product) return { title: 'Product Not Found' };

  return {
    title: `${product.name} | Zebotix`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.images?.[0] || '/default-image.png'],
    },
  };
}

// ✅ Page component
export default async function ProductPage({ params }: { params: { productId: string } }) {
  // Simulate fetching product (replace with DB later)
  const product = productDummyData.find((p) => p.id === params.productId) as Product | undefined;

  if (!product) {
    return (
      <div className='min-h-[70vh] flex items-center justify-center text-slate-500'>
        Product not found.
      </div>
    );
  }

  return (
    <div className='mx-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Breadcrumbs */}
        <div className='text-gray-600 text-sm mt-8 mb-5'>Home / Products / {product.category}</div>

        {/* Product Details */}
        <ProductDetails product={product as any} />

        {/* Description & Reviews */}
        <ProductDescription product={product as any} />
      </div>
    </div>
  );
}

// ✅ Generate all product paths at build time
export async function generateStaticParams() {
  return productDummyData.map((product) => ({
    productId: product.id,
  }));
}
