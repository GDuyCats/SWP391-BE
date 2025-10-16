// utils/mailer.js
import sgMail from "@sendgrid/mail";

const FROM = process.env.MAIL_FROM || "YourApp <noreply@yourapp.com>";
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default class Mail {
  constructor() {
    this.mailOptions = { from: FROM, to: [] };
  }
  setTo(r) {
    const l = this.mailOptions.to || [];
    Array.isArray(r) ? l.push(...r) : l.push(r);
    this.mailOptions.to = l;
    return this;
  }
  setSubject(s) {
    this.mailOptions.subject = s;
    return this;
  }
  setHTML(h) {
    this.mailOptions.html = h;
    return this;
  }
  setText(t) {
    this.mailOptions.text = t;
    return this;
  }
  async send() {
  const to = this.mailOptions.to;
  if (!to || to.length === 0) throw new Error("No recipient (to) provided");

  const msg = {
    from: this.mailOptions.from,
    to, // SendGrid SDK tự handle nhiều người nhận
    subject: this.mailOptions.subject,
  };

  if (this.mailOptions.text) msg.text = this.mailOptions.text; // text trước
  if (this.mailOptions.html) msg.html = this.mailOptions.html; // html sau

  try {
    const res = await sgMail.send(msg, false);
    console.log("📧 SendGrid sent:", res[0]?.statusCode);
    return res;
  } catch (err) {
    console.error("❌ SendGrid error:", err?.response?.body || err);
    throw err;
  }
}
}
