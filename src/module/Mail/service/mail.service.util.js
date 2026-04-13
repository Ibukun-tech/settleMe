import nodemailer from "nodemailer";
export const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  auth: {
    user: "walker.cassin44@ethereal.email",
    pass: "DMgdMuyD5saSXGesr7",
  },
});

export const verifyEmailAddresTemplate = (code) => {
  return `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Email Verification</h2>
        <p>Use the code below to verify your email address. It expires in <strong>5 minutes</strong>.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;
};

export const resetPasswordTemplate = (code) => {
  return `
      <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
        <h2>Password Reset</h2>
        <p>Use the code below to reset your password. It expires in <strong>5 minutes</strong>.</p>
        <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 24px 0;">
          ${code}
        </div>
        <p style="color: #888; font-size: 13px;">If you didn't request this, please secure your account immediately.</p>
      </div>
    `;
};
