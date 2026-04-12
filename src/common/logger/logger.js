import { pino } from "pino";
import config from "../config/index.js";

const logger = pino({
  level: config.app.isDev ? "debug" : "info",
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
