import { Sequelize } from "sequelize";
import config from "../config/index.js";
import pg from "pg";
const { Client } = pg;

// import logger from "../logger/logger.js";
export class SequelizeProvider {
  constructor(logger) {
    this.logger = logger;
    this.instance = new Sequelize(config.db.url, {
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
    this.isShuttingDown = false;
    this.retryDelay = 1000;
    this.MAX_RETRY_DELAY = 30000;
    this.sseDedicatedLine = new Client({ connectionString: config.db.url });
    this.sseClients = new Map();
  }

  async connect() {
    await this.instance.authenticate();
  }

  async sync(options = {}) {
    await this.instance.sync(options);
  }

  async executeRaw(sql) {
    return this.instance.query(sql);
  }

  getDialect() {
    return this.instance.getDialect();
  }
  connectSSENotification() {
    this.sseDedicatedLine.on("notification", (msg) => {
      try {
        const payload = JSON.parse(msg.payload);
        const profileId = payload.profile_id;
        if (profileId) {
          this.sendToUser(profileId, payload);
        }
      } catch (err) {
        logger.error(
          { err },
          "pgListener: failed to parse notification payload",
        );
      }
    });
  }
  connectSSEError() {
    this.sseDedicatedLine.on("error", (err) => {
      this.logger.error({ err }, "pgListener: client error");
    });
  }
  connectSSEEnd() {
    this.sseDedicatedLine.on("end", () => {
      if (isShuttingDown) return;
      this.logger.warn(
        `pgListener: connection ended — retrying in ${retryDelay}ms`,
      );
      setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
        connect();
      }, retryDelay);
    });
  }
  async connectSSE() {
    if (this.isShuttingDown) return;
    try {
      await this.sseDedicatedLine.connect();
      this.retryDelay = 1000; // reset on successful connect
      this.logger.info(
        "pgListener: connected and listening on notifications_channel",
      );

      this.logger.info(
        await this.sseDedicatedLine.query("LISTEN notifications_channel"),
      );
    } catch (err) {
      this.logger.error(
        { err },
        `pgListener: connection failed — retrying in ${retryDelay}ms`,
      );
      setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
        connect();
      }, retryDelay);
    }
  }

  async startListenerSSE() {
    await this.connectSSE();
  }

  async shutdownListener() {
    this.isShuttingDown = true;
    for (const [profileId, connections] of this.sseClients.entries()) {
      for (const res of connections) {
        try {
          res.write("event: shutdown\ndata: server shutting down\n\n");
          res.end();
        } catch (_) {}
      }
    }
    this.sseClients.clear();

    if (this.sseDedicatedLine) {
      try {
        await this.sseDedicatedLine.end();
        this.logger.info("pgListener: client disconnected cleanly");
      } catch (err) {
        this.logger.error(
          { err },
          "pgListener: error during client disconnect",
        );
      }
    }
  }

  sendToUser(profileId, data) {
    const connections = sseClients.get(profileId);
    if (!connections || connections.size === 0) return;
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of connections) {
      try {
        res.write(payload);
      } catch (err) {
        logger.error(
          { err, profileId },
          "pgListener: failed to write to SSE client",
        );
      }
    }
  }
}
