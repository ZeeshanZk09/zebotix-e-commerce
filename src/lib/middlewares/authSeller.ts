import prismaClient from '../prisma';

export default async function authSeller(userId: string) {
  try {
    const user = await prismaClient.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        store: true,
      },
    });

    if (user?.store) {
      if (user.store.status === 'approved' && user.store.isActive) {
        return user.store.id;
      }
      return false;
    } else {
      return false;
    }
  } catch (error) {
    console.log(error);
    return false;
  }
}
