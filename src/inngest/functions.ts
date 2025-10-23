import Prisma from '@/lib/prisma';
import { inngest } from './client';

export const syncUserCreation = inngest.createFunction(
  { id: 'sync-user-creation' },
  { event: 'clerk/clerk.created' },
  async ({ event }) => {
    const { data } = event;
    await Prisma.user.create({
      data: {
        id: data?.id,
        name: `${data?.first_name} ${data?.last_name}`,
        email: data?.email_addresses[0]?.email_address,
        image: data?.image_url,
      },
    });
  }
);

export const syncUserUpdation = inngest.createFunction(
  { id: 'sync-user-updation' },
  { event: 'clerk/clerk.updated' },
  async ({ event }) => {
    const { data } = event;
    await Prisma.user.update({
      where: {
        id: data?.id,
      },
      data: {
        name: `${data?.first_name} ${data?.last_name}`,
        email: data?.email_addresses[0]?.email_address,
        image: data?.image_url,
      },
    });
  }
);

export const syncUserDeletion = inngest.createFunction(
  { id: 'sync-user-deletion' },
  { event: 'clerk/clerk.deleted' },
  async ({ event }) => {
    const { data } = event;
    await Prisma.user.delete({
      where: {
        id: data?.id,
      },
    });
  }
);
