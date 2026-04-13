import { OTP_TYPE } from "../auth/enum/otp.enum.js";

export const Otp = (sequelize, DataTypes) => {
  return sequelize.define(
    "Otp",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID, allowNull: false },
      code: { type: DataTypes.STRING(6), allowNull: false },
      type: {
        type: DataTypes.ENUM(...Object.values(OTP_TYPE)),
        allowNull: false,
      },
      is_used: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      expires_at: { type: DataTypes.DATE, allowNull: false },
      used_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    },
    {
      tableName: "otps",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );
};
