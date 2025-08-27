// Test setup file for Jest
import { jest } from '@jest/globals';

// Mock Firebase Admin SDK
jest.doMock('firebase-admin', () => {
  const mockFirestore = {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
      })),
    })),
  };

  const mockTimestamp = {
    now: jest.fn(() => ({
      toMillis: jest.fn(() => Date.now()),
    })),
  };

  return {
    apps: [],
    initializeApp: jest.fn(),
    firestore: jest.fn(() => mockFirestore),
    Timestamp: mockTimestamp,
  };
});

// Mock axios
jest.doMock('axios');

// Mock crypto
jest.doMock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn(() => ({
      digest: jest.fn(() => 'mocked-hash'),
    })),
  })),
}));

// Mock dotenv
jest.doMock('dotenv', () => ({
  config: jest.fn(),
}));

// Global test timeout
jest.setTimeout(10000);
