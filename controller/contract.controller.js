// controller/contract.controller.js
import { ContractModel, PostModel, UserModel } from "../postgres/postgres.js";
import Mail from "../utils/mailer.js";
import { Op } from "sequelize";

const gen6 = () => Math.floor(100000 + Math.random() * 900000).toString();

export const createPurchaseRequest = async (req, res) => {
  try {
    const buyerId = req.user?.id;
    const { postId, message } = req.body;

    if (!buyerId) return res.status(401).json({ message: "Missing auth payload" });
    if (!postId) return res.status(400).json({ message: "Missing postId" });

    const post = await PostModel.findByPk(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    if (post.category === "battery") {
      return res.status(400).json({
        message: "Purchase requests are only allowed for vehicles, not batteries.",
      });
    }

    const sellerId = post.userId;
    if (sellerId === buyerId) {
      return res.status(400).json({ message: "You cannot buy your own post" });
    }

    const existed = await ContractModel.findOne({
      where: {
        buyerId,
        postId,
        status: ["pending", "negotiating", "awaiting_sign", "signed", "notarizing"],
      },
    });
    if (existed) {
      return res.status(409).json({
        message: "An active request/contract already exists for this post by you",
        contractId: existed.id,
      });
    }

    const contract = await ContractModel.create({
      buyerId,
      sellerId,
      postId,
      status: "pending",
      notes: message || null,
    });

    res.set("Cache-Control", "no-store");
    return res.status(201).json({ message: "Purchase request created", contract });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const assignStaffToContract = async (req, res) => {
  try {
    const actor = req.user;
    if (!actor?.id) return res.status(401).json({ message: "Missing auth payload" });
    if (actor.role !== "admin") return res.status(403).json({ message: "Only admin can assign staff" });

    const { contractId, staffId } = req.body;
    if (!contractId || !staffId) {
      return res.status(400).json({ message: "contractId and staffId are required" });
    }

    const contract = await ContractModel.findByPk(contractId);
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    if (["completed", "cancelled"].includes(contract.status)) {
      return res.status(400).json({ message: "Cannot assign staff to a completed/cancelled contract" });
    }

    const staff = await UserModel.findByPk(staffId, { attributes: ["id", "role", "username", "email"] });
    if (!staff || staff.role !== "staff") {
      return res.status(400).json({ message: "staffId must be a valid user with role 'staff'" });
    }

    if (contract.staffId && contract.staffId === staff.id) {
      return res.status(409).json({ message: "This staff is already assigned to the contract" });
    }

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
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    if (contract.staffId !== user.id) {
      return res.status(403).json({ message: "You are not assigned to this contract" });
    }

    if (["completed", "cancelled"].includes(contract.status)) {
      return res.status(400).json({ message: "Cannot update completed/cancelled contract" });
    }

    contract.appointmentTime = appointmentTime;
    contract.appointmentPlace = appointmentPlace;
    contract.appointmentNote = appointmentNote || null;
    contract.status = "negotiating";
    await contract.save();

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ message: "Appointment recorded successfully", contract });
  } catch (err) {
    console.error("[contracts/record-appointment] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const finalizeNegotiation = async (req, res) => {
  try {
    // ---- Map alias cho các key phí (nếu FE gõ tắt/nhầm) ----
    // Chỉ điền vào key chuẩn khi key chuẩn đang thiếu hoặc rỗng.
    const body = req.body;
    const alias = {
      brokerFee: "brokerageFee",
      transferFee: "titleTransferFee",
      legalFee: "legalAndConditionCheckFee",
      adminFee: "adminProcessingFee",
      reinspectionFee: "reinspectionOrRegistrationSupportFee",
    };
    for (const [from, to] of Object.entries(alias)) {
      if (
        body[from] !== undefined &&
        (body[to] === undefined ||
          body[to] === null ||
          (typeof body[to] === "string" && body[to].trim() === ""))
      ) {
        body[to] = body[from];
      }
    }

    // ---- Lấy dữ liệu (sau khi đã map alias) ----
    const {
      contractId,
      agreedPrice,
      brokerageFee,
      titleTransferFee,
      legalAndConditionCheckFee,
      adminProcessingFee,
      reinspectionOrRegistrationSupportFee,
      feeResponsibility, // ai chịu phí cho từng loại
      note,
    } = body;

    const contract = await ContractModel.findByPk(contractId);
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    // helpers: chỉ set khi có giá trị thực, và parse số an toàn (chấp nhận "500,000")
    const hasVal = (v) =>
      v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "");
    const toNum = (v) => Number(String(v).replace(/,/g, ""));

    // cập nhật giá & các loại phí (không ghi đè nếu frontend gửi "")
    if (hasVal(agreedPrice)) contract.agreedPrice = toNum(agreedPrice);
    if (hasVal(brokerageFee)) contract.brokerageFee = toNum(brokerageFee);
    if (hasVal(titleTransferFee)) contract.titleTransferFee = toNum(titleTransferFee);
    if (hasVal(legalAndConditionCheckFee))
      contract.legalAndConditionCheckFee = toNum(legalAndConditionCheckFee);
    if (hasVal(adminProcessingFee))
      contract.adminProcessingFee = toNum(adminProcessingFee);
    if (hasVal(reinspectionOrRegistrationSupportFee)) {
      contract.reinspectionOrRegistrationSupportFee = toNum(
        reinspectionOrRegistrationSupportFee
      );
    }

    // feeResponsibility: chỉ nhận "buyer" | "seller" cho các key hợp lệ
    if (feeResponsibility && typeof feeResponsibility === "object") {
      const ALLOWED_KEYS = [
        "brokerageFee",
        "titleTransferFee",
        "legalAndConditionCheckFee",
        "adminProcessingFee",
        "reinspectionOrRegistrationSupportFee",
      ];
      const cleaned = {};
      for (const k of ALLOWED_KEYS) {
        if (hasVal(feeResponsibility[k])) {
          const v = String(feeResponsibility[k]).toLowerCase().trim();
          if (v === "buyer" || v === "seller") cleaned[k] = v;
        }
      }
      if (Object.keys(cleaned).length > 0) {
        contract.feeResponsibility = {
          ...(contract.feeResponsibility || {}),
          ...cleaned,
        };
      }
    }

    if (hasVal(note)) {
      contract.notes = contract.notes
        ? `${contract.notes}\n\n[Staff note] ${note}`
        : `[Staff note] ${note}`;
    }

    // chuyển trạng thái sang chờ ký OTP
    contract.status = "awaiting_sign";
    await contract.save();

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      message: "Finalized. Contract awaiting OTP signatures.",
      contract,
    });
  } catch (err) {
    console.error("[finalizeNegotiation] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getContractForViewer = async (req, res) => {
  try {
    const user = req.user;
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

    const data = c.toJSON();
    delete data.buyerOtp;
    delete data.sellerOtp;

    const viewerRole = isAdmin ? "admin" : isAssignedStaff ? "staff" : isBuyer ? "buyer" : "seller";

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

    const buyerOtp = gen6();
    const sellerOtp = gen6();
    const now = new Date();
    const expires = new Date(now.getTime() + 10 * 60 * 1000);

    await contract.update({
      buyerOtp,
      sellerOtp,
      buyerOtpExpiresAt: expires,
      sellerOtpExpiresAt: expires,
      buyerOtpAttempts: 0,
      sellerOtpAttempts: 0,
    });

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
    if (!contractId || !code)
      return res.status(400).json({ message: "contractId and code are required" });

    const contract = await ContractModel.findByPk(contractId);
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    const now = new Date();

    if (contract.buyerId === user.id) {
      if (contract.buyerSignedAt)
        return res.status(409).json({ message: "Buyer already signed" });
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
      if (contract.sellerSignedAt)
        return res.status(409).json({ message: "Seller already signed" });
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
      return res
        .status(403)
        .json({ message: "You are not a party of this contract" });
    }

    const refreshed = await ContractModel.findByPk(contractId);
    if (refreshed.buyerSignedAt && refreshed.sellerSignedAt) {
      refreshed.status = "signed";
      refreshed.signedAt = new Date();
      await refreshed.save();

      // 🔹 NEW: khi cả 2 bên đã ký, đánh dấu bài post là SOLD
      try {
        const post = await PostModel.findByPk(refreshed.postId);
        if (post && post.saleStatus !== "sold") {
          post.saleStatus = "sold"; // ENUM("available", "sold")
          await post.save();
        }
      } catch (postErr) {
        console.error(
          "[contracts/verify-otp] failed to update post.saleStatus:",
          postErr
        );
        // Không throw để không làm fail response, vì contract đã ký xong rồi
      }
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

export const listSellerContracts = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ message: "Missing auth payload" });

    const contracts = await ContractModel.findAll({
      where: { sellerId: user.id },
      order: [["createdAt", "DESC"]],
      include: [
        { model: PostModel, attributes: ["id", "title", "category", "price", "userId"] },
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "staff", attributes: ["id", "username", "email"] },
      ],
    });

    const sanitized = contracts.map((c) => {
      const data = c.toJSON();
      delete data.buyerOtp;
      delete data.sellerOtp;
      return data;
    });

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ viewerRole: "seller", total: sanitized.length, contracts: sanitized });
  } catch (err) {
    console.error("[contracts/listSellerContracts] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listStaffContracts = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ message: "Missing auth payload" });

    const contracts = await ContractModel.findAll({
      where: { staffId: user.id },
      order: [["createdAt", "DESC"]],
      include: [
        { model: PostModel, attributes: ["id", "title", "category", "price"] },
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "seller", attributes: ["id", "username", "email"] },
      ],
    });

    const sanitized = contracts.map((c) => {
      const data = c.toJSON();
      delete data.buyerOtp;
      delete data.sellerOtp;
      return data;
    });

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ viewerRole: "staff", total: sanitized.length, contracts: sanitized });
  } catch (err) {
    console.error("[contracts/listStaffContracts] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listAllContractsForAdmin = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ message: "Missing auth payload" });

    const contracts = await ContractModel.findAll({
      order: [["createdAt", "DESC"]],
      include: [
        { model: PostModel, attributes: ["id", "title", "category", "price"] },
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "seller", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "staff", attributes: ["id", "username", "email"] },
      ],
    });

    const sanitized = contracts.map((c) => {
      const data = c.toJSON();
      delete data.buyerOtp;
      delete data.sellerOtp;
      return data;
    });

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ viewerRole: "admin", total: sanitized.length, contracts: sanitized });
  } catch (err) {
    console.error("[contracts/listAllContractsForAdmin] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendFinalContractToParties = async (req, res) => {
  try {
    const staff = req.user;
    const { contractId } = req.body;

    if (!staff?.id) return res.status(401).json({ message: "Missing auth payload" });
    if (staff.role !== "staff") return res.status(403).json({ message: "Only staff can send finalized contracts" });
    if (!contractId) return res.status(400).json({ message: "contractId is required" });

    const contract = await ContractModel.findByPk(contractId);
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    if (contract.staffId !== staff.id) {
      return res.status(403).json({ message: "You are not assigned to this contract" });
    }

    if (contract.status !== "signed") {
      return res.status(400).json({ message: "Contract is not fully signed yet" });
    }
    if (!contract.buyerSignedAt || !contract.sellerSignedAt) {
      return res.status(400).json({ message: "Both buyer and seller must sign before sending final contract" });
    }
    
    await contract.reload();
    const [buyer, seller] = await Promise.all([
      UserModel.findByPk(contract.buyerId, { attributes: ["username", "email"] }),
      UserModel.findByPk(contract.sellerId, { attributes: ["username", "email"] }),
    ]);

    if (!buyer || !seller) return res.status(500).json({ message: "Missing buyer/seller user data" });

    const summaryHtml = `
      <div style="font-family:Arial,sans-serif; line-height:1.5">
        <h2>Hợp đồng mua bán #${contract.id}</h2>
        <p><b>Trạng thái:</b> ĐÃ KÝ bởi cả hai bên (Buyer & Seller)</p>
        <p><b>Thời điểm ký hoàn tất:</b> ${contract.signedAt ?? contract.updatedAt}</p>

        <h3>Thông tin giao dịch</h3>
        <ul>
          <li><b>Giá chốt:</b> ${contract.agreedPrice ?? "N/A"}</li>
          <li><b>Phí môi giới:</b> ${contract.brokerageFee ?? 0}</li>
          <li><b>Phí sang tên/đăng ký:</b> ${contract.titleTransferFee ?? 0}</li>
          <li><b>Phí kiểm tra pháp lý & tình trạng xe:</b> ${contract.legalAndConditionCheckFee ?? 0}</li>
          <li><b>Phí xử lý giấy tờ & hành chính:</b> ${contract.adminProcessingFee ?? 0}</li>
          <li><b>Phí kiểm định/đăng kiểm lại:</b> ${contract.reinspectionOrRegistrationSupportFee ?? 0}</li>
          <li><b>Tổng phí dịch vụ:</b> ${contract.totalExtraFees}</li>
          <li><b>Thời gian hẹn:</b> ${contract.appointmentTime ? new Date(contract.appointmentTime).toLocaleString() : "Chưa có"}</li>
          <li><b>Địa điểm hẹn:</b> ${contract.appointmentPlace ?? "Chưa có"}</li>
        </ul>

        <p>Đây là bản xác nhận hợp đồng đã hoàn tất. Vui lòng lưu lại email này để làm bằng chứng giao dịch.</p>

        <p style="margin-top:24px;font-size:12px;color:#666">Đây là email tự động từ hệ thống. Vui lòng không trả lời trực tiếp.</p>
      </div>
    `;

    const mailToBuyer = new Mail()
      .setTo(buyer.email)
      .setSubject(`Hợp đồng #${contract.id} - Hoàn tất giao dịch (Bên mua)`)
      .setHTML(summaryHtml);

    const mailToSeller = new Mail()
      .setTo(seller.email)
      .setSubject(`Hợp đồng #${contract.id} - Hoàn tất giao dịch (Bên bán)`)
      .setHTML(summaryHtml);

    await Promise.all([mailToBuyer.send(), mailToSeller.send()]);

    contract.status = "completed";
    await contract.save();

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      message: "Final signed contract sent to buyer and seller. Contract marked as completed.",
      nextStatus: contract.status,
      contractId: contract.id,
      sentTo: { buyerEmail: buyer.email, sellerEmail: seller.email },
    });
  } catch (err) {
    console.error("[contracts/send-final] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendDraftContractToParties = async (req, res) => {
  try {
    const staff = req.user;
    const { contractId } = req.body;

    if (!contractId) return res.status(400).json({ message: "contractId is required" });

    const contract = await ContractModel.findByPk(contractId);
    if (!contract) return res.status(404).json({ message: "Contract not found" });

    if (contract.status !== "awaiting_sign") {
      return res.status(400).json({ message: "Contract must be in 'awaiting_sign' state to send draft" });
    }
    await contract.reload();
    const [buyer, seller] = await Promise.all([
      UserModel.findByPk(contract.buyerId, { attributes: ["username", "email"] }),
      UserModel.findByPk(contract.sellerId, { attributes: ["username", "email"] }),
    ]);

    if (!buyer || !seller) return res.status(500).json({ message: "Missing buyer/seller data" });

    const summaryHtml = `
      <div style="font-family:Arial,sans-serif; line-height:1.6">
        <h2>📄 Hợp đồng xem trước #${contract.id}</h2>
        <p>Đây là bản hợp đồng <b>dự thảo</b> để hai bên xem và kiểm tra trước khi ký.</p>

        <h3>Thông tin tóm tắt</h3>
        <ul>
          <li><b>Giá đề xuất:</b> ${contract.agreedPrice ?? "Chưa chốt"}</li>
          <li><b>Phí môi giới:</b> ${contract.brokerageFee ?? 0}</li>
          <li><b>Phí sang tên/đăng ký:</b> ${contract.titleTransferFee ?? 0}</li>
          <li><b>Phí kiểm tra pháp lý & tình trạng xe:</b> ${contract.legalAndConditionCheckFee ?? 0}</li>
          <li><b>Phí xử lý giấy tờ & hành chính:</b> ${contract.adminProcessingFee ?? 0}</li>
          <li><b>Phí kiểm định/đăng kiểm lại:</b> ${contract.reinspectionOrRegistrationSupportFee ?? 0}</li>
          <li><b>Tổng phí dịch vụ:</b> ${contract.totalExtraFees}</li>
          <li><b>Thời gian hẹn:</b> ${contract.appointmentTime ? new Date(contract.appointmentTime).toLocaleString() : "Chưa có"}</li>
          <li><b>Địa điểm:</b> ${contract.appointmentPlace ?? "Chưa có"}</li>
        </ul>

        <p><b>Ghi chú:</b><br>${contract.notes ?? "(Không có ghi chú)"}</p>
        <p>Sau khi xác nhận nội dung, nhân viên phụ trách sẽ gửi OTP để hai bên ký hợp đồng.</p>

        <p style="margin-top:24px;font-size:12px;color:#666">Đây là email tự động từ hệ thống. Vui lòng không trả lời trực tiếp.</p>
      </div>
    `;

    const mailToBuyer = new Mail()
      .setTo(buyer.email)
      .setSubject(`📄 Hợp đồng xem trước #${contract.id} (Bên mua)`)
      .setHTML(summaryHtml);

    const mailToSeller = new Mail()
      .setTo(seller.email)
      .setSubject(`📄 Hợp đồng xem trước #${contract.id} (Bên bán)`)
      .setHTML(summaryHtml);

    await Promise.all([mailToBuyer.send(), mailToSeller.send()]);

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      message: "Draft contract sent to buyer and seller successfully.",
      status: contract.status,
      sentTo: { buyerEmail: buyer.email, sellerEmail: seller.email },
    });
  } catch (err) {
    console.error("[contracts/sendDraft] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listMyUnsignedContracts = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ message: "Missing auth payload" });

    const sideQ = (req.query.side || "").toLowerCase(); // buyer|seller
    const whereSide =
      sideQ === "buyer"
        ? { buyerId: user.id }
        : sideQ === "seller"
        ? { sellerId: user.id }
        : { [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }] };

    const contracts = await ContractModel.findAll({
      where: { ...whereSide, status: ["pending", "negotiating", "awaiting_sign"] },
      order: [["createdAt", "DESC"]],
      include: [
        { model: PostModel, attributes: ["id", "title", "category", "price", "userId"] },
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "seller", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "staff", attributes: ["id", "username", "email"] },
      ],
    });

    const sanitized = contracts.map((c) => {
      const data = c.toJSON();
      const side = data.buyerId === user.id ? "buyer" : "seller";
      delete data.buyerOtp;
      delete data.sellerOtp;
      return { side, ...data };
    });

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      viewerRole: "user",
      filter: "unsigned",
      total: sanitized.length,
      contracts: sanitized,
    });
  } catch (err) {
    console.error("[contracts/listMyUnsignedContracts] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const listMyContracts = async (req, res) => {
  try {
    const user = req.user;
    if (!user?.id) return res.status(401).json({ message: "Missing auth payload" });

    const sideQ = (req.query.side || "").toLowerCase(); // buyer|seller
    const whereSide =
      sideQ === "buyer"
        ? { buyerId: user.id }
        : sideQ === "seller"
        ? { sellerId: user.id }
        : { [Op.or]: [{ buyerId: user.id }, { sellerId: user.id }] };

    const contracts = await ContractModel.findAll({
      where: whereSide,
      order: [["createdAt", "DESC"]],
      include: [
        { model: PostModel, attributes: ["id", "title", "category", "price", "userId"] },
        { model: UserModel, as: "buyer", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "seller", attributes: ["id", "username", "email"] },
        { model: UserModel, as: "staff", attributes: ["id", "username", "email"] },
      ],
    });

    const sanitized = contracts.map((c) => {
      const data = c.toJSON();
      const side = data.buyerId === user.id ? "buyer" : "seller";
      delete data.buyerOtp;
      delete data.sellerOtp;
      return { side, ...data };
    });

    res.set("Cache-Control", "no-store");
    return res.status(200).json({
      viewerRole: "user",
      total: sanitized.length,
      contracts: sanitized,
    });
  } catch (err) {
    console.error("[contracts/listMyContracts] error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};
