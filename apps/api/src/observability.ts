import { NodeSdk } from "@effect/opentelemetry";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { Config } from "effect";

const traceExporter = new OTLPTraceExporter({
  url: "https://api.axiom.co/v1/traces",
  headers: {
    Authorization: `Bearer ${process.env["AXIOM_TOKEN"]}`,
    "X-Axiom-Dataset": "saturn",
  },
});

export const NodeSdkLive = NodeSdk.layer(() => ({
  resource: {
    serviceName: "saturn",
  },
  spanProcessor: [new BatchSpanProcessor(traceExporter)],
}));
