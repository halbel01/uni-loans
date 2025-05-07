const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication failed: No token provided' });
    }

    try {
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { 
        userId: decodedToken.userId, 
        email: decodedToken.email,
        role: decodedToken.role
      };
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Authentication failed: Token expired', 
          expired: true 
        });
      }
      return res.status(401).json({ message: 'Authentication failed: Invalid token' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed' });
  }
}; 