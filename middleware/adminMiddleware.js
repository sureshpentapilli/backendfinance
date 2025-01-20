const jwt = require('jsonwebtoken');

const adminAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'Authorization header missing.' });
  }

  // Ensure the header is in the format: Bearer <token>
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized access. No token provided.' });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if the decoded email matches the admin email in .env
    if (decoded.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    // Attach admin info to the request object
    req.admin = { email: decoded.email };

    // Proceed to the next function (controller)
    next();
  } catch (error) {
    // Log the specific error message for debugging
    console.error('Token verification failed:', error.message);

    // Handle specific error cases (e.g., token expired or malformed)
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please login again.' });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token. Please provide a valid token.' });
    }

    // General fallback for other errors
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = adminAuthMiddleware;
