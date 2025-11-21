import { UserModel } from "../postgres/postgres.js";
import bcrypt from "bcryptjs";

/**
 * Các field an toàn để expose ra ngoài cho admin UI,
 * dựa theo schema bạn đưa:
 * - KHÔNG trả password
 * - KHÔNG trả refreshToken
 * - KHÔNG trả tokenVersion
 */
const PUBLIC_USER_FIELDS = [
  "id",
  "username",
  "phone",
  "email",
  "avatar",
  "role",
  "isVerified",
  "createdAt",
  "updatedAt",
];

/**
 * GET /users
 * - Dành cho admin (bạn nhớ chặn bằng middleware ở route)
 * - Trả danh sách tất cả users với field public
 */
const getUsers = async (req, res) => {
  try {
    if (!UserModel) {
      throw new Error("UserModel not initialized");
    }

    const users = await UserModel.findAll({
      attributes: PUBLIC_USER_FIELDS,
      order: [["createdAt", "DESC"]],
    });

    if (!users || users.length === 0) {
      return res.status(200).json({
        count: 0,
        users: [],
        message: "There is no user",
      });
    }

    return res.status(200).json({
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("❌ getUsers error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      ...(process.env.NODE_ENV !== "production"
        ? { stack: error.stack }
        : {}),
    });
  }
};

/**
 * GET /users/staff
 * - Chỉ admin mới được gọi (route phải dùng middleware isAdmin)
 * - Trả về danh sách các tài khoản role = "staff"
 */
const getStaffAccounts = async (req, res) => {
  try {
    if (!UserModel) {
      throw new Error("UserModel not initialized");
    }

    const staffList = await UserModel.findAll({
      where: { role: "staff" },
      attributes: PUBLIC_USER_FIELDS,
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      count: staffList.length,
      staff: staffList,
    });
  } catch (error) {
    console.error("❌ getStaffAccounts error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
      ...(process.env.NODE_ENV !== "production"
        ? { stack: error.stack }
        : {}),
    });
  }
};

/**
 * POST /users
 * - Tạo user mới
 * - Hash password trước khi lưu
 */
const createUsers = async (req, res) => {
  const { username, email, password, role, isVerified, phone, avatar } = req.body;

  try {
    // email unique
    const existedByEmail = await UserModel.findOne({ where: { email } });
    if (existedByEmail) {
      return res
        .status(409)
        .json({ message: "The user's email already exists" });
    }

    // username unique
    const existedByUsername = await UserModel.findOne({ where: { username } });
    if (existedByUsername) {
      return res
        .status(409)
        .json({ message: "The username already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const verifiedValue = (role === "admin" || role === "staff") ? true : isVerified;
    await UserModel.create({
      username,
      email,
      phone: phone || null,
      avatar: avatar || null,
      password: hashedPassword,
      role,          // nếu FE cho chọn role (admin/staff/customer)
      isVerified: verifiedValue, // boolean
    });

    return res
      .status(201)
      .json({ message: "The user has been added successfully" });
  } catch (error) {
    console.error("❌ createUsers error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
};

/**
 * PUT /users/:id
 * - Cập nhật user
 * - Nếu trong body có password mới thì hash lại
 * - Các field nhạy cảm như refreshToken, tokenVersion: KHÔNG cho update ở đây
 */
const updateUsers = async (req, res) => {
  const { id } = req.params;

  try {
    // tách body ra để xử lý password riêng
    const { password, refreshToken, tokenVersion, ...rest } = req.body;

    // nếu client cố tình gửi refreshToken/tokenVersion -> bỏ qua
    const updateData = { ...rest };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const [affectedRows] = await UserModel.update(updateData, { where: { id } });

    if (affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res
      .status(200)
      .json({ message: "User updated successfully" });
  } catch (error) {
    console.error("❌ updateUsers error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
};

/**
 * DELETE /users/:id
 */
const deleteUsers = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await UserModel.findOne({ where: { id } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    return res
      .status(200)
      .json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("❌ deleteUsers error:", error);
    return res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
};

/**
 * GET /admin/dashboard
 * - chỉ cho admin (bạn nên gắn isAdmin ở route)
 * - show info token payload
 */
const getAdminDashboard = (req, res) => {
  console.log("✅ Admin đã truy cập vào dashboard");
  console.log("Thông tin user từ token:", req.user);

  return res.json({
    message: "Bạn đã vào được trang admin!",
    user: req.user,
  });
};

export {
  getUsers,
  getStaffAccounts,
  createUsers,
  updateUsers,
  deleteUsers,
  getAdminDashboard,
};
