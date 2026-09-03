// import { sequelize } from "../../common/infrastructure/database.js";
import { DataTypes } from "sequelize";
import dbInstance from "../../common/infrastructure/dbInit.js";
import { User } from "./user.entity.js";
import { Profile } from "./profile.entity.js";
import { Debt } from "./debt.entity.js";
import { Repayment } from "./repayment.entity.js";
import { Otp } from "./otp.entity.js";
import { Notification } from "./notification.entity.js";
import { initAssociations } from "./association.js";
const models = {
  User: User(dbInstance.instance, DataTypes),
  Profile: Profile(dbInstance.instance, DataTypes),
  Debt: Debt(dbInstance.instance, DataTypes),
  Repayment: Repayment(dbInstance.instance, DataTypes),
  Otp: Otp(dbInstance.instance, DataTypes),
  Notification: Notification(dbInstance.instance, DataTypes),
};

initAssociations(models);

export { models };
