'use server';
// lib/products.server.ts (server-only helper)
import prisma from '@/lib/prisma'; // whatever your prisma client is

export async function getProductById(productId: string) {
  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    return product;
  } catch (err: any) {
    console.error('Error fetching product:', err);
    return null;
  }
}

// get all products
export async function getProducts() {
  try {
    const products = await prisma.product.findMany({
      where: {
        inStock: true,
        store: {
          isActive: true,
        },
      },
      include: {
        rating: {
          select: {
            createdAt: true,
            rating: true,
            review: true,
            user: {
              select: {
                name: true,
                image: true,
              },
            },
          },
        },
        store: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return products;
  } catch (err: any) {
    console.error('Error fetching products:', err);
    return null;
  }
}
