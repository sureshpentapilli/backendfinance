const Order = require("../models/Order");

exports.placeOrder = async (req, res) => {
  const { vendorId, numberOfUsers, yearsOfSupport, existingVendor, buyingPeriod } = req.body;

  const order = new Order({
    userId: req.user.id,
    vendorId,
    numberOfUsers,
    yearsOfSupport,
    existingVendor,
    buyingPeriod,
  });

  await order.save();
  res.json(order);
};
