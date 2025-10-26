import Prisma from '../prisma';

export default async function authAdmin(userId: string) {
  try {
    const user = await Prisma.user.findUnique({ where: { id: userId } });
    const isSuperAdmin =
      user?.email === process.env.ADMIN_EMAIL! ||
      user?.email === 'mzeeshankhan0988@gmail.com' ||
      user?.email === 'apnacampus.it@gmail.com' ||
      user?.email === 'dr5269139@gmail.com';

    console.log('iAdmin', isSuperAdmin);

    await Prisma.user.update({
      where: { id: userId },
      data: {
        role: isSuperAdmin ? 'ADMIN' : 'CUSTOMER',
      },
    });
    const isAdmin = user?.role === 'ADMIN' ? true : false;
    return isAdmin;
  } catch (error) {
    console.log(error);
    return false;
  }
}
