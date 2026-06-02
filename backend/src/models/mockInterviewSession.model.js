const mongoose = require('mongoose');

const mockInterviewSessionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: [true, 'User is required'],
    },
    interviewReport: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'InterviewReport',
        required: [true, 'Interview report is required'],
    },
    overallScore: {
        type: Number,
        min: 0,
        max: 10,
        default: null,
    },
    totalQuestions: {
        type: Number,
        required: true,
    },
    completedQuestions: {
        type: Number,
        default: 0,
    },
    status: {
        type: String,
        enum: ['in-progress', 'completed'],
        default: 'in-progress',
    },
    // Summary computed on completion
    summary: {
        technicalAverage: Number,
        behavioralAverage: Number,
        topStrengths: [String],
        topImprovements: [String],
    },
}, {
    timestamps: true,
});

const MockInterviewSession = mongoose.model('MockInterviewSession', mockInterviewSessionSchema);

module.exports = MockInterviewSession;
