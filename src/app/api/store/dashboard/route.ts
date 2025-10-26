import authSeller from '@/lib/middlewares/authSeller';
import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

// get dashboard data for seller (total orders, total earnings, total products)
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');
    const isSeller = await authSeller(userId!);
    if (!isSeller) sendErrorResponse(401, 'Unauthorized');

    const orders = await Prisma.order.findMany({
      where: {
        storeId: isSeller as string,
      },
    });

    const product = await Prisma.product.findMany({
      where: {
        storeId: isSeller as string,
      },
    });

    const ratings = await Prisma.rating.findMany({
      where: {
        productId: {
          in: product.map((item) => item.id),
        },
      },
      include: {
        user: true,
        product: true,
      },
    });

    const dashboard = {
      ratings,
      totalOrders: orders.length,
      totalEarnings: Math.round(orders.reduce((acc, order) => acc + +order.total, 0)),
      totalProducts: product.length,
      totalRatings: ratings.length,
    };

    return sendSuccessResponse(200, 'Dashboard fetched', dashboard);
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
