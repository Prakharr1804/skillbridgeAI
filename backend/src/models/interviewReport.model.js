const mongoose = require('mongoose')

/**
 * - job description: String
 * - resume text: String
 * - self description: String
 * 
 * - matchScore: Number
 * 
 * - Technical Question: [{
 *                        Question: "",
 *                        intention: "",
 *                        answer: ""
 *                       }]
 * - Behavioral Question: [{
 *                          Question: "",
 *                          intention: "",
 *                          answer: ""
 *                        }]
 * - Skill gaps: [{
 *                  skill: ""
 *                  severity: {
 *                     type: String,
 *                     enum: ["low", "medium", "high"]           
 *                            }
 *               }]
 * - Prep plan: [{
 *              day: Number,
 *              focus: String,
 *              tasks: [String]
 * }]
 */

const tecchnicalQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "Technical Questions are required"]
    },
    intention: {
        type: String,
        required: [true, "intentions are required"]
    },
    answer: {
        type: String,
        required: [true, "Answers are required"]
    }
}, {
    _id: false
})

const BehavioralQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: [true, "Technical Questions are required"]
    },
    intention: {
        type: String,
        required: [true, "intentions are required"]
    },
    answer: {
        type: String,
        required: [true, "Answers are required"]
    }
}, {
    _id: false
})

const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: [true, "Skill is required"]
    },
    severity: {
        type: String,
        enum: ["low", "medium", "high"],
        required: [true, "Severity is required"]
    }
}, {
    _id: false
})

const preprationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: [true, "Day is required"]
    },
    focus: {
        type: String,
        required: [true, "Focus is required"]
    },
    tasks: [{
        type: String,
        required: [true, "Tasks are required"]
    }],
    eventId: {
        type: String
    }
})

const interviewReportSchema = new mongoose.Schema({
    jobDescription: {
        type: String,
        require: [true, "Job description is required"]
    },
    resume: {
        type: String
    },

    selfDescription: String,

    matchScore: {
        type: Number,
        min: 0,
        max: 100
    },
    technicalQuestions: [tecchnicalQuestionSchema],
    behavioralQuestions: [BehavioralQuestionSchema],
    skillGaps: [skillGapSchema],
    preparationPlan: [preprationPlanSchema],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
    title: {
        type: String,
        required: [true, "Job title is required"]
    }
}, {
    timestamps: true
})

const interviewReportModel = mongoose.model("InterviewReport", interviewReportSchema)

module.exports = interviewReportModel