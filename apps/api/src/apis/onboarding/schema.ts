import { Schema } from "effect";

export const OnboardingSchema = Schema.Struct({
  organizationName: Schema.String,
});
