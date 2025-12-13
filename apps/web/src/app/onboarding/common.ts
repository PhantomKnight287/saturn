import z from "zod";

export const onboardingSchema = z.object({
  orgName: z.string().min(1, "Organization name is required"),
});