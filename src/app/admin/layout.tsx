import AdminLayout from '@/components/admin/AdminLayout';
import { SignIn, SignedOut, SignedIn } from '@clerk/nextjs';
export const metadata = {
  title: 'GoCart. - Admin',
  description: 'GoCart. - Admin',
};

export default function RootAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>
        <AdminLayout>
          <>{children}</>
        </AdminLayout>
      </SignedIn>
      <SignedOut>
        <div className='min-h-screen flex justify-center items-center'>
          <SignIn routing='hash' fallbackRedirectUrl={'/admin'} />
        </div>
      </SignedOut>
    </>
  );
}
