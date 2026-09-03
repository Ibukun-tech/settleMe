import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
const exporter = new OTLPTraceExporter({
  url: "http://localhost:4318/v1/traces",
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || "settleMe",
    [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || "1.0.0",
  }),
  traceExporter: exporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
});

try {
  sdk.start();
  console.log("[otel] Tracing initialized successfully");
} catch (err) {
  console.error(
    "[otel] Failed to initialize tracing — app will continue without it:",
    err.message,
  );
}

process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("[otel] Tracing shut down cleanly"))
    .catch((err) =>
      console.error("[otel] Error shutting down tracing:", err.message),
    )
    .finally(() => process.exit(0));
});

process.on("SIGINT", () => {
  sdk
    .shutdown()
    .then(() => console.log("[otel] Tracing shut down cleanly"))
    .catch((err) =>
      console.error("[otel] Error shutting down tracing:", err.message),
    )
    .finally(() => process.exit(0));
});
