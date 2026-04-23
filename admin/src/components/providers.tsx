"use client";

import dynamic from "next/dynamic";
import { ReactNode } from "react";

const Toaster = dynamic(
  () => import("sonner").then((mod) => mod.Toaster),
  { ssr: false }
);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors position="top-right" theme="dark" />
    </>
  );
}
