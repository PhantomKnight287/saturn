import { Rpc, RpcGroup } from "@effect/rpc";
import { Schema } from "effect";
import { InternalServerError } from "./errors/index.js";

export class AuthRpcs extends RpcGroup.make(
  Rpc.make("AuthGet", {
    success: Schema.Any,
    error: InternalServerError,
  }),
  Rpc.make("AuthPost", {
    success: Schema.Any,
    error: InternalServerError,
  })
) {}
