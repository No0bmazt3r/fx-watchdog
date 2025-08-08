
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Audit = require('../models/audit');
const auth = require('../middleware/auth');

// Middleware to check for Admin or SuperAdmin role
const isAdminOrSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin' && req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ msg: 'Access denied. Admin or SuperAdmin role required.' });
  }
  next();
};

// Middleware to check for SuperAdmin role
const isSuperAdmin = (req, res, next) => {
  if (req.user.role !== 'SuperAdmin') {
    return res.status(403).json({ msg: 'Access denied. SuperAdmin role required.' });
  }
  next();
};

// @route   POST /api/users
// @desc    Create a new user (Admin or SuperAdmin)
router.post('/', [auth, isAdminOrSuperAdmin], async (req, res) => {
  const { username, password, role } = req.body;

  // Prevent Admins from creating SuperAdmins or other Admins
  if (req.user.role === 'Admin' && (role === 'SuperAdmin' || role === 'Admin')) {
    return res.status(403).json({ msg: 'Admins can only create Ops Users.' });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      password: hashedPassword,
      role,
      isTemporaryPassword: true
    });

    const savedUser = await newUser.save();

    const audit = new Audit({
      user: req.user.id,
      action: 'Create User',
      details: `User ${username} created with role ${role}`
    });
    await audit.save();

    res.json(savedUser);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user (Admin or SuperAdmin)
router.delete('/:id', [auth, isAdminOrSuperAdmin], async (req, res) => {
  try {
    const userToDelete = await User.findById(req.params.id);
    if (!userToDelete) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Prevent Admins from deleting SuperAdmins or other Admins
    if (req.user.role === 'Admin' && (userToDelete.role === 'SuperAdmin' || userToDelete.role === 'Admin')) {
      return res.status(403).json({ msg: 'Admins can only delete Ops Users.' });
    }

    // Prevent anyone from deleting a SuperAdmin
    if (userToDelete.role === 'SuperAdmin') {
        return res.status(403).json({ msg: 'SuperAdmins cannot be deleted.' });
    }

    await User.findByIdAndDelete(req.params.id);

    const audit = new Audit({
      user: req.user.id,
      action: 'Delete User',
      details: `User ${userToDelete.username} deleted`
    });
    await audit.save();

    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
