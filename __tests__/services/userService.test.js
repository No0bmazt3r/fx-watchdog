const userService = require('../../services/userService');
const User = require('../../models/user');
const Audit = require('../../models/audit');
const bcrypt = require('bcryptjs');

// Mock Mongoose models
jest.mock('../../models/user');
jest.mock('../../models/audit');
jest.mock('bcryptjs');

describe('userService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return all users excluding passwords', async () => {
      const mockUsers = [
        { username: 'test1', email: 'test1@example.com', role: 'Ops User' },
        { username: 'test2', email: 'test2@example.com', role: 'Admin' },
      ];
      User.find.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUsers),
      });

      const users = await userService.getUsers();
      expect(users).toEqual(mockUsers);
      expect(User.find).toHaveBeenCalledTimes(1);
      expect(User.find().select).toHaveBeenCalledWith('-password');
    });
  });

  describe('createUser', () => {
    const mockCreatingUser = { id: 'adminId', role: 'SuperAdmin' };

    it('should create a new user successfully', async () => {
      User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null); // No existing user or email
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');
      User.prototype.save = jest.fn().mockResolvedValue({
        username: 'newUser',
        email: 'new@example.com',
        role: 'Ops User',
        isTemporaryPassword: true,
      });

      const userData = {
        username: 'newUser',
        email: 'new@example.com',
        password: 'password123',
        role: 'Ops User',
        branch: 'Main Branch',
      };

      const newUser = await userService.createUser(userData, mockCreatingUser);

      expect(User.findOne).toHaveBeenCalledTimes(2);
      expect(User.findOne).toHaveBeenCalledWith({ username: 'newUser' });
      expect(User.findOne).toHaveBeenCalledWith({ email: 'new@example.com' });
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 'salt');
      expect(User.prototype.save).toHaveBeenCalledTimes(1);
      expect(Audit.prototype.save).toHaveBeenCalledTimes(1);
      expect(newUser.username).toBe('newUser');
      expect(newUser.password).toBeUndefined(); // Password should be removed
    });

    it('should throw an error if username already exists', async () => {
      User.findOne.mockResolvedValueOnce({ username: 'existingUser' });

      const userData = {
        username: 'existingUser',
        email: 'new@example.com',
        password: 'password123',
        role: 'Ops User',
        branch: 'Main Branch',
      };

      await expect(userService.createUser(userData, mockCreatingUser)).rejects.toThrow('User already exists');
      expect(User.findOne).toHaveBeenCalledWith({ username: 'existingUser' });
      expect(User.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if email already exists', async () => {
      User.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ email: 'existing@example.com' });

      const userData = {
        username: 'newUser',
        email: 'existing@example.com',
        password: 'password123',
        role: 'Ops User',
        branch: 'Main Branch',
      };

      await expect(userService.createUser(userData, mockCreatingUser)).rejects.toThrow('Email already exists');
      expect(User.findOne).toHaveBeenCalledWith({ username: 'newUser' });
      expect(User.findOne).toHaveBeenCalledWith({ email: 'existing@example.com' });
      expect(User.findOne).toHaveBeenCalledTimes(2);
    });

    it('should throw an error if Admin tries to create SuperAdmin', async () => {
      const adminUser = { id: 'adminId', role: 'Admin' };
      const userData = {
        username: 'super',
        email: 'super@example.com',
        password: 'password123',
        role: 'SuperAdmin',
      };

      await expect(userService.createUser(userData, adminUser)).rejects.toThrow('Admins can only create Ops Users.');
    });

    it('should throw an error if Ops User role is selected without branch', async () => {
      const userData = {
        username: 'ops',
        email: 'ops@example.com',
        password: 'password123',
        role: 'Ops User',
        branch: '',
      };

      await expect(userService.createUser(userData, mockCreatingUser)).rejects.toThrow('Branch is required for Ops Users.');
    });
  });

  describe('changeUserPassword', () => {
    const mockChangingUser = { id: 'adminId', role: 'SuperAdmin' };
    const mockUserToUpdate = { id: 'userId', username: 'userToUpdate', role: 'Ops User', save: jest.fn() };

    it('should change user password successfully', async () => {
      User.findById.mockResolvedValue(mockUserToUpdate);
      bcrypt.genSalt.mockResolvedValue('salt');
      bcrypt.hash.mockResolvedValue('hashedPassword');

      await userService.changeUserPassword('userId', 'newPassword123', mockChangingUser);

      expect(User.findById).toHaveBeenCalledWith('userId');
      expect(bcrypt.genSalt).toHaveBeenCalledWith(10);
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123', 'salt');
      expect(mockUserToUpdate.password).toBe('hashedPassword');
      expect(mockUserToUpdate.isTemporaryPassword).toBe(false);
      expect(mockUserToUpdate.save).toHaveBeenCalledTimes(1);
      expect(Audit.prototype.save).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if user to update is not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(userService.changeUserPassword('nonExistentId', 'newPassword', mockChangingUser)).rejects.toThrow('User not found.');
    });

    it('should throw an error if Admin tries to change non-Ops User password', async () => {
      const adminUser = { id: 'adminId', role: 'Admin' };
      const userToUpdate = { id: 'userId', role: 'Admin' };
      User.findById.mockResolvedValue(userToUpdate);

      await expect(userService.changeUserPassword('userId', 'newPassword', adminUser)).rejects.toThrow('Admins can only change Ops User passwords.');
    });

    it('should throw an error if SuperAdmin tries to change another SuperAdmin password', async () => {
      const superAdminUser = { id: 'superAdminId', role: 'SuperAdmin' };
      const userToUpdate = { id: 'userId', role: 'SuperAdmin' };
      User.findById.mockResolvedValue(userToUpdate);

      await expect(userService.changeUserPassword('userId', 'newPassword', superAdminUser)).rejects.toThrow("SuperAdmins cannot change another SuperAdmin's password.");
    });
  });

  describe('deleteUser', () => {
    const mockDeletingUser = { id: 'adminId', role: 'SuperAdmin' };
    const mockUserToDelete = { id: 'userId', username: 'userToDelete', role: 'Ops User', remove: jest.fn() };

    it('should delete user successfully', async () => {
      User.findById.mockResolvedValue(mockUserToDelete);

      await userService.deleteUser('userId', mockDeletingUser);

      expect(User.findById).toHaveBeenCalledWith('userId');
      expect(mockUserToDelete.remove).toHaveBeenCalledTimes(1);
      expect(Audit.prototype.save).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if user to delete is not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(userService.deleteUser('nonExistentId', mockDeletingUser)).rejects.toThrow('User not found');
    });

    it('should throw an error if Admin tries to delete SuperAdmin', async () => {
      const adminUser = { id: 'adminId', role: 'Admin' };
      const userToDelete = { id: 'userId', role: 'SuperAdmin' };
      User.findById.mockResolvedValue(userToDelete);

      await expect(userService.deleteUser('userId', adminUser)).rejects.toThrow('Admins can only delete Ops Users.');
    });

    it('should throw an error if non-SuperAdmin tries to delete SuperAdmin', async () => {
      const opsUser = { id: 'opsId', role: 'Ops User' };
      const userToDelete = { id: 'userId', role: 'SuperAdmin' };
      User.findById.mockResolvedValue(userToDelete);

      await expect(userService.deleteUser('userId', opsUser)).rejects.toThrow('Cannot delete a SuperAdmin.');
    });
  });
});
