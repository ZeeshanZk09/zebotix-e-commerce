import { inngest } from '@/inngest/client';
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
    const { coupon } = await request.json();
    console.log(' \n [server] - coupon:', coupon, typeof coupon);
    coupon.code = coupon.code.toUpperCase();

    await Prisma.coupon.create({ data: coupon }).then(async (coupon) => {
      await inngest.send({
        name: 'app/coupon.expired',
        data: {
          code: coupon.code,
          expires_at: new Date(coupon.expiresAt),
        },
      });
    });

    return sendSuccessResponse(200, 'Coupon created successfully');
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

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const isAdmin = await authAdmin(userId!);
    if (!isAdmin) sendErrorResponse(401, 'Unauthorized');

    const { searchParams } = request.nextUrl;
    const code = searchParams.get('code');

    await Prisma.coupon.delete({ where: { code: code! } });

    return sendSuccessResponse(200, 'Coupon deleted successfully');
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

    const coupons = await Prisma.coupon.findMany({});

    return sendSuccessResponse(200, 'Coupons fetched successfully', coupons);
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
