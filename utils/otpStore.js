const supabase = require("../config/supabaseClient");

const storeOtp = async (email, otp) => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minute expiry

  const { error } = await supabase.from("otp_verification").insert([
    {
      email,
      otp,
      expires_at: expiresAt.toISOString(),
    },
  ]);

  if (error) throw error;
};

const verifyOtp = async (email, otp) => {
  const { data, error } = await supabase
    .from("otp_verification")
    .select("*")
    .eq("email", email)
    .eq("otp", otp)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data.length > 0;
};

module.exports = { storeOtp, verifyOtp };
