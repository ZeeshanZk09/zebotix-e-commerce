import authSeller from '@/lib/middlewares/authSeller';
import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');
    const isSeller = await authSeller(userId!);
    if (!isSeller) sendErrorResponse(401, 'Unauthorized');

    const storeInfo = await Prisma.store.findFirst({
      where: {
        userId: userId as string,
      },
    });

    return sendSuccessResponse(200, 'Seller dashoard logged In', {
      isSeller,
      storeInfo,
    });
  } catch (error) {
    console.error(error);
    return sendErrorResponse(500, error instanceof Error ? error.message : 'Something went wrong');
  }
}
