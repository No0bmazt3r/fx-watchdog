const Branch = require('../models/branch');
const Audit = require('../models/audit');

const createBranch = async (branchName, creatingUser) => {
  const existingBranch = await Branch.findOne({ name: branchName });
  if (existingBranch) {
    const err = new Error('Branch with this name already exists.');
    err.statusCode = 400;
    throw err;
  }

  const newBranch = new Branch({ name: branchName });
  await newBranch.save();

  const audit = new Audit({
    user: creatingUser.id,
    action: 'Create Branch',
    details: `Branch ${branchName} created by ${creatingUser.username}.`,
  });
  await audit.save();

  return newBranch;
};

const getBranches = async () => {
  const branches = await Branch.find({});
  return branches;
};

const deleteBranch = async (branchId, deletingUser) => {
  const branchToDelete = await Branch.findById(branchId);

  if (!branchToDelete) {
    const err = new Error('Branch not found.');
    err.statusCode = 404;
    throw err;
  }

  await branchToDelete.remove();

  const audit = new Audit({
    user: deletingUser.id,
    action: 'Delete Branch',
    details: `Branch ${branchToDelete.name} (ID: ${branchId}) deleted by ${deletingUser.username}.`,
  });
  await audit.save();

  return { message: 'Branch deleted successfully.' };
};

module.exports = {
  createBranch,
  getBranches,
  deleteBranch,
};
