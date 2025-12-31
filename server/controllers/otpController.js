import EmailOtp from "../models/EmailOtp.js";
import User from "../models/userModel.js";
import { sendPixioOtpMail } from "../mail.js";

export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

   
    
    const user = await User.findOne({ email });
    

    await EmailOtp.deleteMany({ email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await EmailOtp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    await sendPixioOtpMail(email, otp);

    res.json({ message: "OTP sent" });
  } catch (err) {
    res.status(500).json({ message: "OTP not sent" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await EmailOtp.findOne({ email });

    if (!record || record.expiresAt < Date.now())
      return res.status(400).json({ message: "Invalid or expired OTP" });

    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    record.verified = true;
    await record.save();

    res.json({ message: "OTP verified" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
