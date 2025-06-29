const { supabase, supabaseAdmin } = require("../config/supabaseClient");
const { sendEmail } = require("../config/emailConfig");
const otpTemplate = require("../templates/gmailOtpEmail");
const { loginLimiter, otpLimiter } = require("../middleware/rateLimiter");
const generateOtpEmail = require("../templates/gmailOtpEmail");
const { storeOtp, verifyOtp } = require("../utils/otpStore");
const { getOrCreateUserId } = require("../utils/authHelpers");
const {
  validateSignup,
  validateLogin,
  validateOTP,
} = require("../middleware/validationMiddleware");

const loginAttempts = new Map();

const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    res.status(201).json({
      message: "Signup successful. Please verify your email.",
      user: data.user,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user is blocked
    const attemptData = loginAttempts.get(email) || {
      count: 0,
      lastAttempt: 0,
    };
    const now = Date.now();
    const blockTime = process.env.LOGIN_BLOCK_TIME_MINUTES * 60 * 1000;

    if (attemptData.count >= 3 && now - attemptData.lastAttempt < blockTime) {
      const remainingTime = Math.ceil(
        (blockTime - (now - attemptData.lastAttempt)) / 1000
      );
      return res.status(429).json({
        error: `Too many attempts. Please try again in ${remainingTime} seconds.`,
      });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Increment failed attempts
      const newCount = attemptData.count + 1;
      loginAttempts.set(email, { count: newCount, lastAttempt: now });

      if (newCount >= 3) {
        return res.status(429).json({
          error: `Too many attempts. Please try again after ${process.env.LOGIN_BLOCK_TIME_MINUTES} minutes.`,
        });
      }

      throw error;
    }

    // Reset attempts on successful login
    loginAttempts.delete(email);

    res.json({
      message: "Login successful",
      token: data.session.access_token,
      user: data.user,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { error } = await supabase.auth.signOut(token);
    if (error) throw error;

    res.json({ message: "Logout successful" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const sendVerificationCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    console.log(`Starting verification for: ${email}`);
    const userId = await getOrCreateUserId(email);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(
      Date.now() + process.env.OTP_EXPIRE_MINUTES * 60 * 1000
    );

    const { error: dbError } = await supabase.from("otp_verification").insert([
      {
        email,
        otp,
        user_id: userId,
        expires_at: expiresAt.toISOString(),
      },
    ]);

    if (dbError) {
      console.error("Database insert failed:", dbError);
      throw new Error("Failed to store verification code");
    }

    const emailSent = await sendEmail(
      email,
      "Your Verification Code",
      otpTemplate(otp)
    );

    if (!emailSent) throw new Error("Email service failed");

    res.json({ message: "Verification code sent" });
  } catch (error) {
    console.error("Full error stack:", error);
    res.status(400).json({
      error: "Failed to send verification",
      details: error.message,
      // Add this for debugging (remove in production)
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

const verifyVerificationCode = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // 1. First verify the OTP is valid and not expired
    const { data: otpRecord, error: otpError } = await supabase
      .from("otp_verification")
      .select("user_id, expires_at")
      .eq("email", email)
      .eq("otp", otp)
      .gt("expires_at", new Date().toISOString())
      .eq("used", false)
      .limit(1);

    if (otpError) throw otpError;
    if (!otpRecord || otpRecord.length === 0) {
      return res.status(401).json({ error: "Invalid or expired OTP" });
    }

    const userId = otpRecord[0].user_id;

    // 2. Verify the user exists
    const { data: user, error: userError } =
      await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error("User account not found");
    }

    // 3. Mark OTP as used
    await supabase
      .from("otp_verification")
      .update({ used: true })
      .eq("email", email)
      .eq("otp", otp);

    // 4. Update user's email confirmation status
    const { error: verifyError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        email_confirm: true,
        updated_at: new Date().toISOString(),
      }
    );

    if (verifyError) throw verifyError;

    // 5. Create a new session for the user
    const { data: session, error: sessionError } =
      await supabase.auth.signInWithPassword({
        email,
        password: "temporary-password-placeholder", // Only works if password auth is enabled
      });

    // Alternative if using only email auth:
    // const { data: session, error: sessionError } = await supabase.auth.verifyOtp({
    //   email,
    //   token: otp,
    //   type: 'email'
    // });

    if (sessionError) throw sessionError;

    res.json({
      message: "Email verified successfully",
      access_token: session.session.access_token,
      user: session.user,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(400).json({
      error: "Verification failed",
      details: error.message.includes("user")
        ? "User account problem - please try signing up again"
        : error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError) throw userError;

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const sendForgotPasswordCode = async (req, res) => {
  try {
    const { email } = req.body;

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    if (error) throw error;

    res.json({
      message: "Password reset code sent successfully",
      data,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const verifyForgotPasswordCode = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // First verify the OTP
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "recovery",
    });

    if (verifyError) throw verifyError;

    // Then update the password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) throw updateError;

    res.json({
      message: "Password reset successfully",
      user: data.user,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  signup,
  login,
  logout,
  sendVerificationCode,
  verifyVerificationCode,
  changePassword,
  sendForgotPasswordCode,
  verifyForgotPasswordCode,
};
