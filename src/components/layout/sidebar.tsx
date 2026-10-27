"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Users,
  Truck,
  UserCircle,
  Building2,
  FileText,
  Files,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { signOut, useSession } from "next-auth/react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { name: "Rides", href: "/rides", icon: Car, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { name: "Drivers", href: "/drivers", icon: Users, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { name: "Vehicles", href: "/vehicles", icon: Truck, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { name: "Passengers", href: "/passengers", icon: UserCircle, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { name: "Companies", href: "/companies", icon: Building2, roles: ["ADMIN", "MANAGER"] },
  { name: "Kashaf Templates", href: "/templates", icon: FileText, roles: ["ADMIN", "MANAGER"] },
  { name: "Kashaf Documents", href: "/documents", icon: Files, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { name: "Reports", href: "/reports", icon: BarChart3, roles: ["ADMIN", "MANAGER", "OPERATOR"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["ADMIN"] },
];

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = userName || session?.user?.name;
  const role = session?.user?.role || "OPERATOR";

  const items = useMemo(
    () => navigation.filter((item) => item.roles.includes(role)),
    [role]
  );

  return (
    <>
      <button
        className="fixed left-4 top-4 z-40 rounded-lg bg-white p-2 shadow-md lg:hidden border border-slate-200"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5 text-slate-600" /> : <Menu className="h-5 w-5 text-slate-600" />}
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-gradient-to-b from-slate-50 to-white transition-transform lg:translate-x-0 shadow-xl",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Link
          href="/dashboard"
          className="flex h-16 items-center gap-3 border-b border-slate-200 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 transition-opacity"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">KashafMake</h1>
            <p className="text-[11px] text-indigo-100 font-medium">Transport Operations</p>
          </div>
        </Link>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {items.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                    : "text-slate-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-700"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4 bg-slate-50">
          {displayName && (
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <p className="truncate text-sm font-medium text-slate-700">{displayName}</p>
            </div>
          )}
          <p className="mb-3 text-xs uppercase tracking-wide text-slate-400 font-semibold">{role}</p>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
