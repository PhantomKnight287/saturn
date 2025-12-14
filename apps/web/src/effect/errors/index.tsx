import { Schema } from "effect";

export class InternalError extends Schema.TaggedClass<InternalError>(
  "InternalError",
)("InternalError", {
  internalMessage: Schema.NullOr(Schema.String),
}) {}
