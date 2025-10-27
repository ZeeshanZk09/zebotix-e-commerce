import StoreLayout from '@/components/store/StoreLayout';
import { SignedIn, SignedOut, SignIn } from '@clerk/nextjs';

export const metadata = {
  title: 'GoCart. - Store Dashboard',
  description: 'GoCart. - Store Dashboard',
};

export default function RootAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>
        <StoreLayout>
          <>{children}</>
        </StoreLayout>
      </SignedIn>
      <SignedOut>
        <div className='min-h-screen flex justify-center items-center'>
          <SignIn routing='hash' fallbackRedirectUrl={'/store'} />
        </div>
      </SignedOut>
    </>
  );
}
