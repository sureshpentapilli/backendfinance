const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  details: { type: String, required: true },
  website: { type: String, required: true },
  questions: [
    {
      question: { type: String, required: true },
      answer: { type: String }, // Optional for admin
    },
  ],
  vendorlogo: { type: String, required: true }, // Store image path
  userResponses: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      responses: [
        {
          questionId: mongoose.Schema.Types.ObjectId,
          answer: String,
        },
      ],
    },
  ],
});

const Vendor = mongoose.model("Vendor", vendorSchema);
module.exports = Vendor;
