import { RpcMiddleware } from "@effect/rpc";
import { Context } from "effect";
import type { auth } from "@saturn/auth";

export class CurrentUser extends Context.Tag("CurrentUser")<
  CurrentUser,
  Awaited<ReturnType<typeof auth.api.getSession>>
>() {}

export class RPCAuthMiddleware extends RpcMiddleware.Tag<RPCAuthMiddleware>()(
  "RPCAuthMiddleware",
  {
    provides: CurrentUser,
  },
) {}
