const userModel = require('../models/user.model')
const tokenBlackListModel =  require('../models/blacklist.model')
const OtpModel = require('../models/otp.model')
const { sendOtpEmail } = require('../services/email.service')
const bcrypt = require('bcrypt')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')


const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // HTTPS required in production
    sameSite: isProduction ? 'none' : 'lax', // 'none' allows cross-domain auth between Vercel and Render
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

/**
 * @name verifyOtpController
 * @route POST /api/auth/verify-otp
 * @desc Verify OTP and authenticate user
 */
async function verifyOtpController(req, res) {
    try {
        const { email, otp } = req.body;
        console.log(`[VERIFY OTP] Received request - Email: "${email}", OTP: "${otp}"`);

        if (!email || !otp) {
            console.log('[VERIFY OTP] Failed: Missing email or otp');
            return res.status(400).json({ message: "Email and OTP code are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const cleanOtp = String(otp).trim();

        // Find latest active OTP record for this email
        const otpRecord = await OtpModel.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
        if (!otpRecord) {
            console.log(`[VERIFY OTP] Failed: No active OTP record found in DB for "${normalizedEmail}"`);
            return res.status(400).json({ message: "Verification code expired or invalid. Please request a new one." });
        }

        console.log(`[VERIFY OTP] Found record in DB, attempts: ${otpRecord.attempts}`);

        // Brute force protection: max 5 failed attempts
        if (otpRecord.attempts >= 5) {
            console.log(`[VERIFY OTP] Failed: Max attempts exceeded for "${normalizedEmail}"`);
            await OtpModel.deleteOne({ _id: otpRecord._id });
            return res.status(429).json({ message: "Too many failed attempts. Please request a new code." });
        }

        // Compare OTP
        const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otp);
        console.log(`[VERIFY OTP] bcrypt comparison result: ${isMatch}`);

        if (!isMatch) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            return res.status(400).json({ message: "Incorrect verification code. Please try again." });
        }

        // OTP is valid -> delete it so it cannot be reused
        await OtpModel.deleteMany({ email: normalizedEmail });

        // Find user
        const user = await userModel.findOne({ email: normalizedEmail });
        if (!user) {
            console.log(`[VERIFY OTP] Failed: User not found in DB for "${normalizedEmail}"`);
            return res.status(404).json({ message: "User not found" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie('token', token, cookieOptions);

        return res.status(200).json({
            message: "Login successful",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("verifyOtpController error:", error);
        return res.status(500).json({ message: "Verification failed. Please try again." });
    }
}

/**
 * @name sendOtpController
 * @route POST /api/auth/send-otp
 * @desc Generate and send OTP to user's email
 */
async function sendOtpController(req, res) {
    try {
        const { email, isRegistration } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check user existence based on flow
        const user = await userModel.findOne({ email: normalizedEmail });

        if (isRegistration) {
            // For Registration: Account must NOT already exist
            if (user) {
                return res.status(400).json({ message: "An account already exists with this email address" });
            }
        } else {
            // For Login: Account MUST exist
            if (!user) {
                return res.status(404).json({ message: "No account found with this email address" });
            }
        }

        // Generate 6-digit OTP
        const rawOtp = crypto.randomInt(100000, 1000000).toString();

        if (process.env.NODE_ENV !== 'production') {
            console.log(`[AUTH OTP DEV] Generated OTP for ${normalizedEmail}: ${rawOtp}`);
        }

        // Hash & save to OtpModel (5-min TTL)
        const hashedOtp = await bcrypt.hash(rawOtp, 10);
        await OtpModel.deleteMany({ email: normalizedEmail });
        await OtpModel.create({
            email: normalizedEmail,
            otp: hashedOtp,
            attempts: 0
        });

        // Send email using existing service
        await sendOtpEmail(normalizedEmail, rawOtp);

        return res.status(200).json({
            message: "Verification code sent to your email"
        });
    } catch (error) {
        console.error("sendOtpController error:", error);
        return res.status(500).json({ message: "Failed to send verification code. Please try again." });
    }
}

/**
 * @name registerUserController
 * @route POST /api/auth/register
 * @desc Verifies OTP, creates new user, and prompts login
 * @access Public
 */
async function registerUserController(req, res) {
    try {
        const { username, email, password, otp } = req.body;

        if (!username || !email || !password || !otp) {
            return res.status(400).json({ message: "Username, email, password, and OTP code are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedUsername = username.trim();
        const cleanOtp = String(otp).trim();

        // 1. Check if username or email is already registered
        const isUserAlreadyExists = await userModel.findOne({
            $or: [{ username: normalizedUsername }, { email: normalizedEmail }]
        });

        if (isUserAlreadyExists) {
            return res.status(400).json({ message: "User already exists with this username or email" });
        }

        // 2. Verify OTP from OtpModel
        const otpRecord = await OtpModel.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
        if (!otpRecord) {
            return res.status(400).json({ message: "Verification code expired or invalid. Please request a new one." });
        }

        if (otpRecord.attempts >= 5) {
            await OtpModel.deleteMany({ email: normalizedEmail });
            return res.status(429).json({ message: "Too many failed attempts. Please request a new code." });
        }

        const isMatch = await bcrypt.compare(cleanOtp, otpRecord.otp);
        if (!isMatch) {
            otpRecord.attempts += 1;
            await otpRecord.save();
            return res.status(400).json({ message: "Incorrect verification code. Please try again." });
        }

        // 3. OTP verified -> delete it from DB
        await OtpModel.deleteMany({ email: normalizedEmail });

        // 4. Hash password & create user in MongoDB
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await userModel.create({
            username: normalizedUsername,
            email: normalizedEmail,
            password: hashedPassword
        });

        return res.status(201).json({
            message: "Account created successfully! Please sign in.",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("registerUserController error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * @name loginUserController
 * @description Login a user, expects email and password in req body
 * @access Public
 */

async function loginUserController(req, res){ 
    try {
        const {email, password} = req.body;

        if(!email || !password){
            return res.status(400).json({message: "All fields are required"})
        }

        const user = await userModel.findOne({email})

        if(!user){
            return res.status(400).json({message: "Invalid user or password"})
        }

        const isPasswordValid = await bcrypt.compare(password, user.password)

        if(!isPasswordValid){
            return res.status(400).json({message: "Invalid email or password"})
        }

        const token = jwt.sign({
            id: user._id, username: user.username
        }, process.env.JWT_SECRET, {
            expiresIn: "7d"
        })

        res.cookie('token', token, cookieOptions)

        return res.status(200).json({
            message: "User logged in successfully",
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: "Internal server error"})
    }
}

/**
 * @name logoutUserController
 * @description logout a user and clear cookie and add token in blacklist
 * @access Public
 */

async function logoutUserController(req, res){
    try {
        const token = req.cookies.token;

        if(token){
            await tokenBlackListModel.create({
                token
            })
        }
        res.clearCookie('token')
        return res.status(200).json({message: "User logged out successfully"})
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: "Internal server error"})
    }
}

/**
 * @name getMeController
 * @description get the current logged in user details
 * @access private
 */

async function getMeController(req, res){
    try {
        const user = await userModel.findById(req.user.id);

        if (!user) {
            res.clearCookie('token', cookieOptions);
            return res.status(401).json({ message: 'User account not found or session expired' });
        }

        return res.status(200).json({
            message: 'User details fetched successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("getMeController error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController,
    sendOtpController,
    verifyOtpController
};