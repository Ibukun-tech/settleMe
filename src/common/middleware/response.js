import config from "../config/index.js";

class ApiResponse {
  static ok(res, data = null, message = "Success") {
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message,
      ...(data !== null && { data }),
    });
  }

  static created(res, data = null, message = "Resource created successfully") {
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message,
      ...(data !== null && { data }),
    });
  }

  static noContent(res) {
    return res.status(204).send();
  }

  static error(res, statusCode, message, details = null, stack = null) {
    return res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      ...(details !== null && { details }),
      ...(config.app.isDev && stack && { stack }),
    });
  }
}

export default ApiResponse;
