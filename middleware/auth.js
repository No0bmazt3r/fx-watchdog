const jwt = require('jsonwebtoken');
const config = require('../config');

module.exports = function auth(req, res, next) {
  // Get token from header
  let token = req.header('x-auth-token');

  // Support standard "Bearer" token
  const authHeader = req.header('Authorization');
  if (!token && authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  // Check if no token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
