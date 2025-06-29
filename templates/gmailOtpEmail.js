module.exports = (otp, minutes = 5) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; }
        .otp-code { 
            font-size: 24px; 
            font-weight: bold;
            color: #1a73e8;
            margin: 20px 0;
            padding: 10px;
            background: #f1f3f4;
            display: inline-block;
        }
        .note { color: #5f6368; }
        .footer { margin-top: 30px; font-size: 12px; color: #999; }
    </style>
</head>
<body>
    <div class="container">
        <h2 style="color: #1a73e8;">Verify Your Email</h2>
        <p>Use this code to verify your email address:</p>
        <div class="otp-code">${otp}</div>
        <p class="note">This code expires in ${
          process.env.OTP_EXPIRE_MINUTES
        } minutes.</p>
        <div class="footer">
            <p>If you didn't request this, please ignore this email.</p>
            <p>© ${new Date().getFullYear()} Your App Name</p>
        </div>
    </div>
</body>
</html> `;
