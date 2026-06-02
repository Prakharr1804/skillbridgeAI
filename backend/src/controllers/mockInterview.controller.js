const path = require('path');

const MockInterviewSession = require('../models/mockInterviewSession.model');
const InterviewResponse    = require('../models/interviewResponse.model');
const InterviewReport      = require('../models/interviewReport.model');

const { transcribeAudio, analyzeSpeech } = require('../services/audio.service');
const { evaluateAnswer, computeSessionSummary } = require('../services/mockInterview.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Finds the question object (with its expectedAnswer) by text + type inside a report.
 */
function findQuestionInReport(report, questionType, questionText) {
    const list = questionType === 'technical'
        ? report.technicalQuestions
        : report.behavioralQuestions;

    return list.find(q => q.question === questionText) || null;
}

/**
 * Builds the public audio URL from the saved filename.
 */
function buildAudioUrl(req, filename) {
    return `${req.protocol}://${req.get('host')}/uploads/audio/${filename}`;
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * @name createSessionController
 * @route POST /api/mock-interview/session
 * @desc  Create a new MockInterviewSession linked to an existing InterviewReport.
 * @access private
 */
async function createSessionController(req, res) {
    const { reportId } = req.body;

    if (!reportId) {
        return res.status(400).json({ message: 'reportId is required' });
    }

    const report = await InterviewReport.findOne({ _id: reportId, user: req.user.id });
    if (!report) {
        return res.status(404).json({ message: 'Interview report not found' });
    }

    const totalQuestions =
        (report.technicalQuestions?.length  || 0) +
        (report.behavioralQuestions?.length || 0);

    if (totalQuestions === 0) {
        return res.status(400).json({ message: 'This report has no questions to practice' });
    }

    const session = await MockInterviewSession.create({
        user:            req.user.id,
        interviewReport: reportId,
        totalQuestions,
        completedQuestions: 0,
        status: 'in-progress',
    });

    return res.status(201).json({
        message: 'Mock interview session created',
        session: {
            _id:               session._id,
            status:            session.status,
            totalQuestions:    session.totalQuestions,
            completedQuestions:session.completedQuestions,
            interviewReport:   session.interviewReport,
            createdAt:         session.createdAt,
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @name getNextQuestionController
 * @route GET /api/mock-interview/session/:sessionId/question
 * @desc  Return the next unanswered question in the session.
 *        Iterates all technical questions first, then behavioral.
 * @access private
 */
async function getNextQuestionController(req, res) {
    const { sessionId } = req.params;

    const session = await MockInterviewSession.findOne({ _id: sessionId, user: req.user.id });
    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    if (session.status === 'completed') {
        return res.status(200).json({
            done:    true,
            message: 'All questions answered — session is complete',
            summary: session.summary,
        });
    }

    const report = await InterviewReport.findById(session.interviewReport);
    if (!report) {
        return res.status(404).json({ message: 'Associated interview report not found' });
    }

    // Get the set of already-answered question texts
    const answered = await InterviewResponse.find(
        { session: sessionId },
        { question: 1 }
    ).lean();
    const answeredSet = new Set(answered.map(r => r.question));

    // Search technical questions first, then behavioral
    const allQuestions = [
        ...(report.technicalQuestions  || []).map(q => ({ ...q.toObject?.() ?? q, questionType: 'technical' })),
        ...(report.behavioralQuestions || []).map(q => ({ ...q.toObject?.() ?? q, questionType: 'behavioral' })),
    ];

    const next = allQuestions.find(q => !answeredSet.has(q.question));

    if (!next) {
        return res.status(200).json({
            done:    true,
            message: 'All questions answered — session is complete',
        });
    }

    return res.status(200).json({
        done:         false,
        questionType: next.questionType,
        question:     next.question,
        progress: {
            completed: answeredSet.size,
            total:     session.totalQuestions,
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @name submitAnswerController
 * @route POST /api/mock-interview/answer
 * @desc  Full pipeline:
 *        1. Validate  2. Transcribe audio  3. Speech analysis
 *        4. Gemini evaluation  5. Store response  6. Update session
 * @access private
 * @multipart audio (file), sessionId, question, questionType
 */
async function submitAnswerController(req, res) {
    const { sessionId, question, questionType } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!sessionId || !question || !questionType) {
        return res.status(400).json({ message: 'sessionId, question, and questionType are required' });
    }
    if (!['technical', 'behavioral'].includes(questionType)) {
        return res.status(400).json({ message: 'questionType must be "technical" or "behavioral"' });
    }
    if (!req.file) {
        return res.status(400).json({ message: 'Audio file is required (field name: audio)' });
    }

    // ── Auth + session check ──────────────────────────────────────────────────
    const session = await MockInterviewSession.findOne({ _id: sessionId, user: req.user.id });
    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }
    if (session.status === 'completed') {
        return res.status(400).json({ message: 'This session is already completed' });
    }

    // ── Guard: prevent double-answering the same question ────────────────────
    const alreadyAnswered = await InterviewResponse.findOne({ session: sessionId, question });
    if (alreadyAnswered) {
        return res.status(409).json({ message: 'This question has already been answered in this session' });
    }

    // ── Load report + find expected answer ────────────────────────────────────
    const report = await InterviewReport.findById(session.interviewReport);
    if (!report) {
        return res.status(404).json({ message: 'Associated interview report not found' });
    }

    const questionObj = findQuestionInReport(report, questionType, question);
    if (!questionObj) {
        return res.status(404).json({ message: 'Question not found in this report' });
    }

    const expectedAnswer = questionObj.answer;
    const audioFilePath  = req.file.path;
    const audioMimeType  = req.file.mimetype;

    // ── Step 1: Transcribe audio ──────────────────────────────────────────────
    const { transcript, durationSeconds } = await transcribeAudio(audioFilePath, audioMimeType);

    // ── Step 2: Speech analysis (local, no AI) ────────────────────────────────
    const speechAnalysis = analyzeSpeech(transcript, durationSeconds);

    // ── Step 3: Gemini evaluation ─────────────────────────────────────────────
    const evaluation = await evaluateAnswer({ question, expectedAnswer, transcript, questionType });

    // ── Step 4: Build audio URL ───────────────────────────────────────────────
    const audioUrl = buildAudioUrl(req, req.file.filename);

    // ── Step 5: Persist InterviewResponse ────────────────────────────────────
    const interviewResponse = await InterviewResponse.create({
        session:  sessionId,
        questionType,
        question,
        expectedAnswer,
        transcript,
        audioUrl,
        scores: {
            contentAccuracy: evaluation.contentAccuracy,
            clarity:         evaluation.clarity,
            structure:       evaluation.structure,
            communication:   evaluation.communication,
            overall:         evaluation.overall,
        },
        speechAnalysis,
        starAnalysis: evaluation.starAnalysis,
        feedback:     evaluation.feedback,
        strengths:    evaluation.strengths,
        improvements: evaluation.improvements,
    });

    // ── Step 6: Update session progress ──────────────────────────────────────
    session.completedQuestions += 1;

    let sessionSummary = null;
    if (session.completedQuestions >= session.totalQuestions) {
        // Compute final summary
        const allResponses = await InterviewResponse.find({ session: sessionId }).lean();
        const summary      = computeSessionSummary(allResponses);

        session.status       = 'completed';
        session.overallScore = summary.overallScore;
        session.summary      = summary;
        sessionSummary       = summary;
    }

    await session.save();

    // ── Response ──────────────────────────────────────────────────────────────
    return res.status(201).json({
        message:  'Answer submitted and evaluated successfully',
        response: interviewResponse,
        session: {
            status:             session.status,
            completedQuestions: session.completedQuestions,
            totalQuestions:     session.totalQuestions,
            ...(sessionSummary ? { summary: sessionSummary } : {}),
        },
    });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @name getSessionController
 * @route GET /api/mock-interview/session/:sessionId
 * @desc  Get session details. If completed, includes the full summary.
 * @access private
 */
async function getSessionController(req, res) {
    const { sessionId } = req.params;

    const session = await MockInterviewSession.findOne({ _id: sessionId, user: req.user.id })
        .populate('interviewReport', 'title matchScore');

    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    return res.status(200).json({
        message: 'Session fetched successfully',
        session,
    });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @name getSessionResponsesController
 * @route GET /api/mock-interview/session/:sessionId/responses
 * @desc  Get all submitted responses for a session, ordered by submission time.
 * @access private
 */
async function getSessionResponsesController(req, res) {
    const { sessionId } = req.params;

    // Verify ownership
    const session = await MockInterviewSession.findOne({ _id: sessionId, user: req.user.id });
    if (!session) {
        return res.status(404).json({ message: 'Session not found' });
    }

    const responses = await InterviewResponse.find({ session: sessionId })
        .sort({ createdAt: 1 })
        .lean();

    return res.status(200).json({
        message:   'Responses fetched successfully',
        total:     responses.length,
        responses,
    });
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @name getUserSessionsController
 * @route GET /api/mock-interview/sessions
 * @desc  Get all sessions for the logged-in user (paginated, newest first).
 * @access private
 */
async function getUserSessionsController(req, res) {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(20, parseInt(req.query.limit) || 10);
    const skip  = (page - 1) * limit;

    const [sessions, total] = await Promise.all([
        MockInterviewSession.find({ user: req.user.id })
            .populate('interviewReport', 'title matchScore')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        MockInterviewSession.countDocuments({ user: req.user.id }),
    ]);

    return res.status(200).json({
        message: 'Sessions fetched successfully',
        page,
        limit,
        total,
        sessions,
    });
}

module.exports = {
    createSessionController,
    getNextQuestionController,
    submitAnswerController,
    getSessionController,
    getSessionResponsesController,
    getUserSessionsController,
};
