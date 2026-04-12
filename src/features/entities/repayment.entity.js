import { REPAYMENT_STATUS } from "../commonFeature/index.js";

export const Repayment = (sequelize, DataTypes) => {
  return sequelize.define(
    "Repayment",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      debt_id: { type: DataTypes.UUID, allowNull: false },
      recorded_by: { type: DataTypes.UUID, allowNull: false },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: { min: 1 },
      },
      status: {
        type: DataTypes.ENUM(...Object.values(REPAYMENT_STATUS)),
        defaultValue: REPAYMENT_STATUS.PENDING_CONFIRMATION,
        allowNull: false,
      },
    },
    {
      tableName: "repayments",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    },
  );
};
