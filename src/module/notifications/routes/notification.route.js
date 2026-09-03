import { Router } from "express";
import { authenticate } from "../../../common/middleware/authenticate.js";
// import { sseClients } from "../../../common/infrastructure/pgListener.js";
import db from "../../../common/infrastructure/dbInit.js";
// import notificationService from "../service/notification.service.js";
import logger from "../../../common/logger/logger.js";
import notificationService from "../repository/notification.repository.js";
import userRepository from "../../user/repository/user.repository.js";
const notificationRouter = Router();

// GET /api/v1/notifications/stream — SSE endpoint
notificationRouter.get("/stream", authenticate, async (req, res) => {
  const userId = req.user.id;

  const user = await userRepository.findByIdWithProfile(userId);
  const profileId = user?.Profile?.id ?? null;

  // Set SSE headers AFTER auth passes
  //   This will be configured has a middlware
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Register this connection
  if (!db.sseClients.has(profileId)) {
    db.sseClients.set(profileId, new Set());
  }
  db.sseClients.get(profileId).add(res);
  logger.info({ profileId }, "SSE: client connected");

  // Flush unread notifications immediately
  try {
    const unread = await notificationService.getUnread(profileId);
    for (const notification of unread) {
      logger.info(
        { profileId, notificationId: notification.id },
        "SSE: flushing unread notification",
      );
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    }
  } catch (err) {
    logger.error(
      { err, profileId },
      "SSE: failed to flush unread notifications",
    );
  }

  // Heartbeat every 30s to keep connection alive through proxies
  //   const heartbeat = setInterval(() => {
  //     try {
  //       res.write(": heartbeat\n\n");
  //     } catch (err) {
  //       logger.error({ err }, "SSE: heartbeat write failed");
  //     }
  //   }, 30000);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    const connections = sseClients.get(profileId);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        sseClients.delete(profileId);
      }
    }
    logger.info({ profileId }, "SSE: client disconnected");
  });
});

// PATCH /api/v1/notifications/:id/read
notificationRouter.patch("/:id/read", authenticate, async (req, res, next) => {
  try {
    const profileId = req.user.id;
    const updated = await notificationService.markRead(
      req.params.id,
      profileId,
    );
    if (!updated) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.status(200).json({ message: "Notification marked as read" });
  } catch (err) {
    next(err);
  }
});

export default notificationRouter;
