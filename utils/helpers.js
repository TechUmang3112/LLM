const jwt = require("jsonwebtoken");
require("dotenv").config();

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

const isEmailBlocked = (email, blockedEmails) => {
  return blockedEmails.has(email);
};

const addBlockedEmail = (email, blockedEmails) => {
  const blockDuration = process.env.EMAIL_BLOCK_DURATION_MINUTES * 60 * 1000;
  blockedEmails.set(email, Date.now() + blockDuration);

  // Auto-remove after block duration
  setTimeout(() => {
    blockedEmails.delete(email);
  }, blockDuration);
};

const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar
  );
};

module.exports = {
  generateOTP,
  generateToken,
  verifyToken,
  isEmailBlocked,
  addBlockedEmail,
  validatePassword,
};
