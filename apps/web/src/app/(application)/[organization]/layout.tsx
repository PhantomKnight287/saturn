import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { OrgHeader } from "@/components/org-header";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { getCachedOrganization, getCachedUserSession } from "./cache";
import OrgNavServer from "./components/nav/server";

export default async function OrganizationLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ organization: string }>;
}) {
  const { organization } = await params;
  const session = await getCachedUserSession(await headers());
  if (!session) {
    return redirect(
      `/auth/sign-in?callback=${encodeURIComponent(`/${organization}`)}`
    );
  }
  const organizationData = await getCachedOrganization(
    organization,
    await headers()
  );

  if (!organizationData) {
    return notFound();
  }

  const allOrganizations = await authClient.organization.list(
    {},
    { headers: await headers() }
  );

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex w-full shrink-0 flex-col items-center bg-secondary transition-[width,height] ease-linear">
        <div className="flex w-full items-center gap-2 px-4">
          <OrgHeader
            allOrganizations={allOrganizations.data}
            allProjects={[]}
            organizationName={organizationData.name}
            organizationSlug={organizationData.slug}
            projectName={null}
          />
        </div>
        <Separator className="w-full bg-accent" />

        <OrgNavServer slug={organization} />
      </header>
      <div className="flex w-full items-center justify-center">
        <div className="flex max-w-7xl flex-1 items-center justify-center p-4">
          {children}
        </div>
      </div>
    </div>
  );
}
