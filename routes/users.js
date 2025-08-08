
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Audit = require('../models/audit');

// @route   POST /api/users
// @desc    Create a new user
router.post('/', async (req, res) => {
  const { username, password, role } = req.body;

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
      role
    });

    const savedUser = await newUser.save();

    // Create an audit log
    const audit = new Audit({
      user: savedUser._id, // Assuming the admin user ID is available in req.user.id
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

module.exports = router;
