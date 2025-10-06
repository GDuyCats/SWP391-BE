// utils/mailer.js
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// from phải đúng format. Với free dùng luôn onboarding@resend.dev
const FROM = process.env.RESEND_FROM || "2NDEV <onboarding@resend.dev>";

export default class Mail {
  constructor() {
    this.mailOptions = { from: FROM, to: [] };
  }
  setTo(r){ const l=this.mailOptions.to||[]; Array.isArray(r)?l.push(...r):l.push(r); this.mailOptions.to=l; return this; }
  setSubject(s){ this.mailOptions.subject=s; return this; }
  setHTML(h){ this.mailOptions.html=h; return this; }
  setText(t){ this.mailOptions.text=t; return this; }

  async send() {
    const { data, error } = await resend.emails.send({
      from: this.mailOptions.from,
      to: this.mailOptions.to,
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
  }
}
