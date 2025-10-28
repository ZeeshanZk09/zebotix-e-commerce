// src/actions/storeActions.ts
'use server';

import Prisma from '../prisma';
import { sendSuccessResponse, sendErrorResponse } from '@/utils/sendResponse';

type ApiResponse<T = any> = {
  status: number;
  success: boolean;
  message: string;
  data?: T;
};

/**
 * Core logic to fetch store by username.
 * Returns your sendSuccessResponse/sendErrorResponse output.
 */
async function fetchStoreByUsername(username: string) {
  const uname = (username ?? '').toString().trim().toLowerCase();
  if (!uname) return sendErrorResponse(400, 'Missing Username');

  try {
    const store = await Prisma.store.findUnique({
      where: { username: uname, isActive: true },
      include: {
        Product: {
          include: {
            rating: true,
          },
        },
      },
    });

    if (!store) return sendErrorResponse(404, 'Store not found');

    return sendSuccessResponse(200, 'Store found', store);
  } catch (err: any) {
    console.error('[storeActions] error', err);

    // relaxed network error detection (keep your checks)
    const isNetworkErr =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err?.name === 'NeonDbError' ||
      err?.code === 'ENOTFOUND';

    if (isNetworkErr) {
      return sendErrorResponse(503, 'Service Unavailable');
    }
    return sendErrorResponse(500, err instanceof Error ? err.message : 'Something went wrong');
  }
}

/**
 * Server Action: call with a plain username string.
 * - Good for direct server-to-server calls, server components, or imported as a server action.
 */
export async function getStoreByUsername(username: string) {
  return await fetchStoreByUsername(username);
}

/**
 * Server Action: use as a form action. Accepts FormData from an HTML/React form.
 * Example: <form action={getStoreFormAction}> ...
 */
export async function getStoreFormAction(formData: FormData) {
  const username = formData.get('username')?.toString() ?? '';
  return await fetchStoreByUsername(username);
}
