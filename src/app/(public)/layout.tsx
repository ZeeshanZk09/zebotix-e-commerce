import Banner from '@/components/Banner';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Banner />
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
