import ProductDescription from '@/components/ProductDescription';
import ProductDetails from '@/components/ProductDetails';
import { getProductById, getProducts } from '@/lib/server-actions/product';

// ✅ Static page revalidation time (in seconds)
export const revalidate = 60;
let product: any = {};

// ✅ Generate metadata dynamically for each product (SEO + OG)
export async function generateMetadata({ params }: { params: Promise<{ productId: string }> }) {
  const productId = (await params).productId;

  console.log('product id:', productId);

  try {
    product = await getProductById(productId);
    console.log("dynamic product page's product: ", product);
  } catch (err) {
    console.error(err);
  }

  if (!product) return { title: 'Product Not Found' };

  return {
    title: `${product.name} | Zebotix`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [(product?.images as any)?.[0] || '/default-image.png'],
    },
  };
}

// ✅ Page component
export default async function ProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const data = (await params).productId;

  return (
    <div className='mx-6'>
      <div className='max-w-7xl mx-auto'>
        {/* Breadcrumbs */}
        <div className='text-gray-600 text-sm mt-8 mb-5'>Home / Products / {product.category}</div>

        {/* Product Details */}
        <ProductDetails productId={data} />

        {/* Description & Reviews */}
        <ProductDescription productId={data} />
      </div>
    </div>
  );
}

// ✅ Generate all product paths at build time
export async function generateStaticParams(): Promise<({ productId: string } | undefined)[]> {
  let products:
    | ({
        store: {
          description: string;
          name: string;
          id: string;
          createdAt: Date;
          updatedAt: Date;
          userId: string;
          username: string;
          address: string;
          status: string;
          isActive: boolean;
          logo: string;
          email: string;
          contact: string;
        };
        rating: {
          createdAt: Date;
          rating: number;
          user: {
            name: string;
            image: string | null;
          };
          review: string;
        }[];
      } & {
        description: string;
        name: string;
        images: string[];
        category: string;
        id: string;
        mrp: number;
        price: number;
        inStock: boolean;
        storeId: string;
        createdAt: Date;
        updatedAt: Date;
      })[]
    | null = [];
  try {
    products = (await getProducts()) ?? [];
    if (!products) return [];
    return products.map((product) => {
      return {
        productId: product.id,
      };
    });
  } catch (error) {
    console.error(error);
    return [];
  }
}
