"use client";

import { Gavel, Menu } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { ProfitChat } from "@/components/profit-chat";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Sidebar />

      <div className="min-h-screen lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-800 bg-gray-950/95 px-4 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-blue-500" />
            <span className="text-base font-semibold text-white">Flips &amp; Bidz</span>
          </div>

          <Sheet>
            <SheetTrigger className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-800 bg-gray-900 text-gray-200 transition-colors hover:bg-gray-800 hover:text-white">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation</span>
            </SheetTrigger>
            <SheetContent side="left" className="w-[88vw] max-w-[320px] border-gray-800 bg-gray-900 p-0 text-white">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <Sidebar mobile />
            </SheetContent>
          </Sheet>
        </header>

        <main className="min-h-[calc(100vh-4rem)] px-4 py-5 sm:px-6 sm:py-6 lg:min-h-screen lg:p-8">
          {children}
        </main>
      </div>

      <ProfitChat />
    </div>
  );
}
