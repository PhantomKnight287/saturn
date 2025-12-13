import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { Layer } from "effect";

// Choose which protocol to use
export const ProtocolLive = RpcClient.layerProtocolHttp({
  url: "http://localhost:5000/rpc",
}).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson]));
