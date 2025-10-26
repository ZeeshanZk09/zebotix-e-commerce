import authAdmin from '@/lib/middlewares/authAdmin.';
import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const isAdmin = await authAdmin(userId!);
    if (!isAdmin) sendErrorResponse(401, 'Unauthorized');

    const { storeId, status } = await request.json();

    if (status === 'approved') {
      await Prisma.store.update({
        where: {
          id: storeId,
        },
        data: {
          status: 'approved',
          isActive: true,
        },
      });
    } else if (status === 'rejected') {
      await Prisma.store.update({
        where: {
          id: storeId,
        },
        data: {
          status: 'rejected',
        },
      });
    }

    return sendSuccessResponse(200, `Store ${status} successfully`);
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

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const isAdmin = await authAdmin(userId!);
    if (!isAdmin) sendErrorResponse(401, 'Unauthorized');
    const stores = await Prisma.store.findMany({
      where: {
        status: {
          in: ['pending', 'rejected'],
        },
      },
      include: {
        user: true,
      },
    });

    return sendSuccessResponse(200, 'Stores found', stores);
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
