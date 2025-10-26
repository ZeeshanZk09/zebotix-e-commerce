import { Outfit } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import StoreProvider from '@/lib/providers/StoreProvider';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';
import AppProvider from '@/lib/providers/AppProvider';

const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600'] });

export const metadata = {
  title: 'GoCart. - Shop smarter',
  description: 'GoCart. - Shop smarter',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang='en'>
        <AppProvider>
          <body className={`${outfit.className} antialiased`}>
            <StoreProvider>
              <Toaster />
              {children}
            </StoreProvider>
          </body>
        </AppProvider>
      </html>
    </ClerkProvider>
  );
}
