import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { Layer } from "effect";

const RPCProtocol = RpcClient.layerProtocolHttp({
  url: "http://localhost:5000/rpc",
}).pipe(
  Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson,])
) as unknown as Layer.Layer<RpcClient.Protocol, never, never>;

export { RPCProtocol };
