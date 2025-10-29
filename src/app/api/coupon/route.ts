import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

// verify coupon
export async function POST(request: NextRequest) {
  try {
    const { userId: user } = getAuth(request);
    if (!user) sendErrorResponse(401, 'Unauthorized');
    const { userId, has } = getAuth(request);
    const { code } = await request.json();

    const coupon = await Prisma.coupon.findUnique({
      where: {
        code: code.toUpperCase(),
        expiresAt: { gt: new Date() },
      },
    });
    if (!coupon) return sendErrorResponse(404, 'Coupon not found');

    if (coupon?.forNewUser) {
      const userOrders = await Prisma.order.findMany({
        where: { userId: userId as string },
      });
      if (userOrders.length > 5) return sendErrorResponse(403, 'Coupon valid for new users.');
    }
    if (coupon?.forMember) {
      const hasPlusPlan = has ? has({ plan: 'plus' }) : false;
      if (!hasPlusPlan) return sendErrorResponse(402, 'Coupon valid for members only');
    }

    return sendSuccessResponse(200, 'Coupon found', coupon);
  } catch (error) {
    console.error('[API] error', error);
    return sendErrorResponse(500, error instanceof Error ? error.message : 'Something went wrong');
  }
}
