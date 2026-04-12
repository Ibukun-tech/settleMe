export const Profile = (sequelize, DataTypes) => {
  return sequelize.define(
    "Profile",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: { type: DataTypes.UUID, allowNull: false, unique: true },
      first_name: { type: DataTypes.STRING, allowNull: true },
      last_name: { type: DataTypes.STRING, allowNull: true },
      phone_number: { type: DataTypes.STRING, unique: true },
      avatar_url: { type: DataTypes.STRING, allowNull: true },
      sme_tag: { type: DataTypes.STRING, allowNull: true, unique: true },
    },
    {
      tableName: "profiles",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  );
};
