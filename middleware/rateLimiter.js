const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // limit each IP to 5 requests per windowMs
  message: "Too many login attempts, please try again after a minute",
});

const otpLimiter = rateLimit({
  windowMs: 30 * 1000, // 30 seconds
  max: 1,
  message: "Please wait 30 seconds before requesting a new OTP",
});

const gmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // limit each IP to 100 emails per hour
  message: "Too many email requests from this IP, please try again later",
});

module.exports = {
  loginLimiter,
  otpLimiter,
  gmailLimiter,
};
