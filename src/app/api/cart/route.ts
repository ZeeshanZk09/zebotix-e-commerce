import { NextRequest, NextResponse } from 'next/server';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import Prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');
    const { cart } = await request.json();

    await Prisma.user.update({
      where: {
        id: userId as string,
      },
      data: {
        cart,
      },
    });

    return sendSuccessResponse(200, 'Cart updated', null);
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

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const user = await Prisma.user.findUnique({
      where: {
        id: userId as string,
      },
      select: {
        cart: true,
      },
    });

    return sendSuccessResponse(200, 'Cart fetched', user?.cart);
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
