import { db } from "@saturn/db";
import { Effect, Schema } from "effect";

export class DatabaseError extends Schema.TaggedError<DatabaseError>(
  "@saturn/DatabaseError"
)("@saturn/DatabaseError", { cause: Schema.Unknown }) {
  readonly _tag = "@saturn/DatabaseError";
}

export class Drizzle extends Effect.Service<Drizzle>()("@saturn/drizzle", {
  // biome-ignore lint/correctness/useYield: shush
  effect: Effect.gen(function* () {
    return {
      db,
    };
  }),
}) {}
