const express = require('express');

const router = express.Router();
const auth = require('../middleware/auth');
const isAdminOrSuperAdmin = require('../middleware/isAdminOrSuperAdmin');
const branchService = require('../services/branchService');

// @route   POST /api/branches
// @desc    Create a new branch
// @access  Admin/SuperAdmin
router.post('/', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ msg: 'Branch name is required.' });
    }
    const branch = await branchService.createBranch(name, req.user);
    res.status(201).json(branch);
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/branches
// @desc    Get all branches
// @access  Admin/SuperAdmin
router.get('/', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    const branches = await branchService.getBranches();
    res.json(branches);
  } catch (err) {
    next(err);
  }
});

// @route   DELETE /api/branches/:id
// @desc    Delete a branch
// @access  SuperAdmin
router.delete('/:id', [auth, isAdminOrSuperAdmin], async (req, res, next) => {
  try {
    // Ensure only SuperAdmin can delete branches
    if (req.user.role !== 'SuperAdmin') {
      return res.status(403).json({ msg: 'Access denied. SuperAdmins only.' });
    }
    const result = await branchService.deleteBranch(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
