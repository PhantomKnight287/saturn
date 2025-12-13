import { HttpApiBuilder } from "@effect/platform";
import { Layer } from "effect";
import { APIContract } from "../contract.js";
import { makeAuthLive } from "./auth/handler.js";
import { makeDatabasesLive } from "./database/handler.js";

const apiLayer = HttpApiBuilder.api(APIContract);
const authLayer = makeAuthLive(APIContract);

export const APILive = apiLayer.pipe(Layer.provide(authLayer));
