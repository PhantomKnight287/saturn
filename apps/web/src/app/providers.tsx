"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ToastProvider, toastManager } from "@/components/ui/toast";
import { authClient } from "@/lib/auth-client";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <SidebarProvider>
        <ToastProvider>
          <AuthUIProvider
            authClient={authClient}
            Link={Link}
            navigate={router.push}
            onSessionChange={() => {
              router.refresh();
            }}
            replace={router.replace}
            toast={({ message, variant }) => {
              toastManager.add({ description: message, type: variant });
            }}
          >
            {children}
          </AuthUIProvider>
        </ToastProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}
