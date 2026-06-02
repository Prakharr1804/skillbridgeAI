const { Router } = require('express');

const authMiddleware = require('../middlewares/auth.middleware');
const audioUpload = require('../middlewares/audioUpload.middleware');
const mockInterviewController = require('../controllers/mockInterview.controller');

const mockInterviewRouter = Router();

// Apply auth to every route in this router
mockInterviewRouter.use(authMiddleware.authUser);

/**
 * @route  GET  /api/mock-interview/sessions
 * @desc   Get all sessions for the logged-in user (paginated)
 * @access private
 */
mockInterviewRouter.get('/sessions', mockInterviewController.getUserSessionsController);

/**
 * @route  POST /api/mock-interview/session
 * @desc   Create a new mock interview session linked to an InterviewReport
 * @body   { reportId: string }
 * @access private
 */
mockInterviewRouter.post('/session', mockInterviewController.createSessionController);

/**
 * @route  GET  /api/mock-interview/session/:sessionId
 * @desc   Get session details + summary if completed
 * @access private
 */
mockInterviewRouter.get('/session/:sessionId', mockInterviewController.getSessionController);

/**
 * @route  GET  /api/mock-interview/session/:sessionId/question
 * @desc   Get the next unanswered question in the session
 * @access private
 */
mockInterviewRouter.get('/session/:sessionId/question', mockInterviewController.getNextQuestionController);

/**
 * @route  GET  /api/mock-interview/session/:sessionId/responses
 * @desc   Get all submitted responses for a session
 * @access private
 */
mockInterviewRouter.get('/session/:sessionId/responses', mockInterviewController.getSessionResponsesController);

/**
 * @route  POST /api/mock-interview/answer
 * @desc   Submit an audio answer — triggers transcription + evaluation pipeline
 * @multipart  audio (file), sessionId (string), question (string), questionType (string)
 * @access private
 */
mockInterviewRouter.post(
    '/answer',
    audioUpload.single('audio'),
    mockInterviewController.submitAnswerController
);

module.exports = mockInterviewRouter;
