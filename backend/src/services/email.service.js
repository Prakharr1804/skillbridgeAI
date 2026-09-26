const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Sends a modern, branded OTP email to the user.
 * @param {string} to - Recipient email
 * @param {string} otp - 6-digit OTP code
 */
async function sendOtpEmail(to, otp) {
    const mailOptions = {
        from: process.env.EMAIL_FROM || '"SkillBridge AI" <no-reply@skillbridge.ai>',
        to,
        subject: 'Your SkillBridge AI Login Code',
        html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #0f172a; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b;">
            <div style="margin-bottom: 24px;">
                <span style="font-size: 14px; font-weight: 700; letter-spacing: 1px; color: #38bdf8; text-transform: uppercase;">SKILLBRIDGE AI</span>
            </div>
            <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin-bottom: 12px;">Verification Code</h1>
            <p style="font-size: 15px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px;">
                Use the following 6-digit code to sign in to your SkillBridge AI account. This code is valid for <strong>5 minutes</strong>.
            </p>
            <div style="background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 18px 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #38bdf8; font-family: monospace;">${otp}</span>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 0;">
                If you did not request this code, you can safely ignore this email. Never share this code with anyone.
            </p>
        </div>
        `,
    };

    return transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };