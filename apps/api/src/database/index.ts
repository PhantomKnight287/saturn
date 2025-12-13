import * as PgDrizzle from "@effect/sql-drizzle/Pg";
import { PgClient } from "@effect/sql-pg";
import { Config, Layer } from "effect";

const PgLive = PgClient.layerConfig({
  url: Config.redacted("DATABASE_URL"),
});

const DrizzleLive = PgDrizzle.layer.pipe(Layer.provide(PgLive));

export const DatabaseLive = Layer.mergeAll(PgLive, DrizzleLive);
