import { NextRequest, NextResponse } from 'next/server';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import authSeller from '@/lib/middlewares/authSeller';
import { openai } from '../../../../../configs/openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

async function main(base64Image: string, mimeType: string) {
  const messages = [
    {
      role: 'system',
      content: `
            You are a product listing assistant for an e-commerce store. Your job is to analyze an image of a product and generate structured data.

            Response ONLY with raw JSON (no code block, no markdown, noexplanation).
            The JSON must strictly follow this schema:
            {
                "name": string, // short product name 
                "description": string, // Marketing-friendly description of the product
            }
          `,
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze this image and return name + description.',
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
      ],
    },
  ];
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL!,
      messages: messages as ChatCompletionMessageParam[],
    });

    let raw = response.choices[0].message.content || '';
    console.log('RAW RESPONSE:', raw);

    // --- FIX: Remove ANY code block wrapper ---
    const cleaned = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    console.log('CLEANED:', cleaned);

    // --- FIX: Safe parse ---
    const parsed = JSON.parse(cleaned);

    return parsed;
  } catch (error) {
    console.error('Error calling Gemini API:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return sendErrorResponse(401, 'Unauthorized');
    const isSeller = await authSeller(userId);
    if (!isSeller) return sendErrorResponse(401, 'Unauthorized');

    const { base64Image, mimeType } = await request.json();

    if (!base64Image || !mimeType) return sendErrorResponse(400, 'Missing base64Image or mimeType');

    const result = await main(base64Image, mimeType);
    console.log(result);
    return sendSuccessResponse(200, 'Success', result);
  } catch (err: any) {
    console.error('[API] error', err);
    const isNetworkErr =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err?.name === 'NeonDbError' ||
      err?.code === 'ENOTFOUND';
    if (isNetworkErr)
      return sendErrorResponse(503, isNetworkErr ? 'Service Unavailable' : err.message);
    return sendErrorResponse(500, err instanceof Error ? err.message : 'Something went wrong');
  }
}
