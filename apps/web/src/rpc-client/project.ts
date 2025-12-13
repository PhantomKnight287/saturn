import { RpcClient } from "@effect/rpc";
import { ProjectsRPCContract } from "@saturn/contracts";
import { Effect } from "effect";
import { RPCProtocol } from "./protocol";

export class ProjectRPC extends Effect.Service<ProjectRPC>()("ProjectRPC", {
  scoped: RpcClient.make(ProjectsRPCContract),
  dependencies: [RPCProtocol],
}) {}
