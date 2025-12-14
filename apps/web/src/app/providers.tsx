"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
      <TooltipProvider>
        <SidebarProvider>
          <Toaster />

          <AuthUIProvider
            authClient={authClient}
            Link={Link}
            navigate={router.push}
            onSessionChange={() => {
              router.refresh();
            }}
            replace={router.replace}
            toast={({ message, variant }) => {
              if (variant === "error") {
                toast.error(message);
              } else if (variant === "warning") {
                toast.warning(message);
              } else if (variant === "success") {
                toast.success(message);
              } else if (variant === "info") {
                toast.info(message);
              } else {
                toast(message);
              }
            }}
          >
            {children}
          </AuthUIProvider>
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}
