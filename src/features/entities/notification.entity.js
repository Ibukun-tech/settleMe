import {
  NOTIFICATION_TYPE,
  NOTIFICATION_REFERENCE_TYPE,
} from "../commonFeature/index.js";
export const Notification = (sequelize, DataTypes) => {
  return sequelize.define(
    "Notification",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      profile_id: { type: DataTypes.UUID, allowNull: false },
      type: {
        type: DataTypes.ENUM(...Object.values(NOTIFICATION_TYPE)),
        allowNull: false,
      },
      message: { type: DataTypes.TEXT, allowNull: false },
      is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
      reference_id: { type: DataTypes.UUID, allowNull: false },
      reference_type: {
        type: DataTypes.ENUM(...Object.values(NOTIFICATION_REFERENCE_TYPE)),
        allowNull: false,
      },
    },
    {
      tableName: "notifications",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );
};
