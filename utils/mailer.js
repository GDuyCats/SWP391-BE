// utils/mailer.js
import nodemailer from "nodemailer";
import dns from "node:dns";

// Ép IPv4 để tránh ENETUNREACH nếu hạ tầng không có IPv6
dns.setDefaultResultOrder?.("ipv4first");

// Gmail: nên dùng App Password 16 ký tự
const user = process.env.EMAIL;
const pass = process.env.PASSWORD;

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user, pass },
  logger: process.env.SMTP_DEBUG === "true", // bật log nội bộ khi cần
  debug: process.env.SMTP_DEBUG === "true",
  // timeout nhẹ cho network
  connectionTimeout: 10000,
});

class Mail {
  constructor() {
    this.mailOptions = {
      from: { name: "2NDEV", address: user }, // FROM nên trùng user với Gmail
      to: [],
    };
  }

  setCompanyName(name) { this.mailOptions.from.name = name; return this; }
  setSenderEmail(email) { this.mailOptions.from.address = email; return this; }
  setTo(receiver) {
    const list = this.mailOptions.to || [];
    if (Array.isArray(receiver)) list.push(...receiver);
    else list.push(receiver);
    this.mailOptions.to = list;
    return this;
  }
  setCC(cc)  { const l = this.mailOptions.cc  || []; Array.isArray(cc)? l.push(...cc)  : l.push(cc);  this.mailOptions.cc  = l; return this; }
  setBCC(bcc){ const l = this.mailOptions.bcc || []; Array.isArray(bcc)? l.push(...bcc): l.push(bcc); this.mailOptions.bcc = l; return this; }
  setSubject(subject) { this.mailOptions.subject = subject; return this; }
  setText(text)       { this.mailOptions.text = text; return this; }
  setHTML(html)       { this.mailOptions.html = html; return this; }

  async send() {
    try {
      await transporter.verify(); // test kết nối + auth
      const info = await transporter.sendMail(this.mailOptions);
      console.log("📧 Email sent:", {
        to: this.mailOptions.to,
        id: info.messageId,
        response: info.response,
      });
      return info;
    } catch (error) {
      console.error("❌ SMTP send error:", {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        stack: error.stack,
      });
      throw error; // để controller catch và trả 500
    }
  }
}

export default Mail;
