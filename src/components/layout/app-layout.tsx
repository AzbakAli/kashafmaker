"use client";

import { Sidebar } from "./sidebar";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Plus, Car, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userRole = session?.user?.role || "OPERATOR";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="lg:pl-64">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile spacer / Title */}
            <div className="flex items-center gap-3 pl-12 lg:pl-0">
              <div className="hidden sm:flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Kashaf Transport Management
                </p>
              </div>
            </div>

            {/* Right side quick actions + profile */}
            <div className="flex items-center gap-3">
              <Link href="/rides/new">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-medium">
                  <Plus className="h-3.5 w-3.5 mr-1 stroke-[2.5]" />
                  <span className="hidden sm:inline">New Ride</span>
                  <span className="sm:hidden">Ride</span>
                </Button>
              </Link>

              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-xs font-bold text-white shadow-sm">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">{userName}</p>
                  <p className="text-[10px] font-medium text-slate-400 capitalize">{userRole.toLowerCase()}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
