import { auth as sharedAuth } from "@saturn/auth";

export const auth = sharedAuth as typeof import("@saturn/auth/auth").auth;
