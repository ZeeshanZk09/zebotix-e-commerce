import authSeller from '@/lib/middlewares/authSeller';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');
    const { productId } = await request.json();
    if (!productId) sendErrorResponse(400, 'Product id is required');

    const storeId = await authSeller(userId!);
    if (!storeId) sendErrorResponse(401, 'Store may not approved or exists.');

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        storeId: storeId as string,
      },
    });
    if (!product) sendErrorResponse(404, 'Product not found');
    await prisma.product.update({
      where: {
        id: productId,
      },
      data: {
        inStock: !product?.inStock,
      },
    });

    return sendSuccessResponse(200, 'Product stock updated successfully');
  } catch (err: any) {
    console.error('[API] error', err);

    // detect Neon/Prisma network/connect-timeout errors (relaxed check)
    const isNetworkErr =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err?.name === 'NeonDbError' ||
      err?.code === 'ENOTFOUND';

    if (isNetworkErr) {
      return sendErrorResponse(503, isNetworkErr ? 'Service Unavailable' : err.message);
    }
    return sendErrorResponse(500, err instanceof Error ? err.message : 'Something went wrong');
  }
}
