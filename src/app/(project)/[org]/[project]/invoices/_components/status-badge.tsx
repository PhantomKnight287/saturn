import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { invoiceStatusEnum } from "@/server/db/schema";
import type { Role } from "@/types";

type Status = (typeof invoiceStatusEnum.enumValues)[number];

const variants: Record<
  Status,
  { label: string; clientLabel?: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground border-muted",
  },
  disputed: {
    label: "Disputed",
    className: "bg-muted text-destructive border-destructive",
  },
  sent: {
    label: "Sent to client",
    className: "bg-muted text-yellow-500 border-yellow-500",
    clientLabel: "Pending payment",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-muted text-muted-foreground border-muted",
  },
  paid: {
    className: "bg-muted text-green-500 border-green-500",
    label: "Paid",
  },
};

export default function InvoiceStatusBadge({
  status,
  role,
}: {
  status: Status;
  role?: Role;
}) {
  const variant = variants[status];
  if (variant === undefined) {
    return null;
  }
  return (
    <Badge className={cn(variant.className)} variant={"outline"}>
      {role === "client" && variant.clientLabel
        ? variant.clientLabel
        : variant.label}
    </Badge>
  );
}
