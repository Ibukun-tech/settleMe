import { Op } from "sequelize";
import { models } from "../../entities/index.js";
const { Debt, Profile, Repayment } = models;
class DebtRepository {
  async create(data) {
    return await Debt.create(data);
  }
  async findUserDebts(profileId, filters = {}) {
    const where = {
      [Op.or]: [{ lender_id: profileId }, { borrower_id: profileId }],
    };
    if (filters.status) {
      where.status = filters.status;
    }
    return await Debt.findAll({ where, order: [["created_at", "DESC"]] });
  }
  async findByDebtId(debtId) {
    return await Debt.findByPk(debtId, {
      include: [
        {
          model: Profile,
          as: "lender",
          attributes: [
            "id",
            "first_name",
            "last_name",
            "sme_tag",
            "avatar_url",
          ],
        },
        {
          model: Profile,
          as: "borrower",
          attributes: [
            "id",
            "first_name",
            "last_name",
            "sme_tag",
            "avatar_url",
          ],
        },
        {
          model: Repayment,
        },
      ],
    });
  }
  async updateDebit(debitId, data) {
    const [affectedRows] = await Debt.update(data, {
      where: { id: debitId },
    });
    return affectedRows > 0;
  }

  async findByIdWithLock(debtId, transaction) {
    return await Debt.findByPk(debtId, { lock: true, transaction });
  }
  async updateStatusWithOutTransaction(debtId, status) {
    console.log(status);
    const [affectedRows] = await Debt.update(
      { ...status },
      { where: { id: debtId } },
    );
    return affectedRows > 0;
  }
  async updateStatus(debtId, status, transaction) {
    const [affectedRows] = await Debt.update(
      { status },
      { where: { id: debtId }, transaction },
    );
    return affectedRows > 0;
  }
}

export default new DebtRepository();
