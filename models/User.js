const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  organizationName: { type: String, required: true },
  tradeLicense: { type: String, required: true },  // This will store the image file path
  auditedFinancials: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  registrationStatus: { type: String, default: 'pending' },
  creditStatus: { 
    approvedDays: { type: Number, default: 0 },
    status: { type: String, default: 'pending' }
  },

},{ timestamps: true });

module.exports = mongoose.model('User', userSchema);
