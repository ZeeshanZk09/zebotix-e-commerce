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
  } catch (error) {
    console.error(error);
    return sendErrorResponse(500, error instanceof Error ? error.message : 'Something went wrong');
  }
}
