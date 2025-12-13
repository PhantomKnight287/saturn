import { headers } from "next/headers";
import { authClient } from "@/lib/auth-client";
import { getCachedActiveOrgMember } from "../../cache";
import OrgNavClient from "./client";

export default async function OrgNavServer({ slug }: { slug: string }) {
  let member: Awaited<ReturnType<typeof getCachedActiveOrgMember>>;
  member = await getCachedActiveOrgMember(await headers(), "0");
  if (member == null) {
    await authClient.organization.setActive({
      organizationSlug: slug,
      fetchOptions: {
        headers: await headers(),
      },
    });
    member = await getCachedActiveOrgMember(await headers(), "1");
  }

  const navTabs = [
    { name: "Overview", href: `/${slug}`, visible: true },
    {
      name: "Projects",
      href: `/${slug}/projects`,
      visible: ["admin", "owner", "lead", "member"].includes(
        member?.role as string,
      ),
    },
    // {
    //   name: "Usage",
    //   href: `/${slug}/usage`,
    //   visible: ["owner"].includes(member?.role as string),
    // },
    // {
    //   name: "Members",
    //   href: `/${slug}/members`,
    //   visible: ["admin", "owner", "lead"].includes(member?.role as string),
    // },
    // {
    //   name: "Logs",
    //   href: `/${slug}/audit-logs`,
    //   visible: ["admin", "owner", "lead", "member"].includes(
    //     member?.role as string
    //   ),
    // },
    // {
    //   name: "Settings",
    //   href: `/${slug}/settings`,
    //   visible: ["admin", "owner"].includes(member?.role as string),
    // },
  ];
  if (!member) {
    return null;
  }

  return (
    <nav className="flex w-full flex-row items-center justify-start gap-2 overflow-x-hidden border-border border-b bg-secondary px-4">
      {navTabs
        .filter((tab) => tab.visible)
        .map((tab) => (
          <OrgNavClient key={tab.name} tab={tab} />
        ))}
    </nav>
  );
}
