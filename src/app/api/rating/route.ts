import { NextRequest, NextResponse } from 'next/server';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import Prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const { orderId, productId, rating, review } = await request.json();
    if (!orderId || !productId || !rating || !review)
      sendErrorResponse(400, 'Missing rating details.');

    const order = await Prisma.order.findUnique({
      where: { id: orderId, userId: userId as string },
    });

    if (!order) sendErrorResponse(404, 'Order not found.');

    const isAlreadyRated = await Prisma.rating.findFirst({
      where: { orderId, productId, userId: userId as string },
    });

    if (isAlreadyRated) sendErrorResponse(400, 'Already rated.');

    const response = await Prisma.rating.create({
      data: {
        orderId,
        productId,
        userId: userId as string,
        rating,
        review,
      },
    });

    return sendSuccessResponse(200, 'Rated successfully.', response);
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

// find all ratings for a user of a product
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const ratings = await Prisma.rating.findMany({
      where: { userId: userId as string },
    });

    return sendSuccessResponse(200, 'Ratings found.', ratings);
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
