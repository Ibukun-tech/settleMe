import { Sequelize } from "sequelize";
import config from "../config/index.js";
import logger from "../logger/logger.js";
export const sequelize = new Sequelize(config.db.url, {
  dialect: "postgres",
  logging: config.app.isDev
    ? (sql) => logger.debug({ sql }, "Database query")
    : false,
  dialectOptions: {
    ssl: config.app.isDev
      ? false
      : { require: true, rejectUnauthorized: false },
  },
  pool: {
    max: config.db.db_pool_max,
    min: config.db.db_pool_min,
    acquire: config.db.db_pool_acquire,
    idle: config.db.db_pool_idle,
  },
});

export const connectDatabase = async () => {
  try {
    await sequelize.authenticate();
    logger.info("Database connection established");
    // initAssociations();
    await sequelize.sync({ alter: config.app.isDev });
    logger.info("Database models synced");
  } catch (err) {
    logger.error({ err }, "Database connection failed");
    process.exit(1);
  }
};
