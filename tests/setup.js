// Configuración global para Jest
require('dotenv').config({ path: '.env.test' });

// Mock de la base de datos para tests
const mockDb = {
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn()
};

// Mock de nodemailer para tests
const mockTransporter = {
  sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' })
};

const mockNodemailer = {
  createTransporter: jest.fn().mockReturnValue(mockTransporter)
};

// Variables globales para tests
global.mockDb = mockDb;
global.mockTransporter = mockTransporter;
global.mockNodemailer = mockNodemailer;

// Mock de utils.js
jest.mock('../router/utils', () => require('./__tests__/router/utils.mock'));

// Mock de express-validator para evitar problemas
jest.mock('express-validator', () => ({
  body: jest.fn(() => ({
    notEmpty: jest.fn().mockReturnThis(),
    isInt: jest.fn().mockReturnThis(),
    withMessage: jest.fn().mockReturnThis(),
    isISO8601: jest.fn().mockReturnThis(),
    trim: jest.fn().mockReturnThis(),
    isLength: jest.fn().mockReturnThis(),
    isString: jest.fn().mockReturnThis(),
    isEmail: jest.fn().mockReturnThis(),
    isIn: jest.fn().mockReturnThis(),
    optional: jest.fn().mockReturnThis(),
    isURL: jest.fn().mockReturnThis()
  })),
  validationResult: jest.fn(() => ({
    isEmpty: jest.fn(() => true),
    array: jest.fn(() => [])
  }))
}));

// Configuración de timeouts para tests
jest.setTimeout(10000);

// Limpiar mocks antes de cada test
beforeEach(() => {
  jest.clearAllMocks();
});

// Configuración de variables de entorno para tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'test_library';
process.env.DB_PORT = '3306';

console.log('🧪 Jest setup configuré pour les tests');
