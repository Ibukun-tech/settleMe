import { Router } from "express";
import validate from "../../../common/middleware/validate.js";
import { authenticate } from "../../../common/middleware/authenticate.js";
import {
  createProfileDto,
  getProfileByIdDto,
  updateProfileDto,
} from "../validator/user.dto.js";
import {
  createProfile,
  getProfile,
  getProfileById,
  updateProfile,
} from "../controller/user.controller.js";

const router = Router();

router.post(
  "/create-profile",
  authenticate,
  validate(createProfileDto),
  createProfile,
);
router.patch(
  "/update-profile",
  authenticate,
  validate(updateProfileDto),
  updateProfile,
);
router.get("/profile", authenticate, getProfile);
router.get(
  "/profiles/:id",
  authenticate,
  validate(getProfileByIdDto, "params"),
  getProfileById,
);
export default router;
