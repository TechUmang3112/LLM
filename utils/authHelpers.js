const { supabase, supabaseAdmin } = require("../config/supabaseClient");

async function getOrCreateUserId(email) {
  try {
    // 1. Try to get existing user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(email);

    if (!userError && user) {
      console.log(`Existing user found: ${user.id}`);
      return user.id;
    }

    // 2. Create new user if doesn't exist
    console.log(`Creating new user for email: ${email}`);
    const { data: newUser, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { signup_method: "email_otp" },
      });

    if (createError) {
      console.error("User creation failed - Details:", {
        email,
        error: createError,
        supabaseResponse: createError.context?.body,
      });
      throw new Error(`Could not create user account: ${createError.message}`);
    }

    console.log(`New user created: ${newUser.id}`);
    return newUser.id;
  } catch (error) {
    console.error("getOrCreateUserId critical error:", error);
    throw error;
  }
}

module.exports = {
  getOrCreateUserId,
};
