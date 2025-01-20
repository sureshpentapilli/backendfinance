const express = require('express');
const { registerUser, loginUser, getMyCredit, getOrdersPlaced, generateInvoice,getVendorsForUser,createOrder,getOrders } = require('../controllers/authController'); // Ensure this import is correct
const router = express.Router();
const authenticate = require('../middleware/authMiddleware'); 

router.post('/register', registerUser);  // Ensure `registerUser` is defined and imported
router.post('/login', loginUser);        // Ensure `loginUser` is defined and imported

router.get('/mycredit', authenticate, getMyCredit);
router.get('/orders', authenticate, getOrdersPlaced);
router.get('/generateinvoice/:orderId', authenticate, generateInvoice);
router.get('/vendors', authenticate, getVendorsForUser);

router.post("/createorder", authenticate, createOrder); // POST an order
router.get("/getorder", authenticate, getOrders); 



module.exports = router;
