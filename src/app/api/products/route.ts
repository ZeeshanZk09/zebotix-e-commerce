import { NextRequest, NextResponse } from 'next/server';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import Prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const products = await Prisma.product.findMany({
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
    return sendSuccessResponse(200, 'Products fetched', products);
  } catch (err: any) {
    console.error('[API] error', err);
    const isNetworkErr =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err?.name === 'NeonDbError' ||
      err?.code === 'ENOTFOUND';
    if (isNetworkErr)
      return sendErrorResponse(503, isNetworkErr ? 'Service Unavailable' : err.message);
    return sendErrorResponse(500, err instanceof Error ? err.message : 'Something went wrong');
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log(request.json());
    const { productId } = await request.json();

    const product = await Prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    return sendSuccessResponse(200, 'Products fetched', product);
  } catch (err: any) {
    console.error('[API] error', err);
    const isNetworkErr =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err?.name === 'NeonDbError' ||
      err?.code === 'ENOTFOUND';
    if (isNetworkErr)
      return sendErrorResponse(503, isNetworkErr ? 'Service Unavailable' : err.message);
    return sendErrorResponse(500, err instanceof Error ? err.message : 'Something went wrong');
  }
}
