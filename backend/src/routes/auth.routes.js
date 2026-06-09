const {Router} = require('express')
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middlewares/auth.middleware')
const rateLimit = require('express-rate-limit')

const authRouter = Router();

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

module.exports = authRouter