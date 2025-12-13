"use client";

import { ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { authClient } from "@/lib/auth-client";
import { NavUser } from "./nav-user";
import { Separator } from "./ui/separator";

export type OrgHeaderProps = {
  organizationName: string;
  organizationSlug: string;
  projectName?: string | null;
  allOrganizations:
    | {
        id: string;
        name: string;
        createdAt: Date;
        slug: string;
        metadata?: Record<string, unknown>;
        logo?: string | null | undefined;
      }[]
    | null;

  allProjects: Array<{ id: string; name: string }> | null;
};

export function OrgHeader({
  organizationName,
  projectName,
  allOrganizations,
  allProjects,
  organizationSlug,
}: OrgHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex w-full items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label="Open organization switcher"
            className="flex h-8 items-center gap-2 px-2 text-sm"
            size="sm"
            variant="ghost"
          >
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-xs">
                {organizationName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[120px] truncate font-medium text-sm">
              {organizationName}
            </span>
            <ChevronsUpDown className="ml-1 h-4 w-4 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56" sideOffset={4}>
          <DropdownMenuLabel className="text-muted-foreground text-xs">
            Organizations
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {allOrganizations?.map((organization) => (
            <DropdownMenuItem
              asChild
              className="w-full gap-2 p-2"
              key={organization.id}
            >
              <Button
                className="flex w-full items-center justify-start gap-2 outline-none ring-0"
                onClick={async () => {
                  await authClient.organization.setActive({
                    organizationSlug: organization.slug,
                  });
                  router.replace(`/dashboard/${organization.slug}`);
                }}
                variant={"ghost"}
              >
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">
                    {organization.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {organization.name}
              </Button>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem asChild>
            <Link className="gap-2 p-2" href="/onboarding">
              <Plus className="h-4 w-4" />
              Add Organization
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {projectName && (
        <>
          <Separator
            className="!h-6 !w-[2px] mx-2 rotate-12 bg-secondary-foreground/20"
            orientation="vertical"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Open team switcher"
                className="flex h-8 items-center gap-2 px-2 text-sm"
                size="sm"
                variant="ghost"
              >
                <div className="h-2 w-2 rounded-full bg-blue-500" />
                <span className="max-w-[120px] truncate font-medium text-sm">
                  {projectName}
                </span>
                <ChevronsUpDown className="ml-1 h-4 w-4 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56" sideOffset={4}>
              <DropdownMenuLabel className="text-muted-foreground text-xs">
                Projects
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allProjects?.map((project) => (
                <DropdownMenuItem className="w-full gap-2 p-2" key={project.id}>
                  <Link
                    className="w-full"
                    href={`/dashboard/${organizationSlug}/${project.id}`}
                  >
                    {project.name}
                  </Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem asChild>
                <Link
                  className="cursor-pointer gap-2 p-2"
                  href={`/dashboard/${organizationSlug}/projects`}
                >
                  <Plus className="h-4 w-4" />
                  Add Project
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      <div className="ml-auto">
        <NavUser />
      </div>
    </div>
  );
}
