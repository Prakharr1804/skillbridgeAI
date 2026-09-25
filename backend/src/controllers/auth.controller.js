const userModel = require('../models/user.model')
const tokenBlackListModel =  require('../models/blacklist.model')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

/**
 * @name registerUserController
 * @description register a new user, expects username, email, password in request body
 * @access Public
 */

const isProduction = process.env.NODE_ENV === 'production';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction, // HTTPS required in production
  sameSite: isProduction ? 'none' : 'lax', // 'none' allows cross-domain auth between Vercel and Render
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

async function registerUserController(req , res) {
    try {
        const {username, email, password} = req.body;

        if(!username || !email || !password) {
            return res.status(400).json({message: "All fields are required"})
        }

        const isUserAlreadyExists = await userModel.findOne({
            $or: [{username} ,{email}]
        })

        if(isUserAlreadyExists) {
            return res.status(400).json({message: "User already exists"})
        }

        const hashedPassword = await bcrypt.hash(password, 10)

        const user = await userModel.create({
            username,
            email,
            password: hashedPassword
        })

        const token = jwt.sign({
            id: user._id, username: user.username
        }, process.env.JWT_SECRET, {
            expiresIn: "7d"
        })

        res.cookie('token', token, cookieOptions)

        return res.status(201).json({message: "User registered successfully", user: {
            id: user._id,
            username: user.username,
            email: user.email
        }})
    } catch (error) {
        console.error(error);
        return res.status(500).json({message: "Internal server error"})
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
        const user = await userModel.findById(req.user.id)

        res.status(200).json({
            message: 'User details fetched successfully',
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

module.exports = {
    registerUserController,
    loginUserController,
    logoutUserController,
    getMeController
};