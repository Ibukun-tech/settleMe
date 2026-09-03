import { pino } from "pino";
import config from "../config/index.js";

import { trace } from "@opentelemetry/api";

const logger = pino({
  level: config.app.isDev ? "debug" : "info",
  mixin() {
    const span = trace.getActiveSpan();
    const traceId = span?.spanContext().traceId;
    return traceId ? { traceId } : {};
  },
  transport: config.app.isDev
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export default logger;
