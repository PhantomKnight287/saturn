import { db } from "@saturn/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, apiKey, openAPI } from "better-auth/plugins";
import { organization } from "better-auth/plugins/organization";
import { roles } from "./permissions";

const expression = betterAuth({
  plugins: [
    openAPI(),
    admin({}),
    apiKey(),
    organization({
      roles,
      teams: { enabled: true, allowRemovingAllTeams: false },
    }),
  ],
  emailAndPassword: {
    enabled: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
  }),
  trustedOrigins: ["http://localhost:3000"],
  baseURL: process.env.BETTER_API_URL,
  advanced: { disableOriginCheck: true },
});

export const auth = expression as typeof expression;
