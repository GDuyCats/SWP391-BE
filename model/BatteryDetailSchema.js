// models/batteryDetail.model.js
import { DataTypes } from "sequelize";

export const createBatteryDetailModel = (sequelize) => {
  const BatteryDetail = sequelize.define(
    "BatteryDetail",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      postId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Posts", key: "id" },
        onDelete: "CASCADE",
      },

      // Thông tin pin bán rời
      battery_brand: { type: DataTypes.STRING },
      battery_model: { type: DataTypes.STRING },
      battery_capacity: { type: DataTypes.FLOAT },
      battery_type: { type: DataTypes.STRING },
      battery_condition: { type: DataTypes.STRING },
      compatible_models: { type: DataTypes.ARRAY(DataTypes.STRING) }, // Postgres OK
    },
    {
      tableName: "BatteryDetails",
    }
  );

  return BatteryDetail;
};
