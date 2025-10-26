import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.toLowerCase() as string;
    if (!username) sendErrorResponse(400, 'Missing Username');
    const store = await Prisma.store.findUnique({
      where: {
        username,
        isActive: true,
      },
      include: {
        Product: {
          include: {
            rating: true,
          },
        },
      },
    });
    if (!store) sendErrorResponse(404, 'Store not found');

    return sendSuccessResponse(200, 'Store found', store);
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
