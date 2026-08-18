import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

/**
 * Public site chrome. Everything a visitor sees lives under this layout;
 * `/admin` deliberately does not, so the CMS gets the full viewport.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
