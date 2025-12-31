import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import transactionModel from "../models/transactionModel.js"
dotenv.config();
import validator from "validator";
import admin from "../config/firebase.js";

const getTokenFromRequest = (req) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && /^Bearer$/i.test(parts[0])) {
      return parts[1];
    }
  }
  if (req.headers.token) return req.headers.token;
  if (req.body && req.body.token) return req.body.token;
  return null;
};

const verifyJwt = (token) => {
  if (!token) throw new Error("No token provided");
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    throw err;
  }
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing details" });
    }

    const existing = await userModel.findOne({ email });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new userModel({ name, email, password: hashedPassword });
    const user = await newUser.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Register Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing details" });
    }

    const user = await userModel.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    return res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


const userCredits = async (req, res) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });

    let decoded;
    try {
      decoded = verifyJwt(token);
    } catch (err) {
      console.error("JWT verify failed (credits):", err.message);
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const userId = decoded.id;
    const user = await userModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.json({
      success: true,
      credits: user.creditBalance || 0,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("userCredits Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Initialize Razorpay
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


const PLANS = {
  Basic: { price: 10, credits: 100 },
  Advanced: { price: 50, credits: 500 },
  Business: { price: 250, credits: 5000 },
};

const paymentRazorpay = async (req, res) => {
  try {
    const { planId } = req.body;
    
    const token = getTokenFromRequest(req);
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });

    let decoded;
    try {
      decoded = verifyJwt(token);
    } catch (err) {
      console.error("Jwt verification failed", err.message);
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const userId = decoded.id;
    const user = await userModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    const plan = PLANS[planId];
    

    const date = Date.now();
    const transactionData = {
      amount: plan.price * 100, 
      currency: "INR",
      receipt: `receipt_order_${date}`,
      notes: {
        userId: userId.toString(),
        planId: planId,
        credits: plan.credits.toString(),
      },
    };

    const order = await razorpayInstance.orders.create(transactionData);

    // This is temporary  block to prevent misuse of test mode .
const TEST_MODE_ONE_PURCHASE_PER_DAY = true;

if (TEST_MODE_ONE_PURCHASE_PER_DAY) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const alreadyPurchased = await transactionModel.findOne({
    userId,
    date: { $gte: today },
    payment: true,
  });

  if (alreadyPurchased) {
    return res.status(400).json({
      success: false,
      message: "Only one purchase allowed per day",
    });
  }
}
//upto this


    return res.json({
      success: true,
      order,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay create order error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const verifyRazorpay = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing payment verification fields",
      });
    }

    const token = getTokenFromRequest(req);
    if (!token)
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });

    let decoded;
    try {
      decoded = verifyJwt(token);
    } catch (err) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid or expired token" });
    }

    const orderData = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(orderData.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed (signature mismatch)",
      });
    }

    const userId = decoded.id;
    const user = await userModel.findById(userId);
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
// temporary block I will modify it later if Website verified for live mode
    const TEST_MODE_SINGLE_CREDIT = true;
    const TEST_MODE_ONE_PURCHASE_PER_DAY = true;

    if (TEST_MODE_ONE_PURCHASE_PER_DAY) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const alreadyPurchased = await transactionModel.findOne({
        userId,
        date: { $gte: today },
        payment: true,
      });

      if (alreadyPurchased) {
        return res.status(400).json({
          success: false,
          message: "Only one purchase allowed per day",
        });
      }
    }

    const existingTxn = await transactionModel.findOne({
      razorpayPaymentId: razorpay_payment_id,
    });

    if (existingTxn) {
      return res.status(400).json({
        success: false,
        message: "Payment already processed",
      });
    }

    const order = await razorpayInstance.orders.fetch(razorpay_order_id);
    const planId = order?.notes?.planId;

    let creditsToAdd = parseInt(order?.notes?.credits || "0", 10);

    //temporary 
    if (TEST_MODE_SINGLE_CREDIT) {
      creditsToAdd = 1;
    }

    await transactionModel.create({
      userId,
      plan: planId,
      amount: order.amount,
      credits: creditsToAdd,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      payment: true,
    });

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $inc: { creditBalance: creditsToAdd } },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Payment verified successfully",
      credits: updatedUser.creditBalance,
      creditsAdded: creditsToAdd,
      planId,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

 const googleAuth = async (req, res) => {
  // try {
  //   const { idToken } = req.body;

    
  //   if (!idToken) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "Google ID token is required",
  //     });
  //   }

   
  //   const decodedToken = await admin.auth().verifyIdToken(idToken);

  //   const { email, name, uid } = decodedToken;

  //   if (!email) {
  //     return res.status(400).json({
  //       success: false,
  //       message: "Email not found in Google account",
  //     });
  //   }

   
  //   let user = await userModel.findOne({ email });

    
  //   if (!user) {
  //     user = await userModel.create({
  //       name: name || "Google User",
  //       email,
  //       password: null,        
  //       creditBalance: 5,    
  //       authProvider: "google" 
  //     });
  //   }

    
  //   const token = jwt.sign(
  //     { id: user._id },
  //     process.env.JWT_SECRET,
  //     { expiresIn: "7d" }
  //   );


  //   return res.status(200).json({
  //     success: true,
  //     token,
  //     user: {
  //       id: user._id,
  //       name: user.name,
  //       email: user.email,
  //       creditBalance: user.creditBalance,
  //     },
  //   });

  // } catch (error) {
  //   console.error("Google Auth Error:", error.message);
  //   return res.status(401).json({
  //     success: false,
  //     message: "Google authentication failed",
  //   });
  // }
    return res.status(503).json({
    success: false,
    message: "Google authentication temporarily unavailable",
  });
};


export {
  registerUser,
  loginUser,
  userCredits,
  paymentRazorpay,
  verifyRazorpay,
   googleAuth,
};
