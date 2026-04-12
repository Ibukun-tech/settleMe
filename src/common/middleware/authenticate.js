import { AuthenticationError } from "./error.js";
import config from "../config/index.js";
import jwt from "jsonwebtoken";
import logger from "../logger/logger.js";
const decodeToken = (token) => {
  try {
    logger.debug(jwt.verify(token, config.jwt.secret), "Decoding token");
    return jwt.verify(token, config.jwt.secret);
  } catch (e) {
    logger.error({ error: e }, "Token verification failed");
    return null;
  }
};
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AuthenticationError("No token provided");
    }

    const token = authHeader.split(" ")[1];
    logger.debug({ token }, "Extracted token from header");
    const decoded = decodeToken(token);
    logger.info(decoded, "Decoded token");
    if (!decoded) {
      throw new AuthenticationError("Invalid or expired token");
    }

    req.user = { id: decoded.sub, email: decoded.email };
    next();
  } catch (error) {
    logger.error({ error }, "Authentication failed");
    next(error);
  }
};
