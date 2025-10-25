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
  } catch (error) {
    console.error(error);
    return sendErrorResponse(500, error instanceof Error ? error.message : 'Something went wrong');
  }
}
