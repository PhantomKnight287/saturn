import { HttpApi } from "@effect/platform";
import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { AuthGroup } from "./apis/auth/api.js";

export class CreateDatabaseResponse extends Schema.Class<CreateDatabaseResponse>(
  "CreateDatabaseResponse",
)({
  id: Schema.String,
  name: Schema.String,
  organizationId: Schema.String,
}) {}

export const APIContract = HttpApi.make("API").add(AuthGroup);

export class DatabaseContract extends RpcGroup.make(
  Rpc.make("CreateDatabase", {
    success: CreateDatabaseResponse,
    // error: InternalServerError,
    payload: {
      name: Schema.String,
      organizationId: Schema.String,
    },
  }),
) {}
