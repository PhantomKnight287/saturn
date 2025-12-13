"use server";

import { actionClient } from "@/lib/action";
import { createServerApiClient } from "@/lib/server-api";
import { onboardingSchema } from "./common";

export const completeOnboarding = actionClient
  .inputSchema(onboardingSchema)
  .action(async ({ parsedInput }) => {
    const client = await createServerApiClient();

    const res = await client.POST("/onboarding", {
      body: {
        orgName: parsedInput.orgName,
      },
    });
    if (res.error) {
      return {
        error: res.error.message,
      };
    }
    return { success: true };
  });
