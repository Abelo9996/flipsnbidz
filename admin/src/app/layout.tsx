import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "Flips & Bidz Admin",
  description: "Admin dashboard for Flips & Bidz liquidation auctions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
