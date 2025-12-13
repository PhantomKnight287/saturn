import { randomUUID } from "node:crypto";
import type { Rpc } from "@effect/rpc";
import { Effect, Layer, Ref } from "effect";
import { CreateDatabaseResponse, DatabaseContract } from "src/contract.js";

class DatabaseService extends Effect.Service<DatabaseService>()(
  "@saturn/api/rpc/index/DatabaseService",
  {
    effect: Effect.gen(function* () {
      const ref = yield* Ref.make<CreateDatabaseResponse[]>([
        new CreateDatabaseResponse({
          id: "1",
          name: "Alice",
          organizationId: "1",
        }),
        new CreateDatabaseResponse({
          id: "2",
          name: "Bob",
          organizationId: "1",
        }),
      ]);
      return {
        createDatabase: (name: string, organizationId: string) => {
          const id = randomUUID();
          const database = new CreateDatabaseResponse({
            id,
            name,
            organizationId,
          });
          return Ref.updateAndGet(ref, (databases) => [
            ...databases,
            database,
          ]).pipe(Effect.andThen((users) => users.at(-1)!));
        },
      };
    }),
  }
) {}

export const DatabasesLive: Layer.Layer<Rpc.Handler<"CreateDatabase">> =
  DatabaseContract.toLayer(
    Effect.gen(function* () {
      const dbService = yield* DatabaseService;
      return {
        CreateDatabase: ({ name, organizationId }) =>
          dbService.createDatabase(name, organizationId),
      };
    })
  ).pipe(Layer.provide(DatabaseService.Default));
