const express = require('express');

const router = express.Router();
const auth = require('../middleware/auth');
const isAdminOrSuperAdmin = require('../middleware/isAdminOrSuperAdmin');
const userService = require('../services/userService');

// @route   GET /api/users
// @desc    Get all users
// @access  Admin/SuperAdmin
router.get('/', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    const users = await userService.getUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/users
// @desc    Create a new user
// @access  Admin/SuperAdmin
router.post('/', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    const userToReturn = await userService.createUser(req.body, req.user);
    res.status(201).json(userToReturn);
  } catch (err) {
    next(err);
  }
});

// @route   PATCH /api/users/:id/password
// @desc    Admin/SuperAdmin change another user's password
// @access  Admin/SuperAdmin
router.patch(
  '/:id/password',
  [auth, isAdminOrSuperAdmin],
  async (req, res, next) => {
    try {
      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res
          .status(400)
          .json({ msg: 'Password must be at least 6 characters long.' });
      }

      await userService.changeUserPassword(
        req.params.id,
        newPassword,
        req.user
      );
      res.json({ msg: 'User password updated successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Admin/SuperAdmin
router.delete('/:id', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    await userService.deleteUser(req.params.id, req.user);
    res.json({ msg: 'User deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
