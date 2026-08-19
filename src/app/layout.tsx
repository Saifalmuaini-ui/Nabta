import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import CloudSync from "@/components/CloudSync";
import ServiceWorker from "@/components/ServiceWorker";
import { AuthProvider } from "@/lib/auth";
import { I18nProvider } from "@/lib/i18n";
import { StoreProvider } from "@/lib/store";

export const metadata: Metadata = {
  title: "Nabta, plant and verify and earn",
  description:
    "Community planting verified by AI. Earn points, redeem rewards, trade with growers, and connect to government support, in service of the UAE National Food Security Strategy 2051.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
  appleWebApp: { capable: true, title: "Nabta", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0e6446",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // lang and dir are set on this element from the client once the saved
    // locale is known. They start as English so the server output and the
    // first client render agree.
    <html lang="en" dir="ltr">
      <body>
        <I18nProvider>
          <AuthProvider>
            <StoreProvider>
              <ServiceWorker />
              <CloudSync />
              <AppShell>{children}</AppShell>
            </StoreProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
