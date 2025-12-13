import type { Headers as EffectHeaders } from "@effect/platform";
import {
  type CreateProjectInput,
  InternalServerError,
  ProjectWithSameNameAlreadyExistsError,
  Unauthorized,
} from "@saturn/contracts";
import { ProjectEntity } from "@saturn/contracts/dist/contracts/projects/output.js";
import { db } from "@saturn/db";
import { projects } from "@saturn/db/schema";
import { and, eq } from "drizzle-orm";
import { Console, Effect } from "effect";
import { BetterAuth } from "src/services/better-auth.js";

export class ProjectsService extends Effect.Service<ProjectsService>()(
  "@saturn/api/rpc/projects/service/ProjectsService",
  {
    effect: Effect.gen(function* () {
      return {
        CreateProject: (
          input: CreateProjectInput,
          headers: EffectHeaders.Headers,
        ) =>
          Effect.fn("CreateProject")(function* () {
            const auth = yield* BetterAuth;
            yield* Console.log(headers);
            const hasPermissionToCreateProject = yield* auth.hasPermission({
              body: {
                organizationId: input.organizationId,
                permissions: {
                  //@ts-expect-error god damn broken types
                  projects: ["create"],
                },
              },
              headers,
            });
            if (hasPermissionToCreateProject.success === false) {
              return yield* Effect.fail(
                new Unauthorized({
                  message:
                    "You do not permission to create project in this organization",
                }),
              );
            }
            if (hasPermissionToCreateProject.error !== null) {
              return yield* Effect.fail(
                new InternalServerError({
                  message: hasPermissionToCreateProject.error,
                }),
              );
            }
            const [projectWithSameName] = yield* Effect.tryPromise({
              try: () =>
                db
                  .select()
                  .from(projects)
                  .where(
                    and(
                      eq(projects.name, input.name),
                      eq(projects.organizationId, input.organizationId),
                    ),
                  ),
              catch: (error) => new InternalServerError(),
            });
            if (projectWithSameName) {
              return yield* Effect.fail(
                new ProjectWithSameNameAlreadyExistsError(),
              );
            }
            const [newProject] = yield* Effect.tryPromise({
              try: () =>
                db
                  .insert(projects)
                  .values({
                    name: input.name,
                    description: input.description,
                    organizationId: input.organizationId,
                  })
                  .returning(),
              catch: (error) => new InternalServerError(),
            });
            return yield* Effect.succeed(
              ProjectEntity.make({
                name: newProject.name,
                description: newProject.description,
                createdAt: newProject.createdAt,
                id: newProject.id,
                updatedAt: newProject.updatedAt,
                organizationId: newProject.organizationId,
              }),
            );
          }),
      };
    }),
  },
) {}
