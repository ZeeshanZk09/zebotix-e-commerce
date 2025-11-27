import authAdmin from '@/lib/middlewares/authAdmin.';
import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
// toggle store isActive
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const isAdmin = await authAdmin(userId!);
    if (!isAdmin) sendErrorResponse(401, 'Unauthorized');

    const { storeId } = await request.json();

    if (!storeId) sendErrorResponse(400, 'Missing storeId.');

    const store = await Prisma.store.findUnique({ where: { id: storeId } });

    if (!store) sendErrorResponse(404, 'Store not found.');

    await Prisma.store.update({ where: { id: storeId }, data: { isActive: !store?.isActive } });

    return sendSuccessResponse(200, 'Stores Update Successfully.');
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
