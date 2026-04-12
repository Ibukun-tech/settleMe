import userRepository from "../../repository/user.repository.js";
import logger from "../../../common/logger/logger.js";
import {
  ConflictError,
  NotFoundError,
  InternalError,
  BadRequestError,
  ForbiddenError,
} from "../../../common/middleware/error.js";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import crypto from "crypto";

class UserService {
  constructor() {
    this.userRepository = userRepository;
    this.logger = logger;
  }
  async handleErrors(fn) {
    try {
      return await fn();
    } catch (error) {
      if (
        error instanceof ConflictError ||
        error instanceof NotFoundError ||
        error instanceof BadRequestError ||
        error instanceof ForbiddenError
      ) {
        throw error;
      }
      this.logger.error(`Unexpected error in UserService: ${error}`);
      throw new InternalError("An unexpected error occurred");
    }
  }

  async createProfile(getUser, dto) {
    return await this.handleErrors(async () => {
      this.logger.info("Creating profile with data", { getUser, dto });
      const { firstName, lastName, phoneNumber } = dto;
      const { id: userId, email } = getUser;
      const user = await this.userRepository.findByIdWithProfile(userId, {});

      if (!user) {
        throw new NotFoundError("User not found");
      }
      if (user?.Profile) {
        throw new ConflictError("Profile already exists for this user");
      }
      const parsedPhone = await this.parsePhoneNumber(phoneNumber);
      const phoneTaken =
        await this.userRepository.findProfileByPhone(parsedPhone);
      if (phoneTaken) {
        throw new ConflictError(
          "This phone number is already associated with another account",
        );
      }
      let smeTag;
      for (let attempt = 0; attempt < 5; attempt++) {
        // THis will be a problem if we have a lot of users with the same first name but we can come back to it later and also
        // it will be hitting my database everytime what of if we have 20,000,000 users this will not scale at all
        const candidate = this.generateSmeTag(firstName);
        try {
          const tagExists =
            await this.userRepository.findProfileByTag(candidate);
          if (!tagExists) {
            smeTag = candidate;
            break;
          }
        } catch (error) {
          this.logger.error(`Error checking SME tag uniqueness: ${error}`);
        }
      }
      if (!smeTag) {
        this.logger.error(
          `Failed to generate unique SME tag for user ${userId}`,
        );
      }
      const profile = await this.userRepository.createProfile(userId, {
        first_name: firstName,
        last_name: lastName,
        phone_number: parsedPhone,
        sme_tag: smeTag,
      });
      this.logger.debug(profile, "Created profile");
      return {
        message: "Profile created successfully",
        data: {
          id: profile?.id,
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          phone_number: profile?.phone_number,
          avatar_url: profile?.avatar_url,
          sme_tag: profile?.sme_tag,
          created_at: profile?.created_at,
        },
      };
    });
  }
  async getProfile(getUser) {
    return await this.handleErrors(async () => {
      this.logger.info(`Fetching profile for user`, { getUser });
      const { id: userId } = getUser;
      const user = await this.userRepository.findByIdWithProfile(userId);

      if (!user) {
        throw new NotFoundError("User not found");
      }
      if (!user?.Profile) {
        throw new NotFoundError("Profile not found");
      }

      const profile = user?.Profile;
      this.logger.info(`Profile fetched successfully for user ${userId}`, {
        profile,
      });
      return {
        message: "Profile fetched successfully",
        data: {
          id: profile?.id,
          email: user.email,
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          phone_number: profile?.phone_number,
          avatar_url: profile?.avatar_url,
          sme_tag: profile?.sme_tag,
        },
      };
    });
  }
  async updateProfile(dto, getUser) {
    return await this.handleErrors(async () => {
      this.logger.info(`Updating profile for user`, { getUser, dto });
      const { id: userId, email } = getUser;
      const user = await this.userRepository.findByIdWithProfile(userId, {});

      const payload = {};
      if (!user) {
        throw new NotFoundError("User not found");
      }
      const profile = user?.Profile;
      if (dto.firstName !== undefined) payload.first_name = dto.firstName;
      if (dto.lastName !== undefined) payload.last_name = dto.lastName;
      if (dto.phoneNumber !== undefined) {
        const parsedPhone = await this.parsePhoneNumber(dto.phoneNumber);
        const phoneTaken =
          await this.userRepository.findProfileByPhone(parsedPhone);
        if (phoneTaken && phoneTaken.user_id !== userId) {
          throw new ConflictError("This phone number is already taken");
        }
        payload.phone_number = parsedPhone;
      }
      if (dto.smeTag !== undefined) {
        if (profile.sme_tag !== null) {
          throw new BadRequestError("Tag cannot be changed once set");
        }
        const tagTaken = await this.userRepository.findProfileByTag(dto.smeTag);
        if (tagTaken) throw new ConflictError("This tag is already taken");
        payload.sme_tag = dto.smeTag.toLowerCase();
      }
      await this.userRepository.updateProfile(profile?.id, payload);

      const updatedProfile = await this.userRepository.findProfileById(
        profile?.id,
      );
      this.logger.info(`Profile updated successfully for user ${userId}`);
      return {
        message: "Profile updated successfully",
        id: updatedProfile?.id,
        first_name: updatedProfile?.first_name,
        last_name: updatedProfile?.last_name,
        phone_number: updatedProfile?.phone_number,
        avatar_url: updatedProfile?.avatar_url,
        sme_tag: updatedProfile?.sme_tag,
      };
    });
  }
  async getProfileById(profileId) {
    return await this.handleErrors(async () => {
      this.logger.info(`Fetching profile by ID: ${profileId}`);
      const profile = await this.userRepository.findProfileById(profileId);
      if (!profile) {
        throw new NotFoundError("Profile not found");
      }
      this.logger.info(`Profile fetched successfully for ID: ${profileId}`, {
        profile,
      });
      return {
        message: "Profile fetched successfully",
        data: {
          id: profile?.id,
          email: profile?.User?.email,
          first_name: profile?.first_name,
          last_name: profile?.last_name,
          phone_number: profile?.phone_number,
          avatar_url: profile?.avatar_url,
          sme_tag: profile?.sme_tag,
          is_verified: profile?.User?.is_verified,
        },
      };
    });
  }
  generateSmeTag(firstName) {
    this.logger.debug(`Generating SME tag for first name: ${firstName}`);
    if (!firstName || typeof firstName !== "string") return null;
    // This is not the best way to go about it but still coming back to it later
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let suffix = "";
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(crypto.randomInt(0, chars.length));
    }
    return `${firstName.toLowerCase()}_${suffix}`;
  }
  async parsePhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== "string") return null;
    const cleaned = phoneNumber.replace(/[\s\-]/g, "");
    let parsed;
    try {
      parsed = parsePhoneNumberFromString(cleaned, "NG");
      if (parsed?.isValid()) return parsed?.number;
    } catch (error) {
      this.logger.error(`Error parsing phone number: ${error}`);
    }

    if (cleaned.startsWith("0")) {
      try {
        const ngNumber = parsePhoneNumberFromString(
          `+234${cleaned.slice(1)}`,
          "NG",
        );
        if (ngNumber?.isValid()) return ngNumber?.number;
      } catch (error) {
        this.logger.error(`Error parsing phone number: ${error}`);
      }
    }
    return null;
  }
}
export default new UserService();
