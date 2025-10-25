import authSeller from '@/lib/middlewares/authSeller';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import imageKit from '../../../../../configs/imageKit';
import prisma from '@/lib/prisma';
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const storeId = await authSeller(userId!);
    if (!storeId) sendErrorResponse(401, 'Store may not approved or exists.');

    const formData = await request.formData();
    const name = formData.get('name');
    const mrp = formData.get('mrp');
    const category = formData.get('category');
    const price = formData.get('price');
    const images = formData.getAll('images');
    const description = formData.get('description');

    if (!name || !mrp || !category || !price || !images || !description) {
      sendErrorResponse(400, 'Missing product details.');
    }
    const imageKitUrl = await Promise.all(
      images.map(async (image) => {
        const buffer = Buffer.from(await (image as File).arrayBuffer());
        const response = await imageKit.upload({
          file: buffer,
          fileName: (image as File).name,
          folder: 'e-com/store/products',
        });
        const url = imageKit.url({
          path: response.filePath,
          transformation: [{ quality: 'auto' }, { width: 300 }, { format: 'webp' }],
        });
        return url;
      })
    );
    await prisma.product.create({
      data: {
        name: name as string,
        mrp: Number(mrp),
        category: category as string,
        price: Number(price),
        images: imageKitUrl,
        description: description as string,
        storeId: storeId as string,
      },
    });

    return sendErrorResponse(200, 'Product created successfully.');
  } catch (error) {
    console.error(error);
    return sendErrorResponse(500, error instanceof Error ? error.message : 'Something went wrong');
  }
}

// get all products for a specific store
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const storeId = await authSeller(userId!);
    if (!storeId) sendErrorResponse(401, 'Store may not approved or exists.');
    const products = await prisma.product.findMany({
      where: {
        storeId: storeId as string,
      },
    });
    return sendSuccessResponse(200, 'Products found', products);
  } catch (error) {
    console.error(error);
    return sendErrorResponse(500, error instanceof Error ? error.message : 'Something went wrong');
  }
}
