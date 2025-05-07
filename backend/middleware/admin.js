module.exports = (req, res, next) => {
  // Check if user has admin role
  // console.log('Admin middleware check - User:', req.user);
  
  if (req.user && req.user.role === 'admin') {
    // console.log('Admin access granted');
    next();
  } else {
    // console.log('Admin access denied. User role:', req.user ? req.user.role : 'undefined');
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
}; 