import { trace } from "@opentelemetry/api";

export const attachTraceId = (req, res, next) => {
  const span = trace.getActiveSpan();
  const traceId = span?.spanContext().traceId ?? "no-trace";

  req.traceId = traceId;
  res.setHeader("X-Trace-Id", traceId);
  next();
};
