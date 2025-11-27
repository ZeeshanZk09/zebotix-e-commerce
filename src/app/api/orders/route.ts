import { Order } from '@/generated/prisma/client';
import Prisma from '@/lib/prisma';
import { sendErrorResponse, sendSuccessResponse } from '@/utils/sendResponse';
import { getAuth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const ENABLE_LOG = process.env.NODE_ENV === 'development';
const log = {
  info: (...args: any[]) => ENABLE_LOG && console.log('\x1b[36m[INFO]\x1b[0m', ...args),
  warn: (...args: any[]) => ENABLE_LOG && console.warn('\x1b[33m[WARN]\x1b[0m', ...args),
  error: (...args: any[]) => ENABLE_LOG && console.error('\x1b[31m[ERROR]\x1b[0m', ...args),
  step: (msg: string) => ENABLE_LOG && console.log(`\x1b[35m[STEP]\x1b[0m ${msg}`),
};

// toggle logs in development

export async function POST(request: NextRequest) {
  log.info('--- /api/orders POST START ---');
  try {
    const { userId, has } = getAuth(request);
    if (!userId) return sendErrorResponse(401, 'Unauthorized');

    const body = await request.json().catch(() => null);
    const itemsRaw = Array.isArray(body?.items) ? body.items : [];
    const addressId = body?.addressId;
    const paymentMethod = body?.paymentMethod;
    const couponCode = body?.couponCode;

    if (!itemsRaw.length || !addressId || !paymentMethod) {
      return sendErrorResponse(400, 'Missing order details.');
    }

    // Normalize items: accept { id }, { productId }, or { product: { id } }
    const normalized = itemsRaw
      .map((it: any) => {
        const id = it?.id ?? it?.productId ?? it?.product?.id;
        const quantity = Number(it?.quantity ?? 0);
        return { id, quantity };
      })
      .filter((it: any) => it.id && it.quantity > 0);

    if (normalized.length === 0) {
      log.warn('No valid items after normalization', { rawCount: itemsRaw.length, itemsRaw });
      return sendErrorResponse(400, 'No valid items in order.');
    }

    // Batch fetch products
    const ids = Array.from(new Set(normalized.map((i: any) => i.id)));
    const products = await Prisma.product.findMany({
      where: { id: { in: ids as string[] } },
      select: { id: true, price: true, storeId: true },
    });
    const productsById = new Map(products.map((p: any) => [p.id, p]));

    // Group by storeId
    const ordersByStore = new Map<string, { id: string; price: number; quantity: number }[]>();
    for (const it of normalized) {
      const prod = productsById.get(it.id);
      if (!prod) return sendErrorResponse(404, `Product not found: ${it.id}`);
      const store = prod.storeId as string;
      if (!ordersByStore.has(store)) ordersByStore.set(store, []);
      ordersByStore.get(store)!.push({ id: prod.id, price: prod.price, quantity: it.quantity });
    }

    // Coupon logic (minimal — keep your existing rules if needed)
    let coupon = null;
    if (couponCode) {
      coupon = await Prisma.coupon.findUnique({ where: { code: couponCode } });
      if (!coupon) return sendErrorResponse(404, 'Coupon not found');
      // Example checks you had can be re-added here (forMember, forNewUser)
    }

    // Create orders per store
    const orders: Order[] = [];
    const orderIds: any[] = [];

    let fullAmount = 0;
    let shippingAdded = false;
    const hasPlusPlan = typeof has === 'function' ? has({ plan: 'plus' }) : false;

    for (const [storeId, sellerItems] of ordersByStore.entries()) {
      let subtotal = sellerItems.reduce((s, it) => s + it.price * it.quantity, 0);
      if (coupon) subtotal -= (subtotal * (coupon.discount ?? 0)) / 100;
      if (!hasPlusPlan && !shippingAdded) {
        subtotal += 5;
        shippingAdded = true;
      }
      const total = parseFloat(subtotal.toFixed(2));
      fullAmount += total;

      const order = await Prisma.order.create({
        data: {
          userId: userId as string,
          storeId,
          total,
          addressId: addressId as string,
          paymentMethod,
          isCouponUsed: !!coupon,
          coupon: coupon ? coupon : {},
          orderItems: {
            create: sellerItems.map((it) => ({
              productId: it.id,
              quantity: it.quantity,
              price: it.price,
            })),
          },
        },
      });

      orders.push(order);
      orderIds.push(order.id);

      log.info('Order created', { orderId: order.id, storeId, total });
    }

    if (paymentMethod === 'STRIPE') {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const origin = request.headers.get('origin');

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Order',
              },
              unit_amount: Math.round(fullAmount * 100),
            },
            quantity: 1,
          },
        ],
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
        mode: 'payment',
        success_url: `${origin}/loading?nextUrl=orders`,
        cancel_url: `${origin}/cart`,
        metadata: {
          orders: JSON.stringify(orders),
          orderIds: orderIds.join(','),
          userId,
          appId: 'e-commerce',
        },
      });
      return sendSuccessResponse(200, 'Order created', {
        url: session.url,
        session,
        paymentMethod,
      });
    }
    // Clear cart once
    await Prisma.user.update({
      where: { id: userId as string },
      data: { cart: {} },
    });

    log.info('Orders processed', { orderCount: orders.length, fullAmount });
    return sendSuccessResponse(200, 'Orders created', orders);
  } catch (err: any) {
    log.error('Handler error', err);
    const isNetworkErr =
      err?.message?.includes('fetch failed') ||
      err?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      err?.name === 'NeonDbError' ||
      err?.code === 'ENOTFOUND';
    if (isNetworkErr) return sendErrorResponse(503, 'Service Unavailable');
    return sendErrorResponse(500, err instanceof Error ? err.message : 'Something went wrong');
  } finally {
    log.info('--- /api/orders POST END ---');
  }
}

// get all orders

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) sendErrorResponse(401, 'Unauthorized');

    const orders = await Prisma.order.findMany({
      where: {
        userId: userId as string,
        OR: [
          {
            paymentMethod: 'COD',
          },
          {
            AND: [
              {
                paymentMethod: 'STRIPE',
              },
              {
                isPaid: true,
              },
            ],
          },
        ],
      },
      include: {
        orderItems: {
          include: {
            product: true,
          },
        },
        address: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return sendSuccessResponse(200, 'Orders fetched', orders);
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
