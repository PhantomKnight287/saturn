import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class InternalServerError extends Schema.TaggedError<InternalServerError>()(
  "@saturn/InternalServerError",
  {},
  HttpApiSchema.annotations({ status: 500 })
) {
  readonly _tag = "@saturn/InternalServerError";
}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "@saturn/Unauthorized",
  {},
  HttpApiSchema.annotations({ status: 401 })
) {
  readonly _tag = "@saturn/Unauthorized";
}
