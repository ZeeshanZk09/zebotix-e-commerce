import AdminLayout from '@/components/admin/AdminLayout';

export const metadata = {
  title: 'GoCart. - Admin',
  description: 'GoCart. - Admin',
};

export default function RootAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminLayout>{children}</AdminLayout>
    </>
  );
}
