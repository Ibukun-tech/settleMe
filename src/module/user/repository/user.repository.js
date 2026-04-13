import { models } from "../../entities/index.js";
const { Profile, User } = models;
class UserRepository {
  async findById(id, options = {}) {
    return await User.findOne({ where: { id }, ...options });
  }
  async findByIdWithProfile(id) {
    return await User.findOne({
      where: { id },
      attributes: ["id", "email", "is_verified"],
      include: [{ model: Profile }],
    });
  }
  async createProfile(userId, data) {
    return await Profile.create({ user_id: userId, ...data });
  }

  async findProfileByUserId(userId, options = {}) {
    return await Profile.findOne({ where: { user_id: userId }, ...options });
  }

  async updateProfile(userId, data) {
    const [affectedRows] = await Profile.update(data, {
      where: { user_id: userId },
    });
    return affectedRows > 0;
  }

  async findProfileByPhone(phoneNumber) {
    return await Profile.findOne({ where: { phone_number: phoneNumber } });
  }

  async findProfileByTag(smeTag) {
    return await Profile.findOne({ where: { sme_tag: smeTag } });
  }
  async findProfileById(profileId) {
    return await Profile.findOne({
      where: { id: profileId },
      include: [{ model: User, attributes: ["is_verified"] }],
    });
  }
}

export default new UserRepository();
