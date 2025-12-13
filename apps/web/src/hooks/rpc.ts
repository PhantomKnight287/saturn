"use client";

import { Rpc, RpcGroup } from "@effect/rpc";
import { RpcClient } from "@effect/rpc";
import { Effect, Runtime } from "effect";
import { useMemo } from "react";
import { RPCProtocol } from "@/rpc-client/protocol";

/**
 * Hook to get an RPC client for a given contract.
 *
 * @template Contract - The RPC contract type
 * @param contract - The RPC contract instance
 * @returns The RPC client for the contract
 *
 * @example
 * ```tsx
 * const client = useRPCClient(ProjectsRPCContract);
 * const result = yield* client.CreateProject({ name: "My Project" });
 * ```
 */
export function useRPCClient<T extends RpcGroup.RpcGroup<Rpc.Any>>(
  contract: T
) {
  return useMemo(
    () => {
      const effect = Effect.gen(function* () {
        return yield* Effect.scoped(RpcClient.make(contract));
      }).pipe(Effect.provide(RPCProtocol))
      
      return Runtime.runSync(Runtime.defaultRuntime)(effect);
    },
    [contract]
  );
}
