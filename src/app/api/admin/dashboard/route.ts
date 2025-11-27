import authAdmin from '@/lib/middlewares/authAdmin.';
import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

// get dashboard data for admin total orders, total stores, total products, total revenue
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const isAdmin = await authAdmin(userId!);
    if (!isAdmin) sendErrorResponse(401, 'Unauthorized');

    const orders = await Prisma.order.count();
    const stores = await Prisma.store.count();
    const allOrders = await Prisma.order.findMany({
      select: {
        createdAt: true,
        total: true,
      },
    });
    let totalRevenue = 0;
    allOrders.map((order) => (totalRevenue += order.total));
    const revenue = totalRevenue.toFixed(2);
    const products = await Prisma.product.count();

    const dashboardData = { orders, stores, products, revenue, allOrders };

    return sendSuccessResponse(200, 'Dashboard data fetched', dashboardData);
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
