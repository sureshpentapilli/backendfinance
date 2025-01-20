const Order = require('./models/Order');  // Import the Order model
const Vendor = require('./models/Vendor'); // Import the Vendor model
const sendEmail = require('../config/email');
// Import sendEmail function (ensure this exists)

exports.submitConfigurator = async (req, res) => {
  try {
    const { vendorId, numberOfUsers, yearsOfSupport, existingVendor, buyingPeriod } = req.body;

    // Check if all required fields are present
    if (!vendorId || !numberOfUsers || !yearsOfSupport || !existingVendor || !buyingPeriod) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if the vendor exists
    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Create a new order with the provided details
    const order = await Order.create({
      userId: req.user.id,
      vendorId,
      numberOfUsers,
      yearsOfSupport,
      existingVendor,
      buyingPeriod,
    });

    // Notify Admin via Email
    const adminEmail = "sureshkumarsk72746@gmail.com";
    const emailBody = `
      New Configurator Submission:
      Vendor: ${vendor.name}
      Users: ${numberOfUsers}
      Support: ${yearsOfSupport} years
      Existing Vendor: ${existingVendor}
      Buying Period: ${buyingPeriod}
    `;
    await sendEmail(adminEmail, "Configurator Submission", emailBody);

    res.json({ message: "Configurator submitted successfully" });
  } catch (error) {
    console.error('Error submitting configurator:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


exports.getVendors = async (req, res) => {
  try {
    // Fetch all vendors from the database
    const vendors = await Vendor.find();
    
    if (!vendors || vendors.length === 0) {
      return res.status(404).json({ message: 'No vendors found' });
    }

    // Return the list of vendors
    res.json({ vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
