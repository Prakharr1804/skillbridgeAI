const {Router} = require('express')
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const rateLimit = require('express-rate-limit')

const authRouter = Router();

const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: { message: "Too many verification requests. Please wait a few minutes before trying again." }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 requests per windowMs
    message: { message: "Too many requests from this IP, please try again after 15 minutes" }
})

/**
 * @route api/auth/register
 * @description register a new user
 * @access Public
 */
authRouter.post('/register', authLimiter, authController.registerUserController)

/**
 * @route api/auth/login
 * @description login a user with email and password
 * @access Public
 */
authRouter.post('/login', authLimiter, authController.loginUserController)

/**
 * @route api/auth/logout
 * @description logout a user, clear token from a user cookie and add token in blacklist
 * @access Public
 */
authRouter.get('/logout', authController.logoutUserController)

/**
 * @route /api/auth/get-me
 * @description get the current logged in user details
 * @access private
 */
authRouter.get('/get-me', authMiddleware.authUser, authController.getMeController)

/**
 * @route /api/auth/send-otp
 * @description send otp to user's email
 * @access Public
 */
authRouter.post('/send-otp', otpLimiter, authController.sendOtpController);

/**
 * @route /api/auth/verify-otp
 * @description verify otp and authenticate user
 * @access Public
 */
authRouter.post('/verify-otp', authController.verifyOtpController);

module.exports = authRouter