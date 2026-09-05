"use client";

import { Sidebar } from "./sidebar";
import { useSession } from "next-auth/react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="lg:pl-64">
        <header className="sticky top-0 z-20 hidden border-b border-slate-200 bg-white/90 backdrop-blur lg:block">
          <div className="flex h-16 items-center justify-between px-8">
            <p className="text-sm text-slate-500">Enter once. Reuse everywhere. Generate Kashaf from connected records.</p>
            <div className="text-right">
              <p className="text-sm font-medium text-slate-800">{session?.user?.name}</p>
              <p className="text-xs text-slate-400">{session?.user?.email}</p>
            </div>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
