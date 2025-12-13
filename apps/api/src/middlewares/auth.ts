import {
  HttpApiError,
  HttpApiMiddleware,
  HttpServerRequest,
} from "@effect/platform";
import { Effect, Layer } from "effect";
import { CurrentUser, User } from "src/entities/user.js";
import { auth } from "src/lib/auth.js";

export class Authentication extends HttpApiMiddleware.Tag<Authentication>()(
  "Http/Authentication",
  {
    failure: HttpApiError.Unauthorized,
    provides: CurrentUser,
  }
) {}

export const AuthenticationLive = Layer.effect(
  Authentication,
  Effect.gen(function* () {
    yield* Effect.log("creating Authorization middleware");
    return Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const user = yield* Effect.promise(async () => await auth.api.getSession({ headers: request.headers }));
      if (user) {
        return yield* Effect.succeed(new User({ id: user.session.id }));
      }
      return yield* Effect.fail(new HttpApiError.Unauthorized());
    });
  })
);
