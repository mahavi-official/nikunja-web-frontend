import type { Metadata } from "next";
import { AuthCallback } from "./AuthCallback";

export const metadata: Metadata = {
  title: "Signing you in",
  robots: { index: false, follow: false },
};

/**
 * Where Google's callback lands after the API has set the refresh cookie.
 * The access token arrives in the query string; the client component below
 * takes it out of the URL immediately and keeps it in memory only.
 */
export default function AuthCallbackPage() {
  return <AuthCallback />;
}
