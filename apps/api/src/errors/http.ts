import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class BadRequest extends Schema.TaggedError<BadRequest>()(
  "BadRequest",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 400 })
) {
  readonly _tag = "BadRequest";
}

export class Conflict extends Schema.TaggedError<Conflict>()(
  "Conflict",
  { message: Schema.String },
  HttpApiSchema.annotations({ status: 409 })
) {
  readonly _tag = "Conflict";
}
