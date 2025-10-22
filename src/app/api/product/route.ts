import { ProductWhereInput } from '@/generated/prisma/models';
import Prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  const products = await Prisma.product.findMany({
    orderBy: {
      rating: {
        _count: 'asc',
      },
    },
  });

  const productCount = await Prisma.product.count();

  return (
    JSON.stringify(products),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      metadata: {
        productCount,
      },
    }
  );
}
