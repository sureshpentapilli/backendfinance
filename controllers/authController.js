const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Order = require('../models/Order');  // Import the Order model
const Vendor = require('../models/Vendor');
const Credit = require("../models/Credit");


const sendEmail = require('../config/email');
const upload = require('../config/multer');

// Register User (with image upload)
const path = require('path');

// Register User
const registerUser = async (req, res) => {
  upload.fields([
    { name: 'tradeLicense', maxCount: 1 },
    { name: 'auditedFinancials', maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      return res.status(400).send(err.message);
    }

    const { name, organizationName, email, password, creditRequired } = req.body;

    if (!name || !organizationName || !email || !password) {
      return res.status(400).send('Name, organization name, email, and password are required.');
    }

    if (!req.files.tradeLicense) {
      return res.status(400).send('Please upload a trade license image.');
    }

    if (creditRequired === 'true' && !req.files.auditedFinancials) {
      return res.status(400).send('Audited Financials is required when Credit Required is checked.');
    }

    try {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).send('Email already registered.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        organizationName,
        tradeLicense: `/uploads/${req.files.tradeLicense[0].filename}`,
        auditedFinancials: creditRequired === 'true'
          ? `/uploads/${req.files.auditedFinancials[0].filename}`
          : null,
        email,
        password: hashedPassword,
        registrationStatus: 'pending',
      });

      await newUser.save();

      if (creditRequired === 'true') {
        try {
            const newCredit = new Credit({
                userId: newUser._id,
            });
            await newCredit.save();
        } catch (creditError) {
            console.error('Error saving credit details:', creditError.message);
            return res.status(500).send('Failed to process credit details.');
        }
    }
    

      sendEmail(process.env.ADMIN_EMAIL, 'New User Registration', `Details:\nName: ${name}\nEmail: ${email}`);
      res.status(201).send('User registered successfully.');
    } catch (error) {
      console.error('Error registering user:', error.message);
      res.status(500).send('An error occurred while registering the user.');
    }
  });
};



// Login User (Ensure this is defined if you're using it)
// Login User
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Validate email and password
  if (!email || !password) {
    return res.status(400).send('Email and password are required.');
  }

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send('User not found.');
    }

    // Check if the user's registration status is approved
    if (user.registrationStatus.trim().toLowerCase() !== 'approved') {
      console.log('User registration status:', user.registrationStatus);
      return res.status(403).send('Your registration is not approved by the admin.');
    }

    // Compare the provided password with the stored hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).send('Invalid credentials.');
    }

    // Create a JWT token only if the user is approved
    const token = jwt.sign(
      { userId: user._id, email: user.email }, // Payload
      process.env.JWT_SECRET, // Secret key from environment variable
      { expiresIn: '1h' } // Token expiration time
    );

    // Return the JWT token
    res.status(200).json({ message: 'Login successful.', token });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).send('An error occurred while logging in the user.');
  }
};


const getMyCredit = async (req, res) => {
  const userId = req.user.id; // Assuming token authentication middleware adds the user ID to req.user
  console.log('User ID:', userId); // Debugging

  try {
    // Fetch credits and populate the userId field with name and email
    const credits = await Credit.find({ userId })
      .populate('userId', 'name email') // Populate name and email from User
      .exec();

    console.log("Credits with populated user details:", credits);

    if (!credits || credits.length === 0) {
      return res.status(404).json({ message: 'No credit records found for this user.' });
    }

    // Prepare response with necessary details (name, email, status, approvedDays)
    const formattedCredits = credits.map(credit => ({
      user: credit.userId, // Contains name and email
      status: credit.status,
      approvedDays: credit.approvedDays,
    }));

    res.status(200).json({
      message: 'Credit details fetched successfully.',
      credits: formattedCredits,
    });
  } catch (error) {
    console.error('Error fetching user credit details:', error.message);
    res.status(500).json({ message: 'Error fetching credit details.' });
  }
};







const getVendorsForUser = async (req, res) => {
  try {
    const vendors = await Vendor.find(); // Fetch all vendors
    res.status(200).json(vendors);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'An error occurred while fetching vendors.' });
  }
};

// Get Orders Placed
const getOrdersPlaced = async (req, res) => {
  const userId = req.user.id;
  const orders = await Order.find({ userId }).populate("vendorId", "name");
  res.json({ orders });
};

// Create a new order
const createOrder = async (req, res) => {
  console.log("User in request:", req.user);
  const { vendorId, numberOfUsers, yearsOfSupport, existingVendor, buyingPeriod } = req.body;

  if (!vendorId || !numberOfUsers || !yearsOfSupport || !buyingPeriod) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // Fetch user details to get the username
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create the new order
    const newOrder = new Order({
      userId: req.user._id, // Correct reference
      vendorId,
      numberOfUsers,
      yearsOfSupport,
      existingVendor,
      buyingPeriod,
    });

    const savedOrder = await newOrder.save();

    // Fetch vendor details
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Prepare the email content for the admin
    const emailContent = `
      A new order has been placed:

      Order ID: ${savedOrder._id}
      Vendor: ${vendor.name}
      Number of Users: ${numberOfUsers}
      Years of Support: ${yearsOfSupport}
      Existing Vendor: ${existingVendor}
      Buying Period: ${buyingPeriod}

      Placed by: ${user.name}
    `;

    // Send an email to the admin
    sendEmail(
      process.env.MAIL_USER, // Admin email address from environment variables
      'New Order Placed',
      emailContent
    );

    // Respond to the user
    res.status(201).json({ message: "Order created successfully and email sent to admin.", order: savedOrder });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ message: "Failed to create order" });
  }
};





// Fetch all orders for the logged-in user
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate("vendorId", "name details")
      .populate("userId", "name");

    // Map orders and attach `invoiceId` to each order object
    const ordersWithInvoiceId = orders.map((order) => ({
      ...order.toObject(), // Convert Mongoose document to plain JS object
      invoiceId: `INV-${order._id.toString()}` // Generate unique invoice ID
    }));

    res.status(200).json(ordersWithInvoiceId); // Send the updated data as JSON response
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};







// Download Invoice (dummy PDF generation)
const generateInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate("vendorId", "name details");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Create a new PDF document
    const doc = new PDFDocument();

    // Set headers and add table headers to the PDF
    doc.fontSize(16).text("Invoice", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Order ID: ${orderId}`);
    doc.text(`Username: ${req.user.username}`);
    doc.text(`Vendor: ${order.vendorId.name}`);
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    // Table Headers
    doc.text("No. of Users: " + order.numberOfUsers);
    doc.text("Years of Support: " + order.yearsOfSupport);
    doc.text("Existing Vendor: " + order.existingVendor);
    doc.text("Buying Period: " + order.buyingPeriod);

    // Finalize PDF and send it as a response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice_${orderId}.pdf`);
    doc.pipe(res);
    doc.end();
  } catch (error) {
    console.error("Error generating invoice:", error);
    res.status(500).json({ message: "Failed to generate invoice" });
  }
};







// Export the functions
module.exports = { registerUser, loginUser ,getMyCredit,getOrdersPlaced,generateInvoice,getVendorsForUser,createOrder,getOrders};

