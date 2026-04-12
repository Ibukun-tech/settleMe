import { sequelize } from "../../common/infrastructure/database.js"; // add this
import { where } from "sequelize";
import { models } from "../entities/index.js";

const { User, Otp, Profile } = models;

class AuthRepository {
  async findByEmail(email) {
    return await User.findOne({
      where: { email },
      include: [{ model: Profile }],
    });
  }

  async findById(id) {
    return await User.findByPk(id);
  }

  async create(email, passwordHash) {
    return await User.create({
      email,
      password_hash: passwordHash,
      is_verified: false,
    });
  }

  async update(id, data) {
    const [affectedRows] = await User.update(data, { where: { id } });
    return affectedRows > 0;
  }
  async createOtp(userId, code, type, expiresAt) {
    return await Otp.create({
      user_id: userId,
      code,
      type,
      expires_at: expiresAt,
    });
  }
  async verifyOtp(userId, otpId, shouldVerifyUser) {
    return await sequelize.transaction(async (t) => {
      await Otp.update(
        { is_used: true, used_at: new Date() },
        { where: { user_id: userId, id: otpId }, transaction: t },
      );

      if (shouldVerifyUser) {
        await User.update(
          { is_verified: true },
          { where: { id: userId }, transaction: t },
        );
      }
    });
  }
  async findActiveOtp(userId, code, type) {
    return await Otp.findOne({
      where: {
        user_id: userId,
        code,
        type,
        is_used: false,
      },
    });
  }

  async invalidateOtpsByUserAndType(userId, type) {
    await Otp.update(
      { is_used: true, used_at: new Date() },
      { where: { user_id: userId, type, is_used: false } },
    );
  }
  async resetPassword(userId, otpId, newPasswordHash) {
    return await sequelize.transaction(async (t) => {
      await Otp.update(
        { is_used: true, used_at: new Date() },
        { where: { id: otpId, user_id: userId }, transaction: t },
      );
      await User.update(
        { password_hash: newPasswordHash },
        { where: { id: userId }, transaction: t },
      );
    });
  }
}

export default new AuthRepository();
