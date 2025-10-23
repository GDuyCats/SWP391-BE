// controller/contract.controller.js
import { ContractModel, PostModel, UserModel } from "../postgres/postgres.js";
import Mail from "../utils/mailer.js";

const gen6 = () => Math.floor(100000 + Math.random() * 900000).toString();

export const createPurchaseRequest = async (req, res) => {
  try {
    const buyerId = req.user?.id; // middleware đã gắn
    const { postId, message } = req.body;

    if (!buyerId) {
      return res.status(401).json({ message: "Missing auth payload" });
    }
    if (!postId) {
      return res.status(400).json({ message: "Missing postId" });
    }

    // Lấy bài đăng
    const post = await PostModel.findByPk(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // if (post.verifyStatus !== "verify") {
    //   return res.status(400).json({
    //     message: "This post has not been verified by staff yet. You cannot send a purchase request.",
    //   });
    // }

    if (post.category === "battery") {
      return res.status(400).json({
        message: "Purchase requests are only allowed for vehicles, not batteries.",
      });
    }
    const sellerId = post.userId;

    // Chặn tự mua bài của chính mình
    if (sellerId === buyerId) {
      return res.status(400).json({ message: "You cannot buy your own post" });
    }

    // (tuỳ bạn) Nếu Post có trường status, có thể kiểm tra còn khả dụng
    // if (post.status !== "available") { ... }

    // Chặn trùng yêu cầu còn mở cho cùng (buyer, post)
    const existed = await ContractModel.findOne({
      where: {
        buyerId,
        postId,
        status: ["pending", "negotiating", "awaiting_sign", "signed", "notarizing"], // các trạng thái đang còn hiệu lực
      },
    });
    if (existed) {
      return res.status(409).json({
        message: "An active request/contract already exists for this post by you",
        contractId: existed.id,
      });
    }

    // Tạo contract ở trạng thái 'pending', chưa có staff, chưa agreedPrice
    const contract = await ContractModel.create({
      buyerId,
      sellerId,
      postId,
      status: "pending",
      notes: message || null,
      // staffId: null, agreedPrice: null  // không cần set vì allowNull
    });

    // Không cache
    res.set("Cache-Control", "no-store");
    return res.status(201).json({
      message: "Purchase request created",
      contract,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const assignStaffToContract = async (req, res) => {
  try {
    const actor = req.user; // { id, role, ... } từ authenticateToken
    if (!actor?.id) {
      return res.status(401).json({ message: "Missing auth payload" });
    }
    if (actor.role !== "admin") {
      return res.status(403).json({ message: "Only admin can assign staff" });
    }

    const { contractId, staffId } = req.body;
    if (!contractId || !staffId) {
      return res.status(400).json({ message: "contractId and staffId are required" });
    }

    // Tìm hợp đồng
    const contract = await ContractModel.findByPk(contractId);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    // Không cho gán cho hợp đồng đã kết thúc/hủy
    if (["completed", "cancelled"].includes(contract.status)) {
      return res.status(400).json({ message: "Cannot assign staff to a completed/cancelled contract" });
    }

    // Kiểm tra staff hợp lệ
    const staff = await UserModel.findByPk(staffId, { attributes: ["id", "role", "username", "email"] });
    if (!staff || staff.role !== "staff") {
      return res.status(400).json({ message: "staffId must be a valid user with role 'staff'" });
    }

    // Nếu đã gán đúng staff này rồi → báo trùng
    if (contract.staffId && contract.staffId === staff.id) {
      return res.status(409).json({ message: "This staff is already assigned to the contract" });
    }

    // Gán staff (Bước 3 chỉ gán, CHƯA đổi sang 'negotiating')
    contract.staffId = staff.id;
    await contract.save();

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      message: "Staff assigned successfully",
      contract,
      staff: { id: staff.id, username: staff.username, email: staff.email },
    });
  } catch (err) {
    console.error("[contracts/assign-staff] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const recordAppointment = async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "staff") {
      return res.status(403).json({ message: "Only staff can record appointments" });
    }

    const { contractId, appointmentTime, appointmentPlace, appointmentNote } = req.body;
    if (!contractId || !appointmentTime || !appointmentPlace) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const contract = await ContractModel.findByPk(contractId);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    // Chỉ staff phụ trách mới được cập nhật
    if (contract.staffId !== user.id) {
      return res.status(403).json({ message: "You are not assigned to this contract" });
    }

    // Không cho cập nhật nếu đã hoàn tất hoặc hủy
    if (["completed", "cancelled"].includes(contract.status)) {
      return res.status(400).json({ message: "Cannot update completed/cancelled contract" });
    }

    // Cập nhật thông tin lịch hẹn và trạng thái
    contract.appointmentTime = appointmentTime;
    contract.appointmentPlace = appointmentPlace;
    contract.appointmentNote = appointmentNote || null;
    contract.status = "negotiating";

    await contract.save();

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      message: "Appointment recorded successfully",
      contract,
    });
  } catch (err) {
    console.error("[contracts/record-appointment] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const finalizeNegotiation = async (req, res) => {
  try {
    const user = req.user; // staff đã đăng nhập
    if (!user || user.role !== "staff") {
      return res.status(403).json({ message: "Only staff can finalize negotiation" });
    }

    const { contractId, agreedPrice, buyerFeePercent, sellerFeePercent, note } = req.body;

    // Validate đầu vào cơ bản
    if (!contractId || agreedPrice == null || buyerFeePercent == null || sellerFeePercent == null) {
      return res.status(400).json({ message: "contractId, agreedPrice, buyerFeePercent, sellerFeePercent are required" });
    }

    const price = Number(agreedPrice);
    const bPct = Number(buyerFeePercent);
    const sPct = Number(sellerFeePercent);

    if (!Number.isFinite(price) || price <= 0) {
      return res.status(400).json({ message: "agreedPrice must be a positive number" });
    }
    if (![bPct, sPct].every(n => Number.isFinite(n) && n >= 0 && n <= 100)) {
      return res.status(400).json({ message: "Fee percents must be between 0 and 100" });
    }

    const contract = await ContractModel.findByPk(contractId);
    if (!contract) {
      return res.status(404).json({ message: "Contract not found" });
    }

    // Chỉ staff được gán mới được chốt
    if (contract.staffId !== user.id) {
      return res.status(403).json({ message: "You are not assigned to this contract" });
    }

    // Chỉ cho chốt khi đang thương lượng (hoặc pending nếu bạn muốn linh hoạt)
    if (!["negotiating", "pending"].includes(contract.status)) {
      return res.status(400).json({ message: "Contract is not in a negotiable state" });
    }

    // Cập nhật thông tin thương lượng
    contract.agreedPrice = price;
    contract.buyerFeePercent = bPct;
    contract.sellerFeePercent = sPct;
    if (note) {
      // gộp thêm ghi chú nếu muốn
      contract.notes = contract.notes ? `${contract.notes}\n\n[Staff note] ${note}` : `[Staff note] ${note}`;
    }

    // Chuyển sang chờ ký OTP
    contract.status = "awaiting_sign";
    await contract.save();

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      message: "Negotiation finalized. Contract is now awaiting signatures (OTP).",
      contract,
    });
  } catch (err) {
    console.error("[staff/contracts/finalize] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getContractForViewer = async (req, res) => {
  try {
    const user = req.user; // { id, role, ... }
    const id = Number(req.params.id);
    if (!user?.id) return res.status(401).json({ message: "Missing auth payload" });
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid contract id" });

    const c = await ContractModel.findByPk(id);
    if (!c) return res.status(404).json({ message: "Contract not found" });

    const isBuyer = c.buyerId === user.id;
    const isSeller = c.sellerId === user.id;
    const isAssignedStaff = user.role === "staff" && c.staffId === user.id;
    const isAdmin = user.role === "admin";

    if (!(isBuyer || isSeller || isAssignedStaff || isAdmin)) {
      return res.status(403).json({ message: "You are not allowed to view this contract" });
    }

    // Chuẩn bị bản view theo vai trò
    const data = c.toJSON();

    // Không trả về các OTP ở bước xem (chỉ dùng khi verify)
    delete data.buyerOtp;
    delete data.sellerOtp;

    // Tính role để hiển thị
    const viewerRole = isAdmin ? "admin" : isAssignedStaff ? "staff" : isBuyer ? "buyer" : "seller";

    // Ẩn phí của bên còn lại và bổ sung “phí của người xem”
    if (viewerRole === "buyer") {
      // buyer chỉ thấy phí buyer
      delete data.sellerFeePercent;
      data.viewerFeePercent = data.buyerFeePercent ?? 0;
      data.viewerFeeAmount =
        data.agreedPrice != null && data.buyerFeePercent != null
          ? Math.round((data.agreedPrice * data.buyerFeePercent) / 100)
          : null;
    } else if (viewerRole === "seller") {
      // seller chỉ thấy phí seller
      delete data.buyerFeePercent;
      data.viewerFeePercent = data.sellerFeePercent ?? 0;
      data.viewerFeeAmount =
        data.agreedPrice != null && data.sellerFeePercent != null
          ? Math.round((data.agreedPrice * data.sellerFeePercent) / 100)
          : null;
    } else {
      // staff/admin thấy đầy đủ, kèm breakdown
      data.buyerFeeAmount =
        data.agreedPrice != null && data.buyerFeePercent != null
          ? Math.round((data.agreedPrice * data.buyerFeePercent) / 100)
          : null;
      data.sellerFeeAmount =
        data.agreedPrice != null && data.sellerFeePercent != null
          ? Math.round((data.agreedPrice * data.sellerFeePercent) / 100)
          : null;
    }

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ viewerRole, contract: data });
  } catch (err) {
    console.error("[contracts/view] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendContractOtp = async (req, res) => {
  try {
    const actor = req.user; // staff/admin
    const { contractId } = req.body;

    if (!actor?.id) return res.status(401).json({ message: "Missing auth payload" });

    const contract = await ContractModel.findByPk(contractId);
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    const isAdmin = actor.role === "admin";
    const isAssignedStaff = actor.role === "staff" && contract.staffId === actor.id;
    if (!(isAdmin || isAssignedStaff)) {
      return res.status(403).json({ message: "Not allowed to send OTP for this contract" });
    }

    if (contract.status !== "awaiting_sign") {
      return res.status(400).json({ message: "Contract is not awaiting signatures" });
    }

    // ✅ Tạo OTP và thời hạn
    const buyerOtp = gen6();
    const sellerOtp = gen6();
    const now = new Date();
    const expires = new Date(now.getTime() + 10 * 60 * 1000); // 10 phút

    await contract.update({
      buyerOtp,
      sellerOtp,
      buyerOtpExpiresAt: expires,
      sellerOtpExpiresAt: expires,
      buyerOtpAttempts: 0,
      sellerOtpAttempts: 0,
    });

    // ✅ Gửi email OTP
    const [buyer, seller] = await Promise.all([
      UserModel.findByPk(contract.buyerId, { attributes: ["email", "username"] }),
      UserModel.findByPk(contract.sellerId, { attributes: ["email", "username"] }),
    ]);

    const buyerMail = new Mail()
      .setTo(buyer.email)
      .setSubject(`Mã OTP ký hợp đồng #${contract.id} (Buyer)`)
      .setHTML(`
        <div style="font-family:Arial,sans-serif">
          <h2>Mã OTP ký hợp đồng</h2>
          <p>Xin chào <b>${buyer.username}</b>,</p>
          <p>Mã OTP để xác nhận ký hợp đồng #${contract.id} là:</p>
          <div style="font-size:28px;letter-spacing:4px;font-weight:700">${buyerOtp}</div>
          <p>Mã này có hiệu lực trong <b>10 phút</b>. Vui lòng không chia sẻ với bất kỳ ai.</p>
        </div>
      `);

    const sellerMail = new Mail()
      .setTo(seller.email)
      .setSubject(`🔒 Mã OTP ký hợp đồng #${contract.id} (Seller)`)
      .setHTML(`
        <div style="font-family:Arial,sans-serif">
          <h2>🔒 Mã OTP ký hợp đồng</h2>
          <p>Xin chào <b>${seller.username}</b>,</p>
          <p>Mã OTP để xác nhận ký hợp đồng #${contract.id} là:</p>
          <div style="font-size:28px;letter-spacing:4px;font-weight:700">${sellerOtp}</div>
          <p>Mã này có hiệu lực trong <b>10 phút</b>. Vui lòng không chia sẻ với bất kỳ ai.</p>
        </div>
      `);

    await Promise.all([buyerMail.send(), sellerMail.send()]);

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ message: "OTP sent to buyer and seller emails" });
  } catch (err) {
    console.error("[contracts/send-otp] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyContractOtp = async (req, res) => {
  try {
    const user = req.user; // buyer hoặc seller
    const { contractId, code } = req.body;

    if (!user?.id) return res.status(401).json({ message: "Missing auth payload" });
    if (!contractId || !code) return res.status(400).json({ message: "contractId and code are required" });

    const contract = await ContractModel.findByPk(contractId);
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    const now = new Date();

    if (contract.buyerId === user.id) {
      // 🧾 Buyer ký
      if (contract.buyerSignedAt) return res.status(409).json({ message: "Buyer already signed" });
      if (!contract.buyerOtp || now > new Date(contract.buyerOtpExpiresAt))
        return res.status(400).json({ message: "OTP expired or not issued" });

      contract.buyerOtpAttempts += 1;
      if (contract.buyerOtpAttempts > 5)
        return res.status(429).json({ message: "Too many attempts" });

      if (code !== contract.buyerOtp)
        return res.status(400).json({ message: "Invalid OTP code" });

      contract.buyerSignedAt = now;
      contract.buyerOtp = null;
      await contract.save();
    } else if (contract.sellerId === user.id) {
      // 🧾 Seller ký
      if (contract.sellerSignedAt) return res.status(409).json({ message: "Seller already signed" });
      if (!contract.sellerOtp || now > new Date(contract.sellerOtpExpiresAt))
        return res.status(400).json({ message: "OTP expired or not issued" });

      contract.sellerOtpAttempts += 1;
      if (contract.sellerOtpAttempts > 5)
        return res.status(429).json({ message: "Too many attempts" });

      if (code !== contract.sellerOtp)
        return res.status(400).json({ message: "Invalid OTP code" });

      contract.sellerSignedAt = now;
      contract.sellerOtp = null;
      await contract.save();
    } else {
      return res.status(403).json({ message: "You are not a party of this contract" });
    }

    // ✅ Nếu cả hai bên đã ký → chuyển trạng thái signed
    const refreshed = await ContractModel.findByPk(contractId);
    if (refreshed.buyerSignedAt && refreshed.sellerSignedAt) {
      refreshed.status = "signed";
      refreshed.signedAt = new Date();
      await refreshed.save();
    }

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      message:
        refreshed.status === "signed"
          ? "Both parties signed. Contract is signed."
          : "OTP verified.",
      contract: refreshed,
    });
  } catch (err) {
    console.error("[contracts/verify-otp] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

