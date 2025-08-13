const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const isAdminOrSuperAdmin = require('../middleware/isAdminOrSuperAdmin');
const User = require('../models/user');
const Audit = require('../models/audit');

// @route   GET /api/users
// @desc    Get all users
// @access  Admin/SuperAdmin
router.get('/', [auth, isAdminOrSuperAdmin], async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Admin/SuperAdmin
router.post('/', [auth, isAdminOrSuperAdmin], async (req, res) => {
  const { username, email, password, role, branch } = req.body;

  // Prevent Admins from creating SuperAdmins or other Admins
  if (req.user.role === 'Admin' && (role === 'SuperAdmin' || role === 'Admin')) {
    return res.status(403).json({ msg: 'Admins can only create Ops Users.' });
  }

  // Validate that branch is provided for Ops User
  if (role === 'Ops User' && !branch) {
    return res.status(400).json({ msg: 'Branch is required for Ops Users.' });
  }

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }
    
    let emailExists = await User.findOne({ email });
    if (emailExists) {
        return res.status(400).json({ msg: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUserDetails = {
      username,
      email,
      password: hashedPassword,
      role,
      isTemporaryPassword: true
    };

    if (role === 'Ops User') {
      newUserDetails.branch = branch;
    }

    const newUser = new User(newUserDetails);
    const savedUser = await newUser.save();

    const audit = new Audit({
      user: req.user.id,
      action: 'Create User',
      details: `User ${username} created with role ${role}`
    });
    await audit.save();

    // Return user without password
    const userToReturn = JSON.parse(JSON.stringify(savedUser));
    delete userToReturn.password;

    res.json(userToReturn);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PATCH /api/users/:id/password
// @desc    Admin/SuperAdmin change another user's password
// @access  Admin/SuperAdmin
router.patch('/:id/password', [auth, isAdminOrSuperAdmin], async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ msg: 'New password is required.' });
  }

  try {
    const userToUpdate = await User.findById(req.params.id);

    if (!userToUpdate) {
      return res.status(404).json({ msg: 'User not found.' });
    }

    // Granular access control for password changes
    if (req.user.role === 'Admin') {
      // Admin can only change Ops User passwords
      if (userToUpdate.role !== 'Ops User') {
        return res.status(403).json({ msg: 'Admins can only change Ops User passwords.' });
      }
    } else if (req.user.role === 'SuperAdmin') {
      // SuperAdmin can change Admin or Ops User passwords, but not another SuperAdmin's
      if (userToUpdate.role === 'SuperAdmin') {
        return res.status(403).json({ msg: "SuperAdmins cannot change another SuperAdmin's password." });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    userToUpdate.password = hashedPassword;
    userToUpdate.isTemporaryPassword = false;
    await userToUpdate.save(); // Use save() to trigger pre-save hooks if any (though none exist currently)

    const audit = new Audit({
      user: req.user.id,
      action: 'Change User Password',
      details: `Password for user ${userToUpdate.username} (ID: ${req.params.id}) changed by ${req.user.username}.`
    });
    await audit.save();

    res.json({ msg: 'User password updated successfully.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Admin/SuperAdmin
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

    // Prevent anyone but SuperAdmin from deleting a SuperAdmin
    if (userToDelete.role === 'SuperAdmin' && req.user.role !== 'SuperAdmin') {
        return res.status(403).json({ msg: 'Cannot delete a SuperAdmin.' });
    }

    await userToDelete.remove();

    const audit = new Audit({
        user: req.user.id,
        action: 'Delete User',
        details: `User ${userToDelete.username} (ID: ${req.params.id}) deleted`
    });
    await audit.save();

    res.json({ msg: 'User deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;