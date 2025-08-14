const submissionService = require('../../services/submissionService');
const Upload = require('../../models/upload');
const ExchangeRate = require('../../models/exchangeRate');
const Audit = require('../../models/audit');
const mongoose = require('mongoose');

// Mock Mongoose models
jest.mock('../../models/upload');
jest.mock('../../models/exchangeRate');
jest.mock('../../models/audit');

// Mock mongoose session
const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

jest.spyOn(mongoose, 'startSession').mockResolvedValue(mockSession);

describe('submissionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.startTransaction.mockClear();
    mockSession.commitTransaction.mockClear();
    mockSession.abortTransaction.mockClear();
    mockSession.endSession.mockClear();
  });

  describe('submitExtractedData', () => {
    const mockUser = { id: 'userId' };
    const mockUploadId = 'uploadId123';
    const mockExtractedData = {
      date: '2025-01-01',
      time: '10:00',
      branch: 'Main Branch',
      rates: { USD: 1.0, EUR: 0.9 },
    };
    const mockSubmissionData = {
      uploadId: mockUploadId,
      extractedData: mockExtractedData,
    };

    it('should successfully submit extracted data', async () => {
      const mockUpload = {
        _id: mockUploadId,
        status: 'Pending',
        filename: 'test.jpg',
        save: jest.fn().mockResolvedValue(true),
      };
      Upload.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(mockUpload) });
      ExchangeRate.insertMany.mockResolvedValue([{}, {}]);
      Audit.prototype.save = jest.fn().mockResolvedValue(true);

      const result = await submissionService.submitExtractedData(
        mockSubmissionData,
        mockUser
      );

      expect(mongoose.startSession).toHaveBeenCalledTimes(1);
      expect(mockSession.startTransaction).toHaveBeenCalledTimes(1);
      expect(Upload.findById).toHaveBeenCalledWith(mockUploadId);
      expect(mockUpload.status).toBe('Completed');
      expect(mockUpload.save).toHaveBeenCalledTimes(1);
      expect(ExchangeRate.insertMany).toHaveBeenCalledTimes(1);
      expect(Audit.prototype.save).toHaveBeenCalledTimes(1);
      expect(mockSession.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
      expect(result.upload).toEqual(mockUpload);
      expect(result.savedRates).toEqual([{}, {}]);
    });

    it('should throw an error if upload record not found', async () => {
      Upload.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });

      await expect(
        submissionService.submitExtractedData(mockSubmissionData, mockUser)
      ).rejects.toThrow('Upload record not found or access denied.');

      expect(mongoose.startSession).toHaveBeenCalledTimes(1);
      expect(mockSession.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.abortTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it('should throw an error if upload status is already Completed', async () => {
      const mockUpload = { _id: mockUploadId, status: 'Completed' };
      Upload.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(mockUpload) });

      await expect(
        submissionService.submitExtractedData(mockSubmissionData, mockUser)
      ).rejects.toThrow('This upload has already been submitted and completed.');

      expect(mongoose.startSession).toHaveBeenCalledTimes(1);
      expect(mockSession.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.abortTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });

    it('should handle errors during transaction and abort', async () => {
      Upload.findById.mockImplementation(() => {
        throw new Error('Database error');
      });

      await expect(
        submissionService.submitExtractedData(mockSubmissionData, mockUser)
      ).rejects.toThrow('Database error');

      expect(mongoose.startSession).toHaveBeenCalledTimes(1);
      expect(mockSession.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.abortTransaction).toHaveBeenCalledTimes(1);
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    });
  });
});
