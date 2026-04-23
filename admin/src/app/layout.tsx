import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Flips & Bidz Admin",
  description: "Admin dashboard for Flips & Bidz liquidation auctions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        <Providers>
          {children}
          <Toaster theme="dark" />
        </Providers>
      </body>
    </html>
  );
}
