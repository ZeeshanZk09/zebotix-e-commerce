import Prisma from '@/lib/prisma';
import { inngest } from './client';
import type { Prisma as PrismaNamespace } from '@prisma/client'; // for error typing if needed

// helper to safely get nested values and log missing fields
function extractUserData(data: any) {
  const id = data?.id ?? null;
  const first = data?.first_name ?? '';
  const last = data?.last_name ?? '';
  const name = [first, last].filter(Boolean).join(' ').trim() || null;
  const email = data?.email_addresses?.[0]?.email_address ?? null;
  const image = data?.image_url ?? null;
  return { id, first, last, name, email, image, raw: data };
}

export const syncUserCreation = inngest.createFunction(
  { id: 'sync-user-creation' },
  { event: 'clerk/clerk.created' },
  async ({ event }) => {
    console.log('[syncUserCreation] received event', {
      id: event?.id,
      type: event?.name || 'unknown',
    });
    const { data } = event;
    const user = extractUserData(data);

    console.log('[syncUserCreation] extracted user data', user);

    if (!user.id) {
      console.error('[syncUserCreation] missing user.id — aborting. Full event:', event);
      return;
    }

    try {
      // Using upsert so we either create or update if the user already exists
      const result = await Prisma.user.upsert({
        where: { id: user.id },
        update: {
          name: user.name!,
          email: user.email,
          image: user.image,
        },
        create: {
          id: user.id,
          name: user.name!,
          email: user.email,
          image: user.image,
        },
      });

      console.log('[syncUserCreation] upsert result', result);
    } catch (err: any) {
      // Prisma specific handling
      if (err?.code) {
        // Known Prisma error codes (e.g., P2002 = unique constraint)
        console.error(
          '[syncUserCreation] Prisma error code:',
          err.code,
          'message:',
          err.message,
          'meta:',
          err.meta
        );
      } else {
        console.error('[syncUserCreation] unexpected error', err);
      }
      // Re-throw only if you want Inngest to mark the function failed — otherwise log and swallow
      // throw err;
    }
  }
);

export const syncUserUpdation = inngest.createFunction(
  { id: 'sync-user-updation' },
  { event: 'clerk/clerk.updated' },
  async ({ event }) => {
    console.log('[syncUserUpdation] received event', {
      id: event?.id,
      type: event?.name || 'unknown',
    });
    const { data } = event;
    const user = extractUserData(data);

    console.log('[syncUserUpdation] extracted user data', user);

    if (!user.id) {
      console.error('[syncUserUpdation] missing user.id — aborting. Full event:', event);
      return;
    }

    try {
      // Prefer upsert to avoid "record not found" errors if you think creation can come in different order
      const result = await Prisma.user.upsert({
        where: { id: user.id },
        update: {
          name: user.name!,
          email: user.email,
          image: user.image,
        },
        create: {
          id: user.id,
          name: user.name!,
          email: user.email,
          image: user.image,
        },
      });

      console.log('[syncUserUpdation] upsert result', result);
    } catch (err: any) {
      if (err?.code) {
        console.error(
          '[syncUserUpdation] Prisma error code:',
          err.code,
          'message:',
          err.message,
          'meta:',
          err.meta
        );
      } else {
        console.error('[syncUserUpdation] unexpected error', err);
      }
      // throw err;
    }
  }
);

export const syncUserDeletion = inngest.createFunction(
  { id: 'sync-user-deletion' },
  { event: 'clerk/clerk.deleted' },
  async ({ event }) => {
    console.log('[syncUserDeletion] received event', {
      id: event?.id,
      type: event?.name || 'unknown',
    });
    const { data } = event;
    const user = extractUserData(data);

    console.log('[syncUserDeletion] extracted user data', user);

    if (!user.id) {
      console.error('[syncUserDeletion] missing user.id — aborting. Full event:', event);
      return;
    }

    try {
      const deleted = await Prisma.user.delete({
        where: { id: user.id },
      });
      console.log('[syncUserDeletion] delete result', deleted);
    } catch (err: any) {
      // P2025 = record to delete does not exist
      if (err?.code === 'P2025') {
        console.warn(
          '[syncUserDeletion] record not found to delete (P2025). User may already be deleted.',
          { userId: user.id }
        );
      } else if (err?.code) {
        console.error(
          '[syncUserDeletion] Prisma error code:',
          err.code,
          'message:',
          err.message,
          'meta:',
          err.meta
        );
      } else {
        console.error('[syncUserDeletion] unexpected error', err);
      }
      // don't rethrow unless you want to mark the function failed
      // throw err;
    }
  }
);
