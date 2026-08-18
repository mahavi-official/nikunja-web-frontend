import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

/**
 * The CMS sits outside `(site)`, so it inherits the document and the session
 * from the root layout but none of the public header or footer.
 */
export const metadata: Metadata = {
  title: {
    default: "Content studio",
    template: "%s · Content studio",
  },
  // Nothing behind a login belongs in an index, whatever the site setting says.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
