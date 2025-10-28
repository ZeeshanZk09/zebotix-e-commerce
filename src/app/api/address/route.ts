import { NextRequest, NextResponse } from 'next/server';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import Prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      // return early — important to stop further execution
      return sendErrorResponse(401, 'Unauthorized');
    }

    const body = await request.json().catch(() => null);
    const address = body?.address ?? body; // tolerate either { address: {...} } or raw address object

    if (!address || typeof address !== 'object') {
      return sendErrorResponse(400, 'Missing or invalid address in request body');
    }
    // Create address and attach userId in the same call
    const data = await Prisma.address.create({
      data: {
        ...address,
        userId: userId as string,
      },
    });

    return sendSuccessResponse(200, 'Address created successfully', data);
  } catch (err: any) {
    console.error('[API] error', err);

    const isNetworkErr =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err?.name === 'NeonDbError' ||
      err?.code === 'ENOTFOUND';

    if (isNetworkErr) {
      return sendErrorResponse(503, 'Service Unavailable');
    }

    // Prisma errors can include useful details; avoid passing raw error to clients in prod
    return sendErrorResponse(500, err instanceof Error ? err.message : 'Something went wrong');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const addresses = await Prisma.address.findMany({
      where: {
        userId: userId as string,
      },
    });

    return sendSuccessResponse(200, 'Addresses fetched successfully', addresses);
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
