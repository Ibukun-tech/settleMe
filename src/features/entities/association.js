export const initAssociations = (models) => {
  const { User, Profile, Debt, Repayment, Otp, Notification } = models;

  User.hasOne(Profile, { foreignKey: "user_id", onDelete: "CASCADE" });
  Profile.belongsTo(User, { foreignKey: "user_id" });

  User.hasMany(Otp, { foreignKey: "user_id", onDelete: "CASCADE" });
  Otp.belongsTo(User, { foreignKey: "user_id" });

  Profile.hasMany(Debt, { foreignKey: "lender_id", as: "debts_as_lender" });
  Profile.hasMany(Debt, { foreignKey: "borrower_id", as: "debts_as_borrower" });
  Debt.belongsTo(Profile, { foreignKey: "lender_id", as: "lender" });
  Debt.belongsTo(Profile, { foreignKey: "borrower_id", as: "borrower" });

  Debt.hasMany(Repayment, { foreignKey: "debt_id", onDelete: "CASCADE" });
  Repayment.belongsTo(Debt, { foreignKey: "debt_id" });

  Profile.hasMany(Repayment, {
    foreignKey: "recorded_by",
    as: "recorded_repayments",
  });
  Repayment.belongsTo(Profile, { foreignKey: "recorded_by", as: "recorder" });

  Profile.hasMany(Notification, {
    foreignKey: "profile_id",
    onDelete: "CASCADE",
  });
  Debt.hasMany(Notification, {
    foreignKey: "reference_id",
    onDelete: "CASCADE",
  });

  Notification.belongsTo(Profile, { foreignKey: "profile_id" });
  Notification.belongsTo(Debt, {
    foreignKey: "reference_id",
    // constraints: false,
  });
};
