import { FetchHttpClient } from "@effect/platform";
import { RpcClient, RpcSerialization } from "@effect/rpc";
import { Layer } from "effect";

// Choose which protocol to use
export const ProtocolLive = RpcClient.layerProtocolHttp({
  url: "http://localhost:5000/rpc",
}).pipe(Layer.provide([FetchHttpClient.layer, RpcSerialization.layerNdjson])) as  Layer.Layer<RpcClient.Protocol, never, never> // overriding the type of this layer because effect complains about HttpClient which is passed in FetchHttpClient.layer
