// models/vehicleDetail.model.js
import { DataTypes } from "sequelize";

export const createVehicleDetailModel = (sequelize) => {
  const VehicleDetail = sequelize.define(
    "VehicleDetail",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      postId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Posts", key: "id" },
        onDelete: "CASCADE",
      },

      // Thông tin xe
      brand: { type: DataTypes.STRING },
      model: { type: DataTypes.STRING },
      year: { type: DataTypes.INTEGER },
      mileage: { type: DataTypes.FLOAT },
      condition: { type: DataTypes.STRING },

      // Thông tin pin đi kèm xe
      battery_brand: { type: DataTypes.STRING },
      battery_model: { type: DataTypes.STRING },
      battery_capacity: { type: DataTypes.FLOAT },
      battery_type: { type: DataTypes.STRING },
      battery_range: { type: DataTypes.FLOAT },
      battery_condition: { type: DataTypes.STRING },
      charging_time: { type: DataTypes.FLOAT },
    },
    {
      tableName: "VehicleDetails",
    }
  );

  return VehicleDetail;
};
