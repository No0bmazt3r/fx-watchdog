module.exports = function(req, res, next) {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ msg: 'Access denied. Admins or SuperAdmins only.' });
  }
  next();
};