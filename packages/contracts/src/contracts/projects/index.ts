import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import {
  BetterAuthApiError,
  InternalServerError,
  Unauthorized,
} from "../errors/index.js";
import { ProjectWithSameNameAlreadyExistsError } from "./errors/index.js";
import { CreateProjectInput } from "./input.js";
import { ProjectEntity } from "./output.js";

export class ProjectsRPCContract extends RpcGroup.make(
  // Rpc.make("ListProjects", {}),
  Rpc.make("CreateProject", {
    payload: CreateProjectInput,
    error: Schema.Union(
      ProjectWithSameNameAlreadyExistsError,
      InternalServerError,
      Unauthorized,
      BetterAuthApiError
    ),
    success: ProjectEntity,
  })
) {}

export * from "../errors/index.js";

export { CurrentUser, RPCAuthMiddleware } from "../middlewares/auth.js";
export { ProjectWithSameNameAlreadyExistsError } from "./errors/conflict.js";
export { CreateProjectInput } from "./input.js";
