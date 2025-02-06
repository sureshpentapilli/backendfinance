const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('../models/User');
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const Credit = require('../models/Credit');
const sendEmail = require('../config/email');
const upload = require('../config/multer');

// Admin Login
const adminLogin = (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return res.status(200).json({ message: 'Login successful', token });
  }

  res.status(401).json({ message: 'Invalid email or password.' });
};

// Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    console.log('Fetched users:', users);

    const updatedUsers = users.map(user => ({
      ...user._doc,
      tradeLicense: user.tradeLicense
      ? `${req.protocol}://${req.get('host')}${user.tradeLicense}`
      : null,
    
      auditedFinancials: user.auditedFinancials
       ? `${req.protocol}://${req.get('host')}${user.auditedFinancials}`
        : null,
    }));

    res.status(200).json(updatedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'An error occurred while fetching users.' });
  }
};


// Manage User Registration Status
const manageUser = async (req, res) => {
  const { userId, status } = req.body;
  console.log('Received userId:', userId);

  // Validate userId
  // if (!mongoose.Types.ObjectId.isValid(userId)) {
  //   return res.status(400).json({ message: 'Invalid user ID format.' });
  // }

  try {
    const user = await User.findById(userId);

    // Handle "User not found"
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Update user status
    user.registrationStatus = status;
    await user.save();

    // Send email notification if applicable
    if (user.email) {
      const emailSubject = 'Registration Status Update';
      const emailBody = `Dear ${user.name},\n\nYour registration status has been updated to: ${status}.\n\nThank you.`;
      await sendEmail(user.email, emailSubject, emailBody);
    }

    // Return updated list of users
    const allUsers = await User.find();
    res.status(200).json(allUsers);
  } catch (error) {
    console.error('Error updating status:', error.message);
    res.status(500).json({ message: 'An error occurred while updating user status.' });
  }
};






const postCreditDetails = async (req, res) => {
  const { id } = req.params;
  const { status, approvedDays } = req.body;

  try {
    console.log("Payload received:", { id, status, approvedDays }); // Debugging

    const credit = await Credit.findById(id); // Use findById instead of findOne
    if (!credit) {
      return res.status(404).json({ message: "Credit record not found." });
    }

    credit.status = status || credit.status;
    credit.approvedDays = status === "approved" ? approvedDays : 0;

    await credit.save();
    res.status(200).json({ message: "Credit details updated successfully.", credit });
  } catch (error) {
    console.error("Error updating credit details:", error.message);
    res.status(500).json({ message: "Error updating credit details." });
  }
};

const rejectCredit = async (req, res) => {
  const { id } = req.params;

  try {
    const credit = await Credit.findById(id);

    if (!credit) {
      return res.status(404).json({ message: "Credit record not found" });
    }

    if (credit.status === "rejected") {
      return res
        .status(400)
        .json({ message: "This credit request has already been rejected" });
    }

    credit.status = "rejected";
    credit.approvedDays = 0; // Reset approvedDays on rejection, if needed
    await credit.save();

    res.status(200).json({ message: "Credit rejected successfully", credit });
  } catch (error) {
    console.error("Error rejecting credit:", error.message);
    res.status(500).json({ message: "Failed to reject credit" });
  }
};


// Get Credit Details
const getCreditDetails = async (req, res) => {
  const { id } = req.params;

  try {
    const credit = await Credit.findOne({ id }).populate('userId', 'name email');
    if (!credit) {
      return res.status(404).json({ message: 'Credit record not found.' });
    }

    res.status(200).json({
      message: 'Credit details fetched successfully.',
      credit,
    });
  } catch (error) {
    console.error('Error fetching credit details:', error.message);
    res.status(500).json({ message: 'Error fetching credit details.' });
  }
};




// Get All Orders


// Fetch all orders with user and vendor details
const getAllOrdersForAdmin = async (req, res) => {
  try {
    // Fetch all orders and populate user and vendor details
    const orders = await Order.find()
      .populate('userId', 'name email') // Populate user details
      .populate('vendorId', 'name details'); // Populate vendor details

    res.status(200).json({
      message: 'Orders fetched successfully.',
      orders,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders.' });
  }
};



// Vendor Management
const getVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addVendor = async (req, res) => {
  try {
    const { name, details, website, questions } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Vendor logo upload is required" });
    }

    // Ensure the path is stored correctly (relative path)
    const vendorlogo = `/uploads/${req.file.filename}`;

    let parsedQuestions = [];
    if (questions) {
      try {
        if (typeof questions === 'string') {
          parsedQuestions = JSON.parse(questions);
        } else {
          parsedQuestions = questions;
        }

        if (!Array.isArray(parsedQuestions)) {
          return res.status(400).json({ message: "Questions should be an array" });
        }

        for (let index = 0; index < parsedQuestions.length; index++) {
          const q = parsedQuestions[index];
          if (!q.question || typeof q.question !== 'string') {
            return res.status(400).json({ message: `Question at index ${index} is invalid` });
          }
        }
      } catch (err) {
        return res.status(400).json({ message: "Invalid questions format" });
      }
    }

    const vendor = new Vendor({
      name,
      details,
      website,
      questions: parsedQuestions,
      vendorlogo, // Store only the relative path
    });

    await vendor.save();
    res.status(201).json({ message: "Vendor added successfully", vendor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};







const deleteVendor = async (req, res) => {
  const { vendorId } = req.params;

  try {
    await Vendor.findByIdAndDelete(vendorId);
    res.status(200).json({ message: 'Vendor deleted.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



const getUsersWithPendingCredit = async (req, res) => {
  try {
    const credits = await Credit.find({ status: "pending" })
      .populate("userId", "name email auditedFinancials")
      .where("userId.auditedFinancials")
      .ne(null);

    if (!credits || credits.length === 0) {
      return res.status(404).json({ message: "No pending credits with audited financials found." });
    }

    res.status(200).json({
      message: "Pending credits fetched successfully.",
      credits,
    });
  } catch (error) {
    console.error("Error fetching credits:", error.message);
    res.status(500).json({ message: "Error fetching credits." });
  }
};

// Backend API to fetch credits
const fetchCredits = async (req, res) => {
  try {
    const credits = await Credit.find()
      .populate({
        path: 'userId',
        match: { auditedFinancials: { $ne: null } },
        select: 'name email',
      })
      .exec();

    const filteredCredits = credits.filter((credit) => credit.userId !== null);

    if (filteredCredits.length === 0) {
      return res.status(404).send('No credits found for users with audited financials uploaded.');
    }

    res.status(200).json({ credits: filteredCredits });
  } catch (error) {
    console.error('Error fetching credits:', error.message);
    res.status(500).send('An error occurred while fetching credits.');
  }
};








module.exports = {
  adminLogin,
  getAllUsers,
  manageUser,
  // getCredits,
  // postCreditStatus,
  // getAllOrders,
  getVendors,
  addVendor,
  deleteVendor,
  // registerUser,
  getAllOrdersForAdmin,
  postCreditDetails,
  getCreditDetails,
  getUsersWithPendingCredit,
  // fetchUsersWithCreditRequired
  fetchCredits,
  rejectCredit
};
