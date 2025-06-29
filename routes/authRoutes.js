const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { checkAuth } = require("../middleware/authMiddleware");
const {
  loginLimiter,
  otpLimiter,
  gmailLimiter,
} = require("../middleware/rateLimiter");
const {
  signupValidators,
  loginValidators,
  otpValidators,
  changePasswordValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
} = require("../utils/validators");

// Public routes
router.post("/signup", signupValidators, authController.signup);

router.post("/login", loginLimiter, loginValidators, authController.login);

//router.post(
//  "/send-verification-code",
//  otpLimiter,
//  forgotPasswordValidators, // Reusing forgot password validators (email only)
//  authController.sendVerificationCode
//);
router.post(
  "/send-verification-code",
  gmailLimiter,
  authController.sendVerificationCode
);

router.post(
  "/verify-verification-code",
  otpValidators,
  authController.verifyVerificationCode
);

router.post(
  "/send-forgot-password-code",
  otpLimiter,
  forgotPasswordValidators,
  authController.sendForgotPasswordCode
);

router.post(
  "/verify-forgot-password-code",
  resetPasswordValidators,
  authController.verifyForgotPasswordCode
);

// Protected routes (require authentication)
router.post("/logout", checkAuth, authController.logout);

router.post(
  "/change-password",
  checkAuth,
  changePasswordValidators,
  authController.changePassword
);

module.exports = router;
