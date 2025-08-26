const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Audit = require('../models/audit');

const getUsers = async () => User.find().select('-password');

const createUser = async (userData, creatingUser) => {
  const { username, email, password, role, branch } = userData;

  if (
    creatingUser.role === 'Admin' &&
    (role === 'SuperAdmin' || role === 'Admin')
  ) {
    const err = new Error('Admins can only create Ops Users.');
    err.statusCode = 403;
    throw err;
  }

  if (role === 'Ops User' && !branch) {
    const err = new Error('Branch is required for Ops Users.');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findOne({ username });
  if (user) {
    const err = new Error('User already exists');
    err.statusCode = 400;
    throw err;
  }

  const emailExists = await User.findOne({ email });
  if (emailExists) {
    const err = new Error('Email already exists');
    err.statusCode = 400;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const newUserDetails = {
    username,
    email,
    password: hashedPassword,
    role,
    isTemporaryPassword: true,
  };

  if (role === 'Ops User') {
    newUserDetails.branch = branch;
  }

  const newUser = new User(newUserDetails);
  const savedUser = await newUser.save();

  const audit = new Audit({
    user: creatingUser.id,
    action: 'Create User',
    details: `User ${username} created with role ${role}`,
  });
  await audit.save();

  const userToReturn = JSON.parse(JSON.stringify(savedUser));
  delete userToReturn.password;

  return userToReturn;
};

const changeUserPassword = async (
  userIdToUpdate,
  newPassword,
  changingUser
) => {
  const userToUpdate = await User.findById(userIdToUpdate);

  if (!userToUpdate) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  if (changingUser.role === 'Admin' && userToUpdate.role !== 'Ops User') {
    const err = new Error('Admins can only change Ops User passwords.');
    err.statusCode = 403;
    throw err;
  }

  if (
    changingUser.role === 'SuperAdmin' &&
    userToUpdate.role === 'SuperAdmin'
  ) {
    const err = new Error(
      "SuperAdmins cannot change another SuperAdmin's password."
    );
    err.statusCode = 403;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  userToUpdate.password = hashedPassword;
  userToUpdate.isTemporaryPassword = false;
  await userToUpdate.save();

  const audit = new Audit({
    user: changingUser.id,
    action: 'Change User Password',
    details: `Password for user ${userToUpdate.username} (ID: ${userIdToUpdate}) changed by ${changingUser.username}.`,
  });
  await audit.save();
};

const deleteUser = async (userIdToDelete, deletingUser) => {
  const userToDelete = await User.findById(userIdToDelete);

  if (!userToDelete) {
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }

  if (
    deletingUser.role === 'Admin' &&
    (userToDelete.role === 'SuperAdmin' || userToDelete.role === 'Admin')
  ) {
    const err = new Error('Admins can only delete Ops Users.');
    err.statusCode = 403;
    throw err;
  }

  if (
    userToDelete.role === 'SuperAdmin' &&
    deletingUser.role !== 'SuperAdmin'
  ) {
    const err = new Error('Cannot delete a SuperAdmin.');
    err.statusCode = 403;
    throw err;
  }

  await userToDelete.remove();

  const audit = new Audit({
    user: deletingUser.id,
    action: 'Delete User',
    details: `User ${userToDelete.username} (ID: ${userIdToDelete}) deleted`,
  });
  await audit.save();
};

module.exports = {
  getUsers,
  createUser,
  changeUserPassword,
  deleteUser,
};
