const express = require("express");
const {
  adminLogin,
  getAllUsers,
  manageUser,

  getVendors,
  addVendor,
  deleteVendor,
  getAllOrdersForAdmin,
  postCreditDetails,
  getCreditDetails,
  getUsersWithPendingCredit,
  rejectCredit,
  fetchCredits,
} = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require('../config/multer');

const router = express.Router();

// Admin login route (No middleware required here)
router.post("/login", adminLogin);

// Apply middleware for all routes below
router.use(authMiddleware, adminMiddleware);

// Get all users
router.get("/users", adminMiddleware, getAllUsers);

// Manage user (approve/reject)
router.put("/manageuser", adminMiddleware, manageUser);

router.get("/orders", adminMiddleware, getAllOrdersForAdmin);

// Vendor management routes
router.get("/vendors", adminMiddleware, getVendors);
router.post("/vendors", adminMiddleware,upload.single('vendorlogo'),  addVendor);
router.delete("/vendors/:vendorId", adminMiddleware, deleteVendor);
router.put("/credit/:id", adminMiddleware, postCreditDetails); // Update credit details
router.get("/credit", adminMiddleware, getCreditDetails); // Get credit details
router.get("/credit/pending", adminMiddleware, getUsersWithPendingCredit);
router.get("/creditfetch", adminMiddleware, fetchCredits);
router.put("/credit/reject/:id",adminMiddleware, rejectCredit);


module.exports = router;
