"use client";

import { LogOut } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";

export function NavUser() {
  const session = authClient.useSession();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                size="lg"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    alt={session.data?.user.name}
                    src={session.data?.user.image ?? ""}
                  />
                  <AvatarFallback className="rounded-lg">
                    {session.data?.user.name
                      ? session.data?.user.name?.charAt(0)
                      : "U"}
                  </AvatarFallback>
                </Avatar>
              </SidebarMenuButton>
            }
          />

          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={"bottom"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage
                    alt={session.data?.user.name}
                    src={session.data?.user.image ?? ""}
                  />
                  <AvatarFallback className="rounded-lg">
                    {session.data?.user.name
                      ? session.data?.user.name?.charAt(0)
                      : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {session.data?.user.name
                      ? session.data?.user.name
                      : "Unknown User"}
                  </span>
                  <span className="truncate text-xs">
                    {session.data?.user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {/* <DropdownMenuGroup>
              {session.data?.user?.onPayAsYouGo === true ? null : (
                <DropdownMenuItem
                  onClick={async () => {
                    await authClient.checkout({ slug: "usage_billing" });
                  }}
                >
                  <Sparkles />
                  Upgrade to Pay As You Go
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup> */}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {/* <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem> */}
              {/* <DropdownMenuItem
                onClick={async () => {
                  await authClient.customer.portal({});
                }}
              >
                <CreditCard />
                Billing
              </DropdownMenuItem> */}
              {/* <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem> */}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut({});
                window.location.reload();
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
