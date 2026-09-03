import { models } from "../../entities/index.js";
import db from "../../../common/infrastructure/dbInit.js";
const { Notification } = models;

class NotificationRepository {
  async getUnread(profileId) {
    return await Notification.findAll({
      where: { profile_id: profileId, is_read: false },
      order: [["created_at", "ASC"]],
    });
  }

  async markRead(notificationId, profileId) {
    const [updated] = await Notification.update(
      { is_read: true },
      { where: { id: notificationId, profile_id: profileId } },
    );
    return updated > 0;
  }
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
    return await db.instance.transaction(async (transaction) => {
      await this.create(borrowerData, transaction);
      await this.create(lenderData, transaction);
    });
  }
  async storeSingleNotification(data) {
    return await db.instance.transaction(async (transaction) => {
      await this.create(data, transaction);
    });
  }
  async storeBatch(dataArray) {
    return await db.instance.transaction(async (transaction) => {
      for (const data of dataArray) {
        await this.create(data, transaction);
      }
    });
  }
}

export default new NotificationRepository();
