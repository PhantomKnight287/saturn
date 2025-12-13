import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { InternalServerError } from "./errors/index.js";
import { CreateDatabaseResponse } from "./schemas/database.js";

export class DatabaseRpcs extends RpcGroup.make(
  Rpc.make("CreateDatabase", {
    success: CreateDatabaseResponse,
    error: InternalServerError,
    payload: {
      name: Schema.String,
      organizationId: Schema.String,
    },
  })
) {}
