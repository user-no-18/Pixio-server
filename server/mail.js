import nodemailer from "nodemailer";

/**
 * Create reusable transporter
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.PIXIO_EMAIL,
    pass: process.env.PIXIO_EMAIL_PASSWORD
  }
});

/**
 * Verify transporter on startup (optional but professional)
 */
transporter.verify((error) => {
  if (error) {
    console.error("❌ Pixio Mailer error:", error.message);
  } else {
    console.log("✅ Pixio Mailer ready");
  }
});

/**
 * Send OTP Email
 */
export const sendPixioOtpMail = async (email, otp) => {
  const mailOptions = {
    from: `"Pixio Security" <${process.env.PIXIO_EMAIL}>`,
    to: email,
    subject: "Pixio Email Verification Code",
    text: `Your Pixio verification code is ${otp}. This code will expire in 5 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; background:#0b0b0b; padding:24px;">
        <div style="max-width:420px;margin:auto;background:#111;border-radius:10px;padding:24px;">
          <h2 style="color:#ffffff;margin-bottom:8px;">Pixio Verification</h2>
          <p style="color:#b5b5b5;font-size:14px;">
            Use the following code to verify your email address.
          </p>

          <div style="margin:24px 0;text-align:center;">
            <span style="
              display:inline-block;
              font-size:28px;
              letter-spacing:6px;
              color:#ffffff;
              font-weight:600;
              background:#1a1a1a;
              padding:12px 20px;
              border-radius:8px;">
              ${otp}
            </span>
          </div>

          <p style="color:#9a9a9a;font-size:13px;">
            This code will expire in 5 minutes.  
            If you did not request this, you can safely ignore this email.
          </p>

          <hr style="border:none;border-top:1px solid #222;margin:20px 0;" />

          <p style="color:#666;font-size:12px;">
            © ${new Date().getFullYear()} Pixio. All rights reserved.
          </p>
        </div>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Pixio OTP mail failed:", error.message);
    return { success: false, error };
  }
};
