import authSeller from '@/lib/middlewares/authSeller';
import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

function now() {
  return Date.now();
}

export async function POST(request: NextRequest) {
  const start = now();
  console.log('[API POST /store/orders] start', { url: request.url });

  try {
    const { userId } = getAuth(request);
    console.log('[API POST /store/orders] auth result', { userId });

    if (!userId) {
      console.log('[API POST /store/orders] unauthorized: no userId');
      return sendErrorResponse(401, 'Unauthorized');
    }

    console.log('[API POST /store/orders] checking seller authorization for userId', userId);
    const storeId = await authSeller(userId);
    console.log('[API POST /store/orders] authSeller result', { storeId });

    if (!storeId) {
      console.log('[API POST /store/orders] unauthorized: not a seller');
      return sendErrorResponse(401, 'Unauthorized');
    }

    let body: any = null;
    try {
      body = await request.json();
      console.log('[API POST /store/orders] parsed request body', body);
    } catch (parseErr) {
      console.log('[API POST /store/orders] failed to parse body', parseErr);
    }

    const { orderId, status } = body ?? {};
    console.log('[API POST /store/orders] body fields', { orderId, status });

    if (!orderId || typeof status === 'undefined') {
      console.log('[API POST /store/orders] validation failed: missing orderId/status');
      return sendErrorResponse(400, 'orderId and status are required');
    }

    console.log('[API POST /store/orders] about to update order', { orderId, status });
    const dbStart = now();
    const updated = await Prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
    const dbDuration = now() - dbStart;
    console.log('[API POST /store/orders] Prisma.order.update result', {
      updatedId: updated.id,
      dbDuration,
    });

    const duration = now() - start;
    console.log('[API POST /store/orders] success, totalDurationMs', duration);
    return sendSuccessResponse(200, 'Order updated successfully.');
  } catch (err: any) {
    console.error('[API POST /store/orders] error', err?.stack ?? err);

    const isNetworkErr =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err?.name === 'NeonDbError' ||
      err?.code === 'ENOTFOUND';

    if (isNetworkErr) {
      console.log('[API POST /store/orders] detected network error', {
        message: err?.message,
        code: err?.code,
        name: err?.name,
      });
      return sendErrorResponse(503, 'Service Unavailable');
    }

    return sendErrorResponse(500, err instanceof Error ? err.message : 'Something went wrong');
  }
}

// get all orders for a seller
export async function GET(request: NextRequest) {
  const start = now();
  console.log('[API GET /store/orders] start', { url: request.url });

  try {
    const { userId } = getAuth(request);
    console.log('[API GET /store/orders] auth result', { userId });

    if (!userId) {
      console.log('[API GET /store/orders] unauthorized: no userId');
      return sendErrorResponse(401, 'Unauthorized');
    }

    console.log('[API GET /store/orders] checking seller authorization for userId', userId);
    const storeId = await authSeller(userId);
    console.log('[API GET /store/orders] authSeller result', { storeId });

    if (!storeId) {
      console.log('[API GET /store/orders] unauthorized: not a seller');
      return sendErrorResponse(401, 'Unauthorized');
    }

    console.log('[API GET /store/orders] fetching orders for storeId', storeId);
    const dbStart = now();
    const orders = await Prisma.order.findMany({
      where: { storeId: storeId as string },
      include: {
        user: true,
        orderItems: { include: { product: true } },
        address: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const dbDuration = now() - dbStart;
    console.log('[API GET /store/orders] Prisma.order.findMany completed', {
      count: orders.length,
      dbDurationMs: dbDuration,
    });

    const duration = now() - start;
    console.log('[API GET /store/orders] success, totalDurationMs', duration);
    return sendSuccessResponse(200, 'Orders fetched successfully.', orders);
  } catch (err: any) {
    console.error('[API GET /store/orders] error', err?.stack ?? err);

    const isNetworkErr =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err?.name === 'NeonDbError' ||
      err?.code === 'ENOTFOUND';

    if (isNetworkErr) {
      console.log('[API GET /store/orders] detected network error', {
        message: err?.message,
        code: err?.code,
        name: err?.name,
      });
      return sendErrorResponse(503, 'Service Unavailable');
    }

    return sendErrorResponse(500, err instanceof Error ? err.message : 'Something went wrong');
  }
}
