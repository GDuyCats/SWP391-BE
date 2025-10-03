// utils/mailer.js — ĐÃ SỬA
import nodemailer from "nodemailer";
import dns from "node:dns";

// Ép IPv4 để tránh ENETUNREACH trên môi trường không có IPv6 — ĐÃ SỬA
dns.setDefaultResultOrder?.("ipv4first");

// ✓ Dùng biến ENV rõ ràng (ưu tiên SMTP_*; fallback sang EMAIL/PASSWORD) — ĐÃ SỬA
const host = process.env.SMTP_HOST || "smtp.gmail.com";
const port = Number(process.env.SMTP_PORT || 587); // 465=SSL, 587=STARTTLS
const secure = port === 465;
const user = process.env.SMTP_USER || process.env.EMAIL;
const pass = process.env.SMTP_PASS || process.env.PASSWORD;
const defaultFromName = process.env.SMTP_FROM_NAME || "2NDEV";
const defaultFromAddr = process.env.SMTP_FROM || user;

// Tạo transporter dạng host/port (ổn định & dễ debug hơn service) — ĐÃ SỬA
export const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: user && pass ? { user, pass } : undefined,
  tls: {
    servername: host,
    // nếu CA lạ, rejectUnauthorized=false giúp debug; khi ổn có thể chuyển true
    rejectUnauthorized: false,
  },
  // Bật debug khi cần: đặt SMTP_DEBUG=true trong ENV — ĐÃ SỬA
  logger: process.env.SMTP_DEBUG === "true",
  debug: process.env.SMTP_DEBUG === "true",
  connectionTimeout: 10000,
});

class Mail {
  constructor() {
    this.mailOptions = {
      from: { name: defaultFromName, address: defaultFromAddr },
      to: [],
    };
  }

  /**
   * @param {string} name
   */
  setCompanyName(name) {
    this.mailOptions.from.name = name;
    return this;
  }

  /**
   * @param {string} email
   */
  setSenderEmail(email) {
    this.mailOptions.from.address = email;
    return this;
  }

  /**
   * @param {string|string[]} receiver
   */
  setTo(receiver) {
    const list = this.mailOptions.to || [];
    if (Array.isArray(receiver)) list.push(...receiver);
    else list.push(receiver);
    this.mailOptions.to = list;
    return this;
  }

  setCC(cc) {
    const list = this.mailOptions.cc || [];
    if (Array.isArray(cc)) list.push(...cc);
    else list.push(cc);
    this.mailOptions.cc = list;
    return this;
  }

  setBCC(bcc) {
    const list = this.mailOptions.bcc || [];
    if (Array.isArray(bcc)) list.push(...bcc);
    else list.push(bcc);
    this.mailOptions.bcc = list;
    return this;
  }

  /**
   * @param {string} subject
   */
  setSubject(subject) {
    this.mailOptions.subject = subject;
    return this;
  }

  /**
   * @param {string} text
   */
  setText(text) {
    this.mailOptions.text = text;
    return this;
  }

  /**
   * @param {string} html
   */
  setHTML(html) {
    this.mailOptions.html = html;
    return this;
  }

  /**
   * Gửi mail (Promise). KHÔNG dùng res ở đây. — ĐÃ SỬA
   */
  async send() {
    try {
      // Kiểm tra kết nối & auth trước khi gửi — ĐÃ SỬA
      await transporter.verify();

      const info = await transporter.sendMail(this.mailOptions);

      console.log("📧 Email sent:", {
        to: this.mailOptions.to,
        id: info.messageId,
        response: info.response,
      });
      return info;
    } catch (error) {
      // Log lỗi chi tiết để bắt đúng bệnh — ĐÃ SỬA
      console.error("❌ SMTP send error:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        stack: error.stack,
      });
      throw error;
    }
  }
}

export default Mail;
