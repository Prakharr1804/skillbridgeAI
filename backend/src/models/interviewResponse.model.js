const mongoose = require('mongoose');

const scoresSchema = new mongoose.Schema({
    contentAccuracy: { type: Number, min: 0, max: 10 },
    clarity:         { type: Number, min: 0, max: 10 },
    structure:       { type: Number, min: 0, max: 10 },
    communication:   { type: Number, min: 0, max: 10 },
    overall:         { type: Number, min: 0, max: 10 },
}, { _id: false });

const speechAnalysisSchema = new mongoose.Schema({
    speakingRate:        { type: Number }, // words per minute
    fillerWords:         { type: Number }, // count
    averagePauseSeconds: { type: Number },
    durationSeconds:     { type: Number },
}, { _id: false });

const starAnalysisSchema = new mongoose.Schema({
    situation: { type: Boolean, default: false },
    task:      { type: Boolean, default: false },
    action:    { type: Boolean, default: false },
    result:    { type: Boolean, default: false },
}, { _id: false });

const interviewResponseSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'MockInterviewSession',
        required: [true, 'Session is required'],
    },
    questionType: {
        type: String,
        enum: ['technical', 'behavioral'],
        required: [true, 'Question type is required'],
    },
    question: {
        type: String,
        required: [true, 'Question is required'],
    },
    expectedAnswer: {
        type: String,
        required: [true, 'Expected answer is required'],
    },
    transcript: {
        type: String,
        default: '',
    },
    audioUrl: {
        type: String,
        default: null,
    },
    scores:         { type: scoresSchema,        default: () => ({}) },
    speechAnalysis: { type: speechAnalysisSchema, default: () => ({}) },
    starAnalysis:   { type: starAnalysisSchema,   default: () => ({}) },
    feedback:     { type: [String], default: [] },
    strengths:    { type: [String], default: [] },
    improvements: { type: [String], default: [] },
}, {
    timestamps: true,
});

// Index for fast session-scoped queries
interviewResponseSchema.index({ session: 1, createdAt: 1 });

const InterviewResponse = mongoose.model('InterviewResponse', interviewResponseSchema);

module.exports = InterviewResponse;
