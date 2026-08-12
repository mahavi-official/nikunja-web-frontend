import type { Metadata } from "next";
import { AccountPanel } from "./AccountPanel";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your Radhakundah member account and active sessions.",
  // Member pages are private by nature and never indexed.
  robots: { index: false, follow: false, nocache: true },
};

export default function AccountPage() {
  return (
    <div className="container-page py-12 md:py-16">
      <span className="eyebrow">Member</span>
      <h1 className="mt-2 text-3xl md:text-4xl">Your account</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        Sign-in is Google-only — there is no password to manage. Below is what we hold and which
        devices currently hold a session.
      </p>

      <AccountPanel />
    </div>
  );
}
