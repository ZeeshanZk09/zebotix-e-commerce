import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { ImageKitUploadNetworkError } from '@imagekit/next';
import { NextRequest } from 'next/server';
import imageKit from '../../../../../configs/imageKit';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);

    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const formData = await request.formData();
    // name, username, description, email, contact, address, image

    const name = formData.get('name');
    const username = formData.get('username');
    const description = formData.get('description');
    const email = formData.get('email');
    const contact = formData.get('contact');
    const address = formData.get('address');
    const image = formData.get('image');
    if (!name || !username || !description || !email || !contact || !address || !image)
      sendErrorResponse(400, 'All fields are required');

    const existingStore = await Prisma.store.findUnique({
      where: {
        userId: userId as string,
      },
    });

    if (existingStore) sendErrorResponse(400, 'Store already exists');

    const isUsernameTaken = await Prisma.store.findUnique({
      where: {
        username: (username as string).toLowerCase(),
      },
    });
    if (isUsernameTaken) sendErrorResponse(400, 'Username already taken');

    const buffer = Buffer.from(await (image as File).arrayBuffer());

    const response = await imageKit.upload({
      file: buffer,
      fileName: (image as File).name,
      folder: 'e-com/store/logos',
    });

    const optimizedImage = imageKit.url({
      path: response.filePath,
      transformation: [{ quality: 'auto' }, { width: 300 }, { format: 'webp' }],
    });

    const newStore = await Prisma.store.create({
      data: {
        name: name as string,
        username: (username as string).toLowerCase(),
        description: description as string,
        email: email as string,
        contact: contact as string,
        address: address as string,
        logo: optimizedImage,
        userId: userId as string,
      },
    });
    await Prisma.user.update({
      where: {
        id: userId as string,
      },
      data: {
        store: {
          connect: {
            id: newStore.id,
          },
        },
      },
    });
    return sendSuccessResponse(201, 'Applied waiting for approval', {});
  } catch (err: any) {
    if (err instanceof ImageKitUploadNetworkError) sendErrorResponse(400, 'Image upload failed');
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
    const store = await Prisma.store.findFirst({
      where: {
        userId: userId as string,
      },
    });
    if (store) {
      return sendSuccessResponse(
        200,
        store.status === 'approved'
          ? 'Store registered'
          : store.status === 'rejected'
          ? 'Store rejected'
          : 'Your store request is pending, please wait for admin to approve your store',
        {
          status: store.status,
        }
      );
    }

    return sendSuccessResponse(200, 'Store not registered', null);
  } catch (err: any) {
    if (err instanceof ImageKitUploadNetworkError) sendErrorResponse(400, 'Image upload failed');

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
