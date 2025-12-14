import {
  HttpApiBuilder,
  HttpApiSwagger,
  HttpMiddleware,
  HttpServer,
} from "@effect/platform";
import { BunHttpServer, BunRuntime } from "@effect/platform-bun";
import { RpcSerialization, RpcServer } from "@effect/rpc";
import { ProjectsRPCContract } from "@saturn/contracts";
import { Layer } from "effect";
import { APILive } from "./apis/index.js";
import { NodeSdkLive } from "./observability.js";
import { ProjectsLive } from "./rpc/projects/live.js";
import { BetterAuth } from "./services/better-auth.js";
import { Drizzle } from "./services/drizzle.js";

const ProjectLayer = RpcServer.layer(ProjectsRPCContract).pipe(
  Layer.provide(ProjectsLive),
);

const HttpProtocol = RpcServer.layerProtocolHttp({
  path: "/rpc",
  routerTag: HttpApiBuilder.Router,
}).pipe(Layer.provide(RpcSerialization.layerNdjson));

const Server = HttpApiBuilder.serve(HttpMiddleware.logger).pipe(
  Layer.provide(NodeSdkLive),
  Layer.provide(
    HttpApiSwagger.layer({
      path: "/api/swagger",
    }),
  ),
  Layer.provide(APILive),
  Layer.provide(ProjectLayer),
  Layer.provide(BetterAuth.Default),
  Layer.provide(Drizzle.Default),
  // Layer.provide(RPCLayer),
  Layer.provide(HttpProtocol),
  HttpServer.withLogAddress,
  Layer.provide(
    HttpApiBuilder.middlewareCors({
      credentials: true,
      allowedOrigins: ["http://localhost:3000"],
    }),
  ),
  Layer.provide(BunHttpServer.layer({ port: 5000 })),
);

BunRuntime.runMain(Layer.launch(Server));

// Layer.launch(Main).pipe(BunRuntime.runMain);
