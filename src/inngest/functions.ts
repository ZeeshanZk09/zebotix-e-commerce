import Prisma from '@/lib/prisma';
import { inngest } from './client';

type RawEvent = any;

function logInfo(tag: string, obj?: any, ...args: any[]) {
  console.log(`${new Date().toISOString()} [info] [${tag}]`, obj ?? '', ...args);
}
function logError(tag: string, obj?: any, ...args: any[]) {
  console.error(`${new Date().toISOString()} [error] [${tag}]`, obj ?? '', ...args);
}
function extractFromCommonPlaces(event: RawEvent) {
  // Try common shapes: event.data, event.data.user, event.data.user_id, event.data.userId, event.data.clerkUser, event.data.user_object, event.data.user?.id
  const data = event?.data ?? event;
  const shapes = [
    data,
    data?.user,
    data?.user_object,
    data?.clerkUser,
    data?.payload?.user,
    data?.payload,
  ];

  for (const s of shapes) {
    if (!s) continue;
    // common fields
    if (s.id || s.first_name || s.email_addresses || s.email || s.image_url) {
      return {
        id: s.id ?? s.user_id ?? s.userId ?? null,
        first: s.first_name ?? s.firstName ?? null,
        last: s.last_name ?? s.lastName ?? null,
        name:
          ((s.first_name || s.firstName || '') + ' ' + (s.last_name || s.lastName || '') ||
            s.name) ??
          null,
        email:
          s.email_addresses?.[0]?.email_address ??
          s.email ??
          s.email_address ??
          (Array.isArray(s.emails) ? s.emails[0] : null) ??
          null,
        image: s.image_url ?? s.avatar_url ?? s.image ?? null,
        raw: s,
      };
    }
  }

  // fallback: maybe top-level event has email (as your log)
  if (data?.email) {
    return {
      id: null,
      first: null,
      last: null,
      name: null,
      email: data.email,
      image: null,
      raw: data,
    };
  }

  return {
    id: null,
    first: null,
    last: null,
    name: null,
    email: null,
    image: null,
    raw: data,
  };
}

async function fetchClerkUserByEmail(email: string | null) {
  if (!email) return null;
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) {
    logError(
      'fetchClerkUserByEmail',
      'CLERK_SECRET_KEY is not set in environment; cannot fetch user from Clerk'
    );
    return null;
  }

  try {
    const url = `https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`;
    logInfo('fetchClerkUserByEmail', `calling Clerk admin API: ${url}`);
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const txt = await res.text();
      logError('fetchClerkUserByEmail', { status: res.status, text: txt });
      return null;
    }

    const body = await res.json(); // Clerk returns an array of users
    if (!Array.isArray(body) || body.length === 0) {
      logInfo('fetchClerkUserByEmail', `no user found for email ${email}`);
      return null;
    }

    // choose the first match
    const u = body[0];
    logInfo('fetchClerkUserByEmail', { found: !!u, id: u.id, raw: u });
    return {
      id: u.id,
      first: u.first_name ?? u.firstName ?? null,
      last: u.last_name ?? u.lastName ?? null,
      name:
        ((u.first_name ?? u.firstName ?? '') + ' ' + (u.last_name ?? u.lastName ?? '') ||
          u.full_name) ??
        u.name ??
        null,
      email: u.email_addresses?.[0]?.email_address ?? u.primary_email_address ?? u.email ?? null,
      image: u.image_url ?? u.profile_image_url ?? null,
      raw: u,
    };
  } catch (err) {
    logError('fetchClerkUserByEmail', err);
    return null;
  }
}

async function upsertUserToDb(user: any) {
  if (!user?.id) {
    logError('upsertUserToDb', 'no user.id to upsert; skip', user);
    return null;
  }

  try {
    const result = await Prisma.user.upsert({
      where: { id: user.id },
      update: {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        image: user.image ?? undefined,
      },
      create: {
        id: user.id,
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        image: user.image ?? undefined,
      },
    });
    logInfo('upsertUserToDb', { ok: true, id: result.id });
    return result;
  } catch (err: any) {
    logError('upsertUserToDb', {
      error: err?.message ?? err,
      code: err?.code ?? null,
      meta: err?.meta ?? null,
    });
    throw err;
  }
}

/* --- Inngest functions --- */

export const syncUserCreation = inngest.createFunction(
  { id: 'sync-user-creation' },
  { event: 'clerk/clerk.created' },
  async ({ event }) => {
    logInfo('syncUserCreation', {
      note: 'received event',
      id: event?.id,
      name: event?.name ?? undefined,
    });
    logInfo('syncUserCreation', {
      rawEventSummary: { dataKeys: Object.keys(event?.data ?? {}), ts: event?.ts },
    });

    const candidate = extractFromCommonPlaces(event);
    logInfo('syncUserCreation', { extractedCandidate: candidate });

    let user = candidate;

    // if no id but we have email, try Clerk Admin API to fetch full user
    if (!user.id && user.email) {
      logInfo(
        'syncUserCreation',
        `id missing but email present (${user.email}) — attempting Clerk API lookup`
      );
      const clerkUser = await fetchClerkUserByEmail(user.email);
      if (clerkUser) {
        user = { ...user, ...clerkUser }; // clerkUser contains id, name, etc.
        logInfo('syncUserCreation', { afterClerkLookup: user });
      } else {
        logInfo(
          'syncUserCreation',
          'Clerk lookup returned no user; continuing with what we have (will not upsert without id)'
        );
      }
    }

    if (!user.id) {
      logError(
        'syncUserCreation',
        'missing user.id — cannot create/upsert row. Full event:',
        event
      );
      return;
    }

    try {
      await upsertUserToDb(user);
    } catch (err) {
      // Important: decide if you want to rethrow to surface failure to Inngest
      logError('syncUserCreation', 'upsert failed', err);
      // Option: throw err; // uncomment if you want Inngest to mark the run as failed
    }
  }
);

export const syncUserUpdation = inngest.createFunction(
  { id: 'sync-user-updation' },
  { event: 'clerk/clerk.updated' },
  async ({ event }) => {
    logInfo('syncUserUpdation', {
      note: 'received event',
      id: event?.id,
      name: event?.name ?? undefined,
    });
    const candidate = extractFromCommonPlaces(event);
    logInfo('syncUserUpdation', { extractedCandidate: candidate });

    let user = candidate;

    if (!user.id && user.email) {
      logInfo(
        'syncUserUpdation',
        `id missing but email present (${user.email}) — attempting Clerk API lookup`
      );
      const clerkUser = await fetchClerkUserByEmail(user.email);
      if (clerkUser) {
        user = { ...user, ...clerkUser };
        logInfo('syncUserUpdation', { afterClerkLookup: user });
      }
    }

    if (!user.id) {
      logError('syncUserUpdation', 'missing user.id — aborting. Full event:', event);
      return;
    }

    try {
      await upsertUserToDb(user);
    } catch (err) {
      logError('syncUserUpdation', 'upsert failed', err);
      // throw err;
    }
  }
);

export const syncUserDeletion = inngest.createFunction(
  { id: 'sync-user-deletion' },
  { event: 'clerk/clerk.deleted' },
  async ({ event }) => {
    logInfo('syncUserDeletion', {
      note: 'received event',
      id: event?.id,
      name: event?.name ?? undefined,
    });
    const candidate = extractFromCommonPlaces(event);
    logInfo('syncUserDeletion', { extractedCandidate: candidate });

    let user = candidate;

    if (!user.id && user.email) {
      logInfo(
        'syncUserDeletion',
        `id missing but email present (${user.email}) — attempting Clerk API lookup`
      );
      const clerkUser = await fetchClerkUserByEmail(user.email);
      if (clerkUser) {
        user = { ...user, ...clerkUser };
        logInfo('syncUserDeletion', { afterClerkLookup: user });
      }
    }

    if (!user.id) {
      logError('syncUserDeletion', 'missing user.id — aborting delete. Full event:', event);
      return;
    }

    try {
      const deleted = await Prisma.user.delete({ where: { id: user.id } });
      logInfo('syncUserDeletion', { deletedId: deleted.id });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        logInfo('syncUserDeletion', `record not found to delete (P2025) for id ${user.id}`);
      } else {
        logError('syncUserDeletion', { err });
      }
    }
  }
);
