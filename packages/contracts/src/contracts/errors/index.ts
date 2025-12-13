import { Schema } from "effect";

export class InternalServerError extends Schema.TaggedError<InternalServerError>()(
  "@saturn/InternalServerError",
  {
    message: Schema.String.pipe(Schema.optional),
  },
) {
  override readonly _tag = "@saturn/InternalServerError";
}

export class Unauthorized extends Schema.TaggedError<Unauthorized>()(
  "@saturn/Unauthorized",
  {
    message: Schema.String.pipe(Schema.optional),
  },
) {
  override readonly _tag = "@saturn/Unauthorized";
}

export class BadRequest extends Schema.TaggedError<BadRequest>()("BadRequest", {
  message: Schema.String,
}) {
  override readonly _tag = "BadRequest";
}

export class Conflict extends Schema.TaggedError<Conflict>()("Conflict", {
  message: Schema.String,
}) {
  override readonly _tag = "Conflict";
}

export class BetterAuthApiError extends Schema.TaggedError<BetterAuthApiError>()(
  "@saturn/BetterAuthApiError",
  { cause: Schema.Unknown },
) {}
