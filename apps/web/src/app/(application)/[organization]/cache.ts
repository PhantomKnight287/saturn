"use server";

import type { ReadonlyHeaders } from "next/dist/server/web/spec-extension/adapters/headers";
import { cache } from "react";
import { authClient } from "@/lib/auth-client";

export const getCachedActiveOrgMember = cache(
  async (headers: ReadonlyHeaders, cacheBustKey?: string) => {
    const member = await authClient.organization.getActiveMember({
      fetchOptions: { headers },
    });
    // biome-ignore lint/nursery/noUnusedExpressions: <explanation>
    cacheBustKey;
    return member.data;
  }
);

export const getCachedUserSession = cache(async (headers: ReadonlyHeaders) => {
  const session = await authClient.getSession(undefined, {
    headers,
  });
  if (!session.data?.user) {
    return null;
  }
  return session.data.user;
});

export const getCachedOrganization = cache(
  async (slug: string, headers: ReadonlyHeaders) => {
    const session = await getCachedUserSession(headers);
    if (!session) {
      return null;
    }
    const organization = await authClient.organization.getFullOrganization(
      {
        query: { organizationSlug: slug },
      },
      { headers }
    );
    if (!organization.data) {
      return null;
    }
    return organization.data;
  }
);
