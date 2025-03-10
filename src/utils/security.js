// src/utils/security.js
const crypto = require('crypto');

// Validate UUID format
function validateId(id, entityName = 'ID') {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!id || typeof id !== 'string' || !uuidRegex.test(id)) {
    throw new Error(`Invalid ${entityName} format`);
  }
  return true;
}

// Validate Date object
function validateDate(date, fieldName = 'Date') {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return true;
}

// Sanitize object data recursively
function sanitizeData(data) {
  if (!data) return data;
  
  if (typeof data === 'string') {
    return sanitizeString(data);
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }
  
  if (typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }
  
  return data;
}

// Sanitize a string to prevent XSS
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

// Generate secure random token
function generateToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

// Hash sensitive data
function hashData(data, salt = null) {
  if (!salt) {
    salt = crypto.randomBytes(16).toString('hex');
  }
  
  const hash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  
  return {
    hash,
    salt
  };
}

// Verify hashed data
function verifyHash(data, hash, salt) {
  const hashVerify = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
  return hashVerify === hash;
}

module.exports = {
  validateId,
  validateDate,
  sanitizeData,
  sanitizeString,
  generateToken,
  hashData,
  verifyHash
};