import { sequelize } from "../../common/infrastructure/database.js";
import { DataTypes } from "sequelize";

import { User } from "./user.entity.js";
import { Profile } from "./profile.entity.js";
import { Debt } from "./debt.entity.js";
import { Repayment } from "./repayment.entity.js";
import { Otp } from "./otp.entity.js";
import { Notification } from "./notification.entity.js";
import { initAssociations } from "./association.js";
const models = {
  User: User(sequelize, DataTypes),
  Profile: Profile(sequelize, DataTypes),
  Debt: Debt(sequelize, DataTypes),
  Repayment: Repayment(sequelize, DataTypes),
  Otp: Otp(sequelize, DataTypes),
  Notification: Notification(sequelize, DataTypes),
};

initAssociations(models);

export { models };
