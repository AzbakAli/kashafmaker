"use client";

import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/toast";

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0}>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}
