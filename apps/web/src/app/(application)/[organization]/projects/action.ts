"use server";

import { RpcClient } from "@effect/rpc";
import { Headers } from "@mcrovero/effect-nextjs/Headers";
import {
  type CreateProjectInput,
  ProjectsRPCContract,
} from "@saturn/contracts";
import { Console, Effect, pipe } from "effect";
import { BaseAction } from "@/lib/runtime";

const _createProjectAction = Effect.fn("CreateProjectAction")(
  (input: CreateProjectInput) =>
    pipe(
      Effect.gen(function* () {
        const client = yield* RpcClient.make(ProjectsRPCContract);

        const project = yield* client.CreateProject(input, {
          headers: yield* Headers,
        });
        yield* Console.log(project);
        return yield* Effect.succeed({
          success: true as const,
          project: { ...project }, // this spread is needed here because, without it, it fails with "Only plain objects, and a few built-ins can be passed to Client components"
        });
      }),
      Effect.catchTags({
        "@saturn/BetterAuthApiError": () =>
          Effect.succeed({
            success: false as const,
            message: "Internal Server Error",
          }),
        "@saturn/InternalServerError": () =>
          Effect.succeed({
            success: false as const,
            message: "Internal Server Error",
          }),
        "@saturn/Unauthorized": () =>
          Effect.succeed({
            success: false as const,
            message:
              "You are not authorized to create project in this organization",
          }),
        "@saturn/projects/ProjectWithSameNameAlreadyExistsError": () =>
          Effect.succeed({
            success: false as const,
            message: "A project with same name already exists",
          }),
        RpcClientError: () =>
          Effect.succeed({
            success: false as const,
            message: "RPC Client Error",
          }),
      }),
      Effect.scoped
    )
);

export const createProject = BaseAction.build(_createProjectAction);
