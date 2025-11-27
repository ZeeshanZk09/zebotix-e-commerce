import { NextRequest, NextResponse } from 'next/server';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import Stripe from 'stripe';
import Prisma from '@/lib/prisma';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});

export async function GET(request: NextRequest) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature') as string;

    if (!sig) return sendErrorResponse(400, 'Missing Stripe signature');

    const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);

    const handlePaymentIntent = async (paymentIntentId: string, isPaid: boolean) => {
      const session = await stripe.checkout.sessions.list({
        payment_intent: paymentIntentId,
      });
      const { orderIds, userId, appId }: any = session.data[0].metadata;
      if (appId !== 'e-commerce') {
        return sendErrorResponse(400, 'Invalid app id');
      }

      const orderIdsArray = orderIds.split(',');

      if (isPaid) {
        await Promise.all(
          orderIdsArray.map(async (orderId: string) => {
            await Prisma.order.update({
              where: { id: orderId },
              data: { isPaid: true },
            });
          })
        );

        await Prisma.user.update({
          where: { id: userId },
          data: { cart: {} },
        });
      } else {
        await Promise.all(
          orderIdsArray.map(async (orderId: string) => {
            await Prisma.order.delete({ where: { id: orderId } });
          })
        );
      }
    };
    switch (event.type) {
      case 'payment_intent.succeeded': {
        await handlePaymentIntent(event.data.object.id, true);
        break;
      }
      case 'payment_intent.canceled': {
        await handlePaymentIntent(event.data.object.id, false);
        break;
      }
      default:
        console.log('Unhandled event type: ', event.type);
        break;
    }

    return sendSuccessResponse(200, 'Success', {
      received: true,
    });
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

export const config = {
  api: {
    bodyParser: false,
  },
};
