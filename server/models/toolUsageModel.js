import mongoose from 'mongoose';

const toolUsageSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  toolName: {
    type: String,
    required: true,
    enum: [
      'generateImage',
      'enhanceImage', 
      'removeBackground',
      'removeText',
      'uncropImage',
      'replaceBackground',
      'cleanup'
    ]
  },
  creditsUsed: {
    type: Number,
    required: true,
    default: 1
  },
  prompt: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  }
}, { 
  timestamps: true 
});


toolUsageSchema.index({ userId: 1, createdAt: -1 });
toolUsageSchema.index({ userId: 1, toolName: 1 });

const toolUsageModel = mongoose.models.toolUsage || mongoose.model("toolUsage", toolUsageSchema);

export default toolUsageModel;