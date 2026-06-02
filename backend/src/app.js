const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const path = require('path')
const app = express()

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}))

// Serve uploaded audio files as static assets
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

/* Require all the routers here */
const authRouter         = require('./routes/auth.routes')
const interviewRouter    = require('./routes/interview.routes')
const mockInterviewRouter = require('./routes/mockInterview.routes')

/* Using all the routes here */
app.use('/api/auth', authRouter);
app.use('/api/interview', interviewRouter);
app.use('/api/mock-interview', mockInterviewRouter);

module.exports = app