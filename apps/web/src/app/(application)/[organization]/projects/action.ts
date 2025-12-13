"use server";

import { RpcClient } from "@effect/rpc";
import {
  BetterAuthApiError,
  InternalServerError,
  ProjectsRPCContract,
  ProjectWithSameNameAlreadyExistsError,
  Unauthorized,
} from "@saturn/contracts";
import { Console, Effect } from "effect";
import { headers } from "next/headers";
import { RPCProtocol } from "@/rpc-client/protocol";

export const createProject = async () => {
  const effect = Effect.gen(function* () {
    const client = yield* RpcClient.make(ProjectsRPCContract);
    const d = yield* client.CreateProject(
      {
        name: "hello world",
        organizationId: "w3aSao9XUynDGJZ3buWaDTntjSpfsiKy",
      },
      {
        headers: yield* Effect.tryPromise({
          try: () => headers(),
          // biome-ignore lint/nursery/noUselessUndefined: I need to return undefined if the headers are not found
          catch: () => undefined,
        }),
      },
    );
    yield* Console.log(d);
    return d;
  }).pipe(
    Effect.tapErrorTag(
      "@saturn/projects/ProjectWithSameNameAlreadyExistsError",
      () => Console.error("Project with same name already exists"),
    ),
    Effect.tapErrorTag("@saturn/Unauthorized", () =>
      Console.error("User is not authorized"),
    ),
    Effect.tapErrorTag("@saturn/BetterAuthApiError", () =>
      Console.error("Authentication failed"),
    ),
    Effect.tapErrorTag("@saturn/InternalServerError", () =>
      Console.error("Internal server error occurred"),
    ),
    Effect.mapError((error) => {
      // Map errors to serializable error info
      if (error instanceof ProjectWithSameNameAlreadyExistsError) {
        return {
          error: "ProjectWithSameNameAlreadyExists",
          message:
            "A project with this name already exists in this organization.",
        };
      }

      if (error instanceof Unauthorized) {
        return {
          error: "Unauthorized",
          message: "You are not authorized to perform this action.",
        };
      }

      if (error instanceof BetterAuthApiError) {
        return {
          error: "AuthenticationError",
          message: "Authentication failed. Please try logging in again.",
        };
      }

      if (error instanceof InternalServerError) {
        return {
          error: "InternalServerError",
          message: "An internal server error occurred. Please try again later.",
        };
      }

      // Handle RPC client errors (network, connection, etc)
      if (error && typeof error === "object" && "_tag" in error) {
        const tag = error._tag as string;
        if (tag.includes("Rpc") || tag.includes("Transport")) {
          return {
            error: "RpcClientError",
            message:
              "Failed to communicate with the server. Please check your connection.",
          };
        }
      }

      // Handle undefined error
      if (error === undefined) {
        return {
          error: "MissingHeaders",
          message: "Failed to retrieve request headers.",
        };
      }

      // Fallback for unknown errors
      return {
        error: "UnknownError",
        message: "An unexpected error occurred. Please try again.",
      };
    }),
    Effect.provide(RPCProtocol),
    Effect.scoped,
  );

  return await Effect.runPromise(
    Effect.match(effect, {
      onFailure: (error) => ({ success: false as const, ...error }),
      onSuccess: (data) => ({ success: true as const, data }),
    }),
  );
};
