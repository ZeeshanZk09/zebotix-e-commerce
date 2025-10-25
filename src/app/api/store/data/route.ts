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
  } catch (error) {
    console.error(error);
    return sendErrorResponse(500, error instanceof Error ? error.message : 'Something went wrong');
  }
}
