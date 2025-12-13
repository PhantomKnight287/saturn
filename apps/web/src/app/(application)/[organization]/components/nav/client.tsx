"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export default function OrgNavClient({
  tab,
}: {
  tab: {
    name: string;
    href: string;
    visible: boolean;
  };
}) {
  const pathname = usePathname();
  return (
    <Link
      className={cn(
        "border-b-2 px-3 py-2 font-medium text-sm transition-colors",
        pathname === tab.href
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:border-muted-foreground hover:text-foreground"
      )}
      href={tab.href as ComponentProps<typeof Link>["href"]}
      key={tab.name}
    >
      {tab.name}
    </Link>
  );
}
