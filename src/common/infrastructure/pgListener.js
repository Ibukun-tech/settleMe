// import pg from "pg";
// import config from "../config/index.js";
// import logger from "../logger/logger.js";

// const { Client } = pg;

// // Map<profileId, Set<res>>
// export const sseClients = new Map();

// let client = null;
// let isShuttingDown = false;
// let retryDelay = 1000;
// const MAX_RETRY_DELAY = 30000;

// const sendToUser = (profileId, data) => {
//   const connections = sseClients.get(profileId);
//   if (!connections || connections.size === 0) return;
//   const payload = `data: ${JSON.stringify(data)}\n\n`;
//   for (const res of connections) {
//     try {
//       res.write(payload);
//     } catch (err) {
//       logger.error(
//         { err, profileId },
//         "pgListener: failed to write to SSE client",
//       );
//     }
//   }
// };

// const connect = async () => {
//   if (isShuttingDown) return;

//   client = new Client({ connectionString: config.db.url });

//   client.on("error", (err) => {
//     logger.error({ err }, "pgListener: client error");
//   });

//   client.on("end", () => {
//     if (isShuttingDown) return;
//     logger.warn(`pgListener: connection ended — retrying in ${retryDelay}ms`);
//     setTimeout(() => {
//       retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
//       connect();
//     }, retryDelay);
//   });

//   try {
//     await client.connect();
//     retryDelay = 1000; // reset on successful connect
//     logger.info("pgListener: connected and listening on notifications_channel");

//     await client.query("LISTEN notifications_channel");

//     client.on("notification", (msg) => {
//       try {
//         const payload = JSON.parse(msg.payload);
//         const profileId = payload.profile_id;
//         if (profileId) {
//           sendToUser(profileId, payload);
//         }
//       } catch (err) {
//         logger.error(
//           { err },
//           "pgListener: failed to parse notification payload",
//         );
//       }
//     });
//   } catch (err) {
//     logger.error(
//       { err },
//       `pgListener: connection failed — retrying in ${retryDelay}ms`,
//     );
//     setTimeout(() => {
//       retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
//       connect();
//     }, retryDelay);
//   }
// };

// export const startListener = async () => {
//   await connect();
// };

// export const shutdownListener = async () => {
//   isShuttingDown = true;

//   // Close all open SSE connections
//   for (const [profileId, connections] of sseClients.entries()) {
//     for (const res of connections) {
//       try {
//         res.write("event: shutdown\ndata: server shutting down\n\n");
//         res.end();
//       } catch (_) {}
//     }
//   }
//   sseClients.clear();

//   if (client) {
//     try {
//       await client.end();
//       logger.info("pgListener: client disconnected cleanly");
//     } catch (err) {
//       logger.error({ err }, "pgListener: error during client disconnect");
//     }
//   }
// };
