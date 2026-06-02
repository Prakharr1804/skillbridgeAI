const express = require('express')
const {Router} = require('express')
const authMiddleware = require('../middlewares/auth.middleware')
const interviewController = require('../controllers/interview.controller')
const calendarController = require('../controllers/calendar.controller')
const upload = require('../middlewares/file.middleware')

const interviewRouter = Router()

/**
 * @route POST /api/interview/
 * @description Generate new interview report on the basis of user self description, resume pdf and job description
 * @access private
 */

interviewRouter.post('/', authMiddleware.authUser, upload.single("resume"), interviewController.generateInterviewReportController)

/**
 * @route GET /api/interview/report/:interviewId
 * @description Get interview report on the basis of interview id
 * @access private
 */

interviewRouter.get('/report/:interviewId', authMiddleware.authUser, interviewController.getInterviewReportByIdController)

/**
 * @route GET /api/interview/
 * @description Get all interview reports of the user
 * @access private
 */

interviewRouter.get('/', authMiddleware.authUser, interviewController.getAllInterviewReportsController)

/**
 * @route POST /api/interview/resume/pdf/:interviewReportId
 * @description Generate resume pdf on the basis of interview id
 * @access private
 */

interviewRouter.post('/resume/pdf/:interviewReportId', authMiddleware.authUser, interviewController.generateResumePdfController)

/**
 * @route POST /api/interview/calendar/sync/:interviewReportId
 * @description Sync preparation plan to Google Calendar using user's OAuth access token
 * @access private
 */

interviewRouter.post('/calendar/sync/:interviewReportId', authMiddleware.authUser, calendarController.syncToCalendarController)

module.exports = interviewRouter