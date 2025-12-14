"use client";

import { ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
import { Button } from "./ui/button";

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
      {/* Organization Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              className="flex h-8 items-center gap-2 px-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
              aria-label="Open organization switcher"
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
          }
        />

        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Organizations</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {allOrganizations?.map((organization) => (
            <DropdownMenuItem
              key={organization.id}
              onClick={async () => {
                await authClient.organization.setActive({
                  organizationSlug: organization.slug,
                });
                router.replace(`/dashboard/${organization.slug}`);
              }}
            >
              <div className="flex w-full items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-xs">
                    {organization.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {organization.name}
              </div>
            </DropdownMenuItem>
          ))}

          <DropdownMenuItem>
            <Link href="/onboarding" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Organization
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Project Switcher */}
      {projectName && (
        <>
          <Separator
            className="!h-6 !w-[2px] mx-2 rotate-12 bg-secondary-foreground/20"
            orientation="vertical"
          />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="flex h-8 items-center gap-2 px-2 text-sm rounded-md hover:bg-accent hover:text-accent-foreground"
                  aria-label="Open team switcher"
                >
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="max-w-[120px] truncate font-medium text-sm">
                    {projectName}
                  </span>
                  <ChevronsUpDown className="ml-1 h-4 w-4 opacity-70" />
                </Button>
              }
            />

            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Projects</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {allProjects?.map((project) => (
                <DropdownMenuItem key={project.id}>
                  <Link href={`/dashboard/${organizationSlug}/${project.id}`}>
                    {project.name}
                  </Link>
                </DropdownMenuItem>
              ))}

              <DropdownMenuItem>
                <Link
                  href={`/dashboard/${organizationSlug}/projects`}
                  className="flex items-center gap-2"
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
