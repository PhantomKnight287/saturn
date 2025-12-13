import { HttpApiEndpoint, HttpApiError, HttpApiGroup } from "@effect/platform";
import { Schema } from "effect";
import { InternalServerError } from "src/errors/index.js";
import { BetterAuthApiError } from "src/services/better-auth.js";

export const AuthGroup = HttpApiGroup.make("auth")
  .add(
    HttpApiEndpoint.get("get")`/api/auth/*`
      .addSuccess(Schema.Any)
      .addError(InternalServerError, { status: 500 })
      .addError(BetterAuthApiError, { status: 500 })
      .addError(HttpApiError.HttpApiDecodeError, { status: 400 }),
  )
  .add(
    HttpApiEndpoint.post("post")`/api/auth/*`
      .addSuccess(Schema.Any)
      .addError(InternalServerError, { status: 500 })
      .addError(BetterAuthApiError, { status: 500 })
      .addError(HttpApiError.HttpApiDecodeError, { status: 400 }),
  );
