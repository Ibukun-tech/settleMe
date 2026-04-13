import app from "./app.js";
import { connectQueue } from "./common/infrastructure/queue.js";
import { connectDatabase } from "./common/infrastructure/database.js";
import logger from "./common/logger/logger.js";
import { startConsumer } from "./module/ledger/worker/consumer.js";
// import { models } from "./features/entities/index.js";
const startServer = async () => {
  try {
    await connectDatabase();
    await connectQueue();
    await startConsumer();
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (err) {}
};

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled rejection");
  process.exit(1);
});

startServer();
