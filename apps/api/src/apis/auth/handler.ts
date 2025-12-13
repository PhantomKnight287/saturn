import {
  HttpApiBuilder,
  HttpServerRequest,
  HttpServerResponse,
} from "@effect/platform";
import { BunHttpServerRequest } from "@effect/platform-bun";
import { Effect } from "effect";
import { BetterAuth } from "src/services/better-auth.js";
import type { APIContract } from "../../contract.js";

const betterAuthHandler = Effect.fn("betterAuthHandler")(function* () {
  const auth = yield* BetterAuth;
  const request = yield* HttpServerRequest.HttpServerRequest;
  const response = yield* auth.handler(BunHttpServerRequest.toRequest(request));

  return yield* HttpServerResponse.raw(response);
});

export const makeAuthLive = (api: typeof APIContract) =>
  HttpApiBuilder.group(api, "auth", (handlers) =>
    handlers
      .handleRaw("get", betterAuthHandler)
      .handleRaw("post", betterAuthHandler),
  );
