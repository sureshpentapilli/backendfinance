const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  details: { type: String ,required: true }, // Add details field
  products: { type: [String], required: true },
});

module.exports = mongoose.model("Vendor", vendorSchema);
