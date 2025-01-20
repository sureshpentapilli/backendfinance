const express = require("express");
const { getVendors, submitConfigurator } = require("../controllers/vendorController");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/", authMiddleware, getVendors);
router.post("/configurator", authMiddleware, submitConfigurator);

module.exports = router;
