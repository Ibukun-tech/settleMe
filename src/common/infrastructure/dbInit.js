import { SequelizeProvider } from "./DatabaseClassProvider.js";
import { POSTGRES_TRIGGER_NOTIFY } from "./postgresScript.js";
import config from "../config/index.js";
import logger from "../logger/logger.js";

const db = new SequelizeProvider(logger);

export const initializeDatabase = async () => {
  try {
    await db.connect();
    logger.info("Infrastructure: Database connection established");
    await db.sync({ alter: config.app.isDev });
    logger.info(`Infrastructure: Models synced (alter: its altered)`);
    if (db.getDialect() === "postgres") {
      await db.executeRaw(POSTGRES_TRIGGER_NOTIFY.sql);
      logger.info("Infrastructure: Postgres triggers verified");
    }
    await db.startListenerSSE();
  } catch (err) {
    logger.error({ err }, "Infrastructure: Database initialization failed");
    throw err;
  }
};

export default db;
