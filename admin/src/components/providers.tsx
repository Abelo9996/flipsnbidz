"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

const Toaster = dynamic(
  () => import("sonner").then((mod) => mod.Toaster),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider basePath="/admin/api/auth">
      {children}
      <Toaster richColors position="top-right" theme="dark" />
    </SessionProvider>
  );
}
