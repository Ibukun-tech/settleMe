import { ZodError } from "zod";
import {
  BaseError as SequelizeBaseError,
  UniqueConstraintError,
  ValidationError as SequelizeValidationError,
  ForeignKeyConstraintError,
  DatabaseError,
} from "sequelize";
import ApiResponse from "./response.js";
import logger from "../logger/logger.js";
import config from "../config/index.js";

export class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details = null) {
    super(message, 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "Resource") {
    super(`${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "A conflict occurred with an existing record") {
    super(message, 409);
  }
}

export class UnprocessableError extends AppError {
  constructor(message = "The request could not be processed", details = null) {
    super(message, 422, details);
  }
}
export class BadRequestError extends AppError {
  constructor(message = "Bad request", details = null) {
    super(message, 400, details);
  }
}
export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred") {
    super(message, 500);
  }
}

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    logger.error(
      { err, req: { method: req.method, url: req.url } },
      err.message,
    );
    return ApiResponse.error(
      res,
      err.statusCode,
      err.message,
      err.details,
      err.stack,
    );
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));

    logger.warn(
      { details, req: { method: req.method, url: req.url } },
      "Zod validation failed",
    );

    return ApiResponse.error(res, 400, "Validation failed", details, err.stack);
  }

  if (err instanceof UniqueConstraintError) {
    const field = err.errors?.[0]?.path ?? "field";

    logger.warn(
      { err, req: { method: req.method, url: req.url } },
      "Unique constraint violation",
    );
    return ApiResponse.error(
      res,
      409,
      `A record with this ${field} already exists.`,
      null,
      err.stack,
    );
  }

  if (err instanceof SequelizeValidationError) {
    const details = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));

    logger.warn(
      { details, req: { method: req.method, url: req.url } },
      "Sequelize model validation failed",
    );

    return ApiResponse.error(
      res,
      422,
      "Data validation failed",
      details,
      err.stack,
    );
  }

  if (err instanceof ForeignKeyConstraintError) {
    logger.warn(
      { err, req: { method: req.method, url: req.url } },
      "Foreign key constraint violation",
    );

    return ApiResponse.error(
      res,
      400,
      "A referenced record does not exist.",
      null,
      err.stack,
    );
  }

  if (err instanceof DatabaseError || err instanceof SequelizeBaseError) {
    logger.error(
      { err, req: { method: req.method, url: req.url } },
      "Database error",
    );

    return ApiResponse.error(
      res,
      500,
      "A database error occurred. Please try again later.",
      null,
      err.stack,
    );
  }

  logger.error(
    { err, req: { method: req.method, url: req.url } },
    "Unhandled error",
  );
  return ApiResponse.error(
    res,
    500,
    config.app.isDev ? err.message : "Internal Server Error",
    null,
    err.stack,
  );
};
