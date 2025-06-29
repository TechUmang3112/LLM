const { check, validationResult } = require("express-validator");

const emailValidator = check("email")
  .isEmail()
  .withMessage("Please provide a valid email address")
  .normalizeEmail();

const passwordValidator = check("password")
  .isLength({ min: 8 })
  .withMessage("Password must be at least 8 characters long")
  .matches(/[A-Z]/)
  .withMessage("Password must contain at least one uppercase letter")
  .matches(/[a-z]/)
  .withMessage("Password must contain at least one lowercase letter")
  .matches(/\d/)
  .withMessage("Password must contain at least one number")
  .matches(/[!@#$%^&*(),.?":{}|<>]/)
  .withMessage("Password must contain at least one special character");

const otpValidator = check("otp")
  .isLength({ min: 6, max: 6 })
  .withMessage("OTP must be exactly 6 digits")
  .isNumeric()
  .withMessage("OTP must contain only numbers");

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const signupValidators = [emailValidator, passwordValidator, validate];

const loginValidators = [
  emailValidator,
  check("password").notEmpty().withMessage("Password is required"),
  validate,
];

const otpValidators = [emailValidator, otpValidator, validate];

const changePasswordValidators = [
  check("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  passwordValidator,
  validate,
];

const forgotPasswordValidators = [emailValidator, validate];

const resetPasswordValidators = [
  emailValidator,
  otpValidator,
  passwordValidator,
  validate,
];

module.exports = {
  signupValidators,
  loginValidators,
  otpValidators,
  changePasswordValidators,
  forgotPasswordValidators,
  resetPasswordValidators,
  validate,
};
