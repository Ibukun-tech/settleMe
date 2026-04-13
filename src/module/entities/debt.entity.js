import { DataTypes } from "sequelize";
import { sequelize } from "../../common/infrastructure/database.js";
import { DEBT_STATUS } from "../ledger/enum/debt.enum.js";

export const Debt = (sequelize, DataTypes) => {
  return sequelize.define(
    "Debt",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      lender_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      borrower_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      due_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(...Object.values(DEBT_STATUS)),
        defaultValue: DEBT_STATUS.PENDING_CONFIRMATION,
        allowNull: false,
      },
    },
    {
      tableName: "debts",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );
};
