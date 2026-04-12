import config from "../../../common/config/index.js";
import logger from "../../../common/logger/logger.js";
import {
  transporter,
  resetPasswordTemplate,
  verifyEmailAddresTemplate,
} from "./mail.service.util.js";
class MailService {
  constructor() {
    this.from_address = config.resend.mailFrom;
    this.resend = transporter;
  }
  async sendEmail({ to, subject, html }) {
    try {
      const info = await this.resend.sendMail({
        from: this.from_address,
        to,
        subject,
        html,
      });
      console.log("Email sent successfully:", info.messageId);
      return info;
    } catch (error) {
      console.log(error);
      logger.error("Error sending email:", error);
    }
  }

  async sendVerificationEmailOtp(email, code) {
    return await this.sendEmail({
      to: email,
      subject: "Verify your email address",
      html: verifyEmailAddresTemplate(code),
    });
  }

  async sendPasswordResetEmailOtp(email, code) {
    return await this.sendEmail({
      to: email,
      subject: "Reset your password",
      html: resetPasswordTemplate(code),
    });
  }
}

export default new MailService();
