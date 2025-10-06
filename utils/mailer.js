// utils/mailer.js — dùng Resend API thay cho SMTP
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM || "2NDEV <onboarding@resend.dev>";

export default class Mail {
  constructor() {
    this.mailOptions = { from: FROM, to: [] };
  }
  setCompanyName(name) { this.mailOptions.from = `${name} <${FROM.match(/<(.*)>/)?.[1] || FROM}>`; return this; }
  setSenderEmail(email) { this.mailOptions.from = `${this.mailOptions.from.split(" <")[0]} <${email}>`; return this; }
  setTo(receiver) { const l = this.mailOptions.to || []; Array.isArray(receiver) ? l.push(...receiver) : l.push(receiver); this.mailOptions.to = l; return this; }
  setCC(cc)  { this.mailOptions.cc  = [...(this.mailOptions.cc  || []), ...(Array.isArray(cc)?cc:[cc])]; return this; }
  setBCC(bcc){ this.mailOptions.bcc = [...(this.mailOptions.bcc || []), ...(Array.isArray(bcc)?bcc:[bcc])]; return this; }
  setSubject(subject) { this.mailOptions.subject = subject; return this; }
  setText(text) { this.mailOptions.text = text; return this; }
  setHTML(html) { this.mailOptions.html = html; return this; }

  async send() {
    try {
      const { data, error } = await resend.emails.send({
        from: this.mailOptions.from,
        to: this.mailOptions.to,
        cc: this.mailOptions.cc,
        bcc: this.mailOptions.bcc,
        subject: this.mailOptions.subject,
        html: this.mailOptions.html,
        text: this.mailOptions.text,
      });
      if (error) {
        console.error("❌ Email API error:", error);
        throw new Error(error.message || "Email API failed");
      }
      console.log("📧 Email sent:", data?.id);
      return data;
    } catch (err) {
      console.error("❌ Email send failed:", { message: err.message, stack: err.stack });
      throw err;
    }
  }
}
