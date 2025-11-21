// controller/user.post.controller.js
import { sequelize, UserModel, PostModel, VipPlanModel, BatteryDetailModel, VehicleDetailModel } from "../postgres/postgres.js";
import { UTApi } from "uploadthing/server";
const utapi = new UTApi();
const PHONE_REGEX = /^(?:\+84|0)(?:\d{9,10})$/;

// === Helper ===
function normalizeImages(input) {
  if (input == null) return [];

  // String: thử JSON trước, không được thì thử CSV, cuối cùng là một giá trị đơn
  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return [];

    try {
      const maybe = JSON.parse(s);
      if (Array.isArray(maybe)) {
        return [...new Set(
          maybe.map(v => String(v).trim()).filter(Boolean)
        )];
      }
      // nếu parse ra không phải array => coi như giá trị đơn
      return [s];
    } catch {
      // Không phải JSON: nếu có dấu phẩy => CSV
      if (s.includes(",")) {
        return [...new Set(
          s.split(",").map(v => v.trim()).filter(Boolean)
        )];
      }
      // Chuỗi đơn
      return [s];
    }
  }

  // Array: chuẩn hóa từng phần tử
  if (Array.isArray(input)) {
    return [...new Set(
      input.map(v => String(v).trim()).filter(Boolean)
    )];
  }

  // Các kiểu khác: bỏ qua (giữ hành vi cũ)
  return [];
}

function toBool(v, defaultVal = true) {
  if (v === undefined || v === null) return defaultVal;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(s)) return false;
  if (["true", "1", "yes", "on"].includes(s)) return true;
  return defaultVal;
}

// Chuẩn hoá compatible_models (nhận array | JSON string | CSV string)
function normalizeCompatibleModels(input) {
  if (input == null) return null;

  if (Array.isArray(input)) {
    const arr = input.map(v => String(v).trim()).filter(Boolean);
    return arr.length ? arr : null;
  }

  if (typeof input === "string") {
    const s = input.trim();
    if (!s) return null;

    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) {
        const arr = parsed.map(v => String(v).trim()).filter(Boolean);
        return arr.length ? arr : null;
      }
    } catch {
      const arr = s.split(",").map(v => v.trim()).filter(Boolean);
      return arr.length ? arr : null;
    }

    return [s];
  }

  return null;
}

// ======================================================
// CREATE POST (chỉ tạo; CHƯA hiển thị, CHƯA VIP)
// ======================================================
export const createMyPost = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const {
      title, content, thumbnail, image, price, phone, category,
      // vehicle:
      hasBattery, brand, model, year, mileage, condition,
      // battery (và vehicle nếu hasBattery=true):
      battery_brand, battery_model, battery_capacity, battery_type,
      battery_range, battery_condition, charging_time, compatible_models,
    } = req.body ?? {};

    if (!title?.trim()) return res.status(400).json({ message: "title là bắt buộc" });
    if (!content?.trim()) return res.status(400).json({ message: "content là bắt buộc" });

    // ==== Upload file nếu có ====
    let thumbnailUrl = thumbnail ? String(thumbnail).trim() : null;
    let images = normalizeImages(image);

    // Upload thumbnailFile (1 ảnh)
    const thFile = req.files?.thumbnailFile?.[0];
    if (thFile) {
      const f = new File([thFile.buffer], thFile.originalname, { type: thFile.mimetype });
      const r = await utapi.uploadFiles(f);
      const item = Array.isArray(r) ? r[0] : r;
      if (item?.error) throw new Error(item.error.message || "Upload thumbnail failed");
      thumbnailUrl = item.data?.url ?? null;
    }

    // Upload imageFiles (nhiều ảnh)
    const galFiles = req.files?.imageFiles || [];
    if (galFiles.length) {
      const fs = galFiles.map((x) => new File([x.buffer], x.originalname, { type: x.mimetype }));
      const outs = await utapi.uploadFiles(fs);
      const urls = outs.filter(o => !o.error && o.data?.url).map(o => o.data.url);
      images = [...images, ...urls];
    }

    // ✅ BẮT BUỘC CÓ ẢNH
    if (!thumbnailUrl || !String(thumbnailUrl).trim()) {
      return res.status(400).json({ message: "Bắt buộc phải có ảnh thumbnail" });
    }
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: "Bắt buộc phải có ít nhất 1 ảnh trong danh sách image" });
    }

    // ==== Validate các field khác ====
    const priceNum = Number(price ?? 0);
    if (Number.isNaN(priceNum) || priceNum < 0)
      return res.status(400).json({ message: "price phải là số >= 0" });

    if (phone && !PHONE_REGEX.test(String(phone)))
      return res.status(400).json({ message: "Số điện thoại không hợp lệ (VN)" });

    let planIdToSave = null;
    // if (vipPlanId != null) {
    //   const plan = await VipPlanModel.findOne({ where: { id: vipPlanId, active: true } });
    //   if (!plan)
    //     return res.status(404).json({ message: "Gói VIP không tồn tại hoặc đã bị tắt" });
    //   planIdToSave = plan.id;
    // }

    const finalCategory = ["battery", "vehicle"].includes(category)
      ? category
      : "vehicle";

    // Validate category logic cũ
    if (finalCategory === "vehicle") {
      if (!brand?.trim() || !model?.trim())
        return res.status(400).json({ message: "Xe điện cần có brand và model" });

      const hb = toBool(hasBattery, true); // ép "false" -> false, "0" -> false ...
      if (hb) {
        const missingFields = [];
        if (!battery_brand?.trim()) missingFields.push("battery_brand");
        if (!battery_model?.trim()) missingFields.push("battery_model");
        if (
          battery_capacity == null ||
          Number.isNaN(Number(battery_capacity))
        )
          missingFields.push("battery_capacity");

        if (missingFields.length)
          return res.status(400).json({
            message: `Xe kèm pin thiếu thông tin bắt buộc: ${missingFields.join(", ")}`,
            hint:
              "Vui lòng nhập đầy đủ thông tin pin hoặc đặt hasBattery=false nếu xe thuê pin.",
          });
      }
    } else {
      if (!battery_brand?.trim() || battery_capacity == null)
        return res.status(400).json({
          message: "Pin cần có battery_brand và battery_capacity",
        });
    }

    // ==== Tạo Post ====
    const post = await PostModel.create(
      {
        userId,
        title: title.trim(),
        content: content.trim(),
        thumbnail: thumbnailUrl,
        image: images,
        price: priceNum,
        phone: phone ? String(phone).trim() : null,
        category: finalCategory,
        isActive: false,
        isVip: false,
        // vipPlanId: planIdToSave,
        vipTier: null,
        vipPriority: 0,
        vipExpiresAt: null,
        verifyStatus: "nonverify",
      },
      { transaction: tx }
    );

    // ==== Tạo chi tiết theo category ====
    if (finalCategory === "vehicle") {
      const hb = toBool(hasBattery, true);
      await VehicleDetailModel.create(
        {
          postId: post.id,
          brand,
          model,
          year: year ? Number(year) : null,
          mileage: mileage ? Number(mileage) : null,
          condition: condition ?? null,
          battery_brand: hb ? battery_brand ?? null : null,
          battery_model: hb ? battery_model ?? null : null,
          battery_capacity:
            hb && battery_capacity != null ? Number(battery_capacity) : null,
          battery_type: hb ? battery_type ?? null : null,
          battery_range:
            hb && battery_range != null ? Number(battery_range) : null,
          battery_condition: hb ? battery_condition ?? null : null,
          charging_time:
            hb && charging_time != null ? Number(charging_time) : null,
        },
        { transaction: tx }
      );
    } else {
      const compat = normalizeCompatibleModels(compatible_models);
      await BatteryDetailModel.create(
        {
          postId: post.id,
          battery_brand,
          battery_model: battery_model ?? null,
          battery_capacity: Number(battery_capacity),
          battery_type: battery_type ?? null,
          battery_condition: battery_condition ?? null,
          compatible_models: compat,
        },
        { transaction: tx }
      );
    }

    await tx.commit();
    return res.status(201).json({
      message:
        "Tạo bài thành công (chưa hiển thị). Vui lòng chọn gói & thanh toán để hiển thị.",
      data: post,
    });
  } catch (err) {
    await tx.rollback();
    console.error("createMyPost error:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: err.message });
  }
};

// ======================================================
// UPDATE POST (user chỉ được sửa nội dung, KHÔNG được bật VIP/hiển thị)
// ======================================================
export const updateMyPost = async (req, res) => {
  const tx = await sequelize.transaction();
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const post = await PostModel.findByPk(id, { transaction: tx });
    if (!post) return res.status(404).json({ message: "Không tìm thấy post" });
    if (post.userId !== userId)
      return res.status(403).json({ message: "Bạn không có quyền sửa post này" });

    const {
      title, content, thumbnail, image, price, phone, category, verifyStatus,
      hasBattery, brand, model, year, mileage, condition,
      battery_brand, battery_model, battery_capacity, battery_type,
      battery_range, battery_condition, charging_time, compatible_models,
      isActive, isVip, vipTier, vipPriority, vipExpiresAt,
    } = req.body ?? {};

    // ===== Upload file nếu có =====
    let newThumb = undefined;
    let newImagesAppend = [];

    const thFileU = req.files?.thumbnailFile?.[0];
    if (thFileU) {
      const f = new File([thFileU.buffer], thFileU.originalname, { type: thFileU.mimetype });
      const r = await utapi.uploadFiles(f);
      const item = Array.isArray(r) ? r[0] : r;
      if (item?.error) throw new Error(item.error.message || "Upload thumbnail failed");
      newThumb = item.data?.url ?? null;
    }

    const galFilesU = req.files?.imageFiles || [];
    if (galFilesU.length) {
      const fs = galFilesU.map((x) => new File([x.buffer], x.originalname, { type: x.mimetype }));
      const outs = await utapi.uploadFiles(fs);
      newImagesAppend = outs.filter(o => !o.error && o.data?.url).map(o => o.data.url);
    }

    // ===== Bỏ qua VIP fields (noop) =====
    if ([isActive, isVip, vipTier, vipPriority, vipExpiresAt].some(v => v !== undefined)) {
      // noop
    }

    // ===== Cập nhật cơ bản =====
    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: "title không được rỗng" });
      post.title = String(title).trim();
    }
    if (content !== undefined) {
      if (!String(content).trim()) return res.status(400).json({ message: "content không được rỗng" });
      post.content = String(content).trim();
    }

    if (newThumb !== undefined) {
      post.thumbnail = newThumb;
    } else if (thumbnail !== undefined) {
      post.thumbnail = thumbnail ? String(thumbnail).trim() : null;
    }

    if (image !== undefined) {
      post.image = normalizeImages(image);
    }
    if (newImagesAppend.length) {
      const cur = Array.isArray(post.image) ? post.image : [];
      post.image = [...cur, ...newImagesAppend];
    }

    if (price !== undefined) {
      const n = Number(price);
      if (Number.isNaN(n) || n < 0)
        return res.status(400).json({ message: "price phải là số >= 0" });
      post.price = n;
    }

    if (phone !== undefined) {
      if (phone && !PHONE_REGEX.test(String(phone)))
        return res.status(400).json({ message: "Số điện thoại không hợp lệ (VN)" });
      post.phone = phone ? String(phone) : null;
    }

    if (category !== undefined) {
      if (!["battery", "vehicle"].includes(category))
        return res.status(400).json({ message: "category phải là 'battery' hoặc 'vehicle'" });
      post.category = category;
    }

    // ✅ === CHECK BẮT BUỘC CÓ ẢNH ===
    const thumbToCheck = newThumb ?? thumbnail ?? post.thumbnail;
    const imagesToCheck = newImagesAppend.length
      ? newImagesAppend
      : (image ? normalizeImages(image) : post.image);

    if (!thumbToCheck || !String(thumbToCheck).trim()) {
      return res.status(400).json({ message: "Bắt buộc phải có ảnh thumbnail" });
    }

    if (!Array.isArray(imagesToCheck) || imagesToCheck.length === 0) {
      return res.status(400).json({ message: "Bắt buộc phải có ít nhất 1 ảnh trong danh sách image" });
    }

    // ===== verifyStatus: chỉ staff/admin =====
    if (verifyStatus !== undefined) {
      const role = req.user?.role;
      if (!["admin", "staff"].includes(role))
        return res.status(403).json({ message: "Chỉ staff/admin mới có thể thay đổi verifyStatus" });
      if (!["verify", "nonverify"].includes(verifyStatus))
        return res.status(400).json({ message: "verifyStatus phải là 'verify' hoặc 'nonverify'" });
      post.verifyStatus = verifyStatus;
    }

    // ===== Update chi tiết theo category =====
    const currentCategory = post.category;

    if (currentCategory === "vehicle") {
      let vd = await VehicleDetailModel.findOne({ where: { postId: post.id }, transaction: tx });
      if (!vd) vd = await VehicleDetailModel.create({ postId: post.id }, { transaction: tx });

      if (brand !== undefined) vd.brand = brand ?? null;
      if (model !== undefined) vd.model = model ?? null;
      if (year !== undefined) vd.year = year ? Number(year) : null;
      if (mileage !== undefined) vd.mileage = mileage ? Number(mileage) : null;
      if (condition !== undefined) vd.condition = condition ?? null;

      const hasBatteryWasSent = Object.prototype.hasOwnProperty.call(req.body, "hasBattery");
      const useBattery = hasBatteryWasSent ? toBool(hasBattery, true) : true;
      if (useBattery) {
        if (battery_brand !== undefined) vd.battery_brand = battery_brand ?? null;
        if (battery_model !== undefined) vd.battery_model = battery_model ?? null;
        if (battery_capacity !== undefined) vd.battery_capacity = battery_capacity != null ? Number(battery_capacity) : null;
        if (battery_type !== undefined) vd.battery_type = battery_type ?? null;
        if (battery_range !== undefined) vd.battery_range = battery_range != null ? Number(battery_range) : null;
        if (battery_condition !== undefined) vd.battery_condition = battery_condition ?? null;
        if (charging_time !== undefined) vd.charging_time = charging_time != null ? Number(charging_time) : null;
      } else {
        vd.battery_brand = vd.battery_model = vd.battery_type = vd.battery_condition = null;
        vd.battery_capacity = vd.battery_range = vd.charging_time = null;
      }

      await vd.save({ transaction: tx });
    } else {
      let bd = await BatteryDetailModel.findOne({ where: { postId: post.id }, transaction: tx });
      if (!bd) bd = await BatteryDetailModel.create({ postId: post.id }, { transaction: tx });

      if (battery_brand !== undefined) bd.battery_brand = battery_brand ?? null;
      if (battery_model !== undefined) bd.battery_model = battery_model ?? null;
      if (battery_capacity !== undefined) bd.battery_capacity = battery_capacity != null ? Number(battery_capacity) : null;
      if (battery_type !== undefined) bd.battery_type = battery_type ?? null;
      if (battery_condition !== undefined) bd.battery_condition = battery_condition ?? null;
      if (compatible_models !== undefined) {
        bd.compatible_models = normalizeCompatibleModels(compatible_models);
      }

      await bd.save({ transaction: tx });
    }

    await post.save({ transaction: tx });
    await tx.commit();
    return res.status(200).json({ message: "Cập nhật post thành công", data: post });
  } catch (err) {
    await tx.rollback();
    console.error("updateMyPost error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================================================
// DELETE POST
// ======================================================
export const deleteMyPost = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) 
      return res.status(401).json({ message: "Chưa đăng nhập" });

    const post = await PostModel.findByPk(id);
    if (!post) 
      return res.status(404).json({ message: "Không tìm thấy post" });

    // ✅ Thay vì xoá, chỉ cập nhật isActive = false
    await post.update({ isActive: false });

    return res.status(200).json({ message: "Đã ẩn post thành công" });
  } catch (err) {
    console.error("deleteMyPost error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================================================
// GET MY POSTS
// ======================================================
export const getMyPosts = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const page = Math.max(parseInt(req.query.page ?? "1", 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize ?? "20", 10), 1), 50);
    const offset = (page - 1) * pageSize;

    const { rows, count } = await PostModel.findAndCountAll({
      where: { userId },
      include: [{ model: UserModel, attributes: ["id", "username", "avatar"] }],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset,
    });

    return res.json({ total: count, page, pageSize, data: rows });
  } catch (err) {
    console.error("getMyPosts error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================================================
// GET MY POST DETAIL (owner only)
// ======================================================
export const getMyPostDetail = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const post = await PostModel.findByPk(id, {
      attributes: [
        "id",
        "userId",
        "title",
        "content",
        "image",
        "thumbnail",
        "price",
        "phone",
        "category",
        "verifyStatus",
        "isActive",
        "isVip",
        "vipTier",
        "vipPriority",
        "vipExpiresAt",
        "saleStatus",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: UserModel,
          attributes: ["id", "username", "avatar", "email"],
        },
        {
          model: VehicleDetailModel,
          as: "vehicleDetail",
          required: false,
          attributes: [
            "id",
            "brand",
            "model",
            "year",
            "mileage",
            "condition",
            "battery_brand",
            "battery_model",
            "battery_capacity",
            "battery_type",
            "battery_range",
            "battery_condition",
            "charging_time",
          ],
        },
        {
          model: BatteryDetailModel,
          as: "batteryDetail",
          required: false,
          attributes: [
            "id",
            "battery_brand",
            "battery_model",
            "battery_capacity",
            "battery_type",
            "battery_condition",
            "compatible_models",
          ],
        },
      ],
    });

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy post" });
    }

    // Chỉ cho chủ post xem
    if (post.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền xem post này" });
    }

    return res.json({ data: post });
  } catch (err) {
    console.error("getMyPostDetail error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ======================================================
// GET USER POSTS (public)
// ======================================================
export const getUserPosts = async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isInteger(userId))
      return res.status(400).json({ message: "userId không hợp lệ" });

    const posts = await PostModel.findAll({
      where: { userId, verifyStatus: "verify", isActive: true },
      include: [{ model: UserModel, attributes: ["id", "username", "avatar"] }],
      order: [["createdAt", "DESC"]],
    });

    if (!posts?.length)
      return res.status(404).json({ message: "Người dùng này chưa có bài đăng nào" });

    return res.json({ total: posts.length, data: posts });
  } catch (err) {
    console.error("getUserPosts error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
// ======================================================
// UPDATE SALE STATUS (owner tự đánh dấu còn bán / đã bán)
// ======================================================
export const updateMyPostSaleStatus = async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;          // id bài post
    const { saleStatus } = req.body ?? {};

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    // Validate giá trị saleStatus
    const allowed = ["available", "sold"];
    if (!saleStatus || !allowed.includes(String(saleStatus))) {
      return res.status(400).json({
        message: "saleStatus phải là 'available' hoặc 'sold'",
        received: saleStatus,
      });
    }

    const post = await PostModel.findByPk(id);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy post" });
    }

    // Chỉ cho chủ bài post được quyền đổi
    if (post.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền cập nhật saleStatus của post này" });
    }

    post.saleStatus = saleStatus;
    await post.save();

    return res.status(200).json({
      message: "Cập nhật saleStatus thành công",
      data: post,
    });
  } catch (err) {
    console.error("updateMyPostSaleStatus error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
