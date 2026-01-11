import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  plan: { type: String, required: true },
  amount: { type: Number, required: true },
  credits: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  payment: { type: Boolean, default: false },
  razorpayOrderId: { type: String },     
  razorpayPaymentId: { type: String }    
});

const transactionModel = mongoose.models.transaction || mongoose.model("transaction", transactionSchema);

export default transactionModel;