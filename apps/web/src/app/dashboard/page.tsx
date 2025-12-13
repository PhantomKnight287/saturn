import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default async function Dashboard() {
  const session = await authClient.getSession({
    fetchOptions: {
      headers: await headers(),
    },
  });
  if (session.data === null) {
    redirect("/auth/sign-in");
  }
  const organizations = await authClient.organization.list({
    fetchOptions: {
      headers: await headers(),
    },
  });
  if (organizations.data?.length === 0) {
    redirect("/onboarding");
  }
  const organization = session.data?.session.activeOrganizationId
    ? organizations.data?.find(
        (org) => org.id === session.data?.session.activeOrganizationId
      )
    : organizations.data?.[0];

  if (!organization) {
    redirect("/onboarding");
  }
  redirect(`/${organization.slug}`);
  return null
}
