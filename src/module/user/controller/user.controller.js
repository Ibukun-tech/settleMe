import userService from "../service/user.service.js";
import ApiResponse from "../../../common/middleware/response.js";

export const createProfile = async (req, res) => {
  try {
    const { message, data } = await userService.createProfile(
      req.user,
      req.body,
    );
    return ApiResponse.created(res, data, message);
  } catch (error) {
    throw error;
  }
};

export const getProfile = async (req, res) => {
  try {
    const { message, data } = await userService.getProfile(req.user);
    return ApiResponse.ok(res, data, message);
  } catch (error) {
    throw error;
  }
};

export const getProfileById = async (req, res) => {
  try {
    const { message, data } = await userService.getProfileById(req.params.id);
    return ApiResponse.ok(res, data, message);
  } catch (error) {
    throw error;
  }
};
export const updateProfile = async (req, res) => {
  try {
    const { message, data } = await userService.updateProfile(
      req.body,
      req.user,
    );
    return ApiResponse.ok(res, data, message);
  } catch (error) {
    throw error;
  }
};
