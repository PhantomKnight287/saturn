"use client";

import { RPCProtocol } from "@/rpc-client/protocol";
import { RpcClient } from "@effect/rpc";
import { ProjectsRPCContract } from "@saturn/contracts";
import { Console, Effect } from "effect";
import { createProject } from "./action";

export default function ProjectsPage() {
  return (
    <>
      <button
        onClick={async () => {
          const d = await createProject();
          console.log(d);
        }}
      >
        Insert
      </button>
    </>
  );
}
