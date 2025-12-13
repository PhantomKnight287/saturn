import { database, members } from "@saturn/db/schema";
import { and, eq } from "drizzle-orm";
import type { Schema } from "effect";
import { Effect } from "effect";
import { InternalServerError } from "src/errors/index.js";
import type { CreateDatabaseRequest } from "../apis/database/schema.js";
import { Drizzle } from "./drizzle.js";

export const DatabaseService = {
  findOrganizationMember: ({
    organizationId,
    userId,
  }: {
    organizationId: string;
    userId: string;
  }) =>
    Effect.gen(function* () {
      const { db } = yield* Drizzle;
      const [member] = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(members)
            .where(
              and(
                eq(members.organizationId, organizationId),
                eq(members.userId, userId)
              )
            )
            .limit(1),
        catch: (error) => new InternalServerError({ cause: error }),
      });
      return member;
    }),

  findDatabaseByName: ({
    name,
    organizationId,
  }: {
    name: string;
    organizationId: string;
  }) =>
    Effect.gen(function* () {
      const { db } = yield* Drizzle;
      const [existing] = yield* Effect.tryPromise({
        try: () =>
          db
            .select()
            .from(database)
            .where(
              and(
                eq(database.name, name),
                eq(database.organizationId, organizationId)
              )
            )
            .limit(1),
        catch: (error) => new InternalServerError({ cause: error }),
      });
      return existing;
    }).pipe(Effect.withLogSpan("findDatabaseByName")),

  createDatabase: (payload: Schema.Schema.Type<typeof CreateDatabaseRequest>) =>
    Effect.gen(function* () {
      const { db } = yield* Drizzle;
      const [newDatabase] = yield* Effect.tryPromise({
        try: () =>
          db
            .insert(database)
            .values({
              name: payload.name,
              organizationId: payload.organizationId,
            })
            .returning(),
        catch: (error) => new InternalServerError({ cause: error }),
      });
      return newDatabase;
    }),
} as const;
