import { models } from "../entities/index.js";
// import {se}
import { sequelize } from "../../common/infrastructure/database.js";
const { Notification } = models;

class NotificationRepository {
  async findByReferenceAndType(profileId, referenceId, type) {
    return await Notification.findOne({
      where: { profile_id: profileId, reference_id: referenceId, type },
    });
  }

  async createWithoutTransaction(data) {
    return await Notification.create(data);
  }
  async create(data, transaction) {
    return await Notification.create(data, { transaction });
  }
  async storeNotifications(borrowerData, lenderData) {
    return await sequelize.transaction(async (transaction) => {
      await this.create(borrowerData, transaction);
      await this.create(lenderData, transaction);
    });
  }
  async storeSingleNotification(data) {
    return await sequelize.transaction(async (transaction) => {
      await this.create(data, transaction);
    });
  }
  async storeBatch(dataArray) {
    return await sequelize.transaction(async (transaction) => {
      for (const data of dataArray) {
        await this.create(data, transaction);
      }
    });
  }
}

export default new NotificationRepository();
