const interviewReportModel = require('../models/interviewReport.model')
const aiService = require('../services/ai.service')
const pdfParse = require('pdf-parse')

/**
 * @name generateInterviewReportController
 * @description generate interview report on the basis of user self description, resume pdf and job description
 * @access private
 */

async function generateInterviewReportController(req, res){
    const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
    const {selfDescription, jobDescription} = req.body;

    if(!resumeContent || !selfDescription || !jobDescription){
        res.status(400).json({
            message: "All fields are required"
        })
    }

    const interviewReportByAi = await aiService.generateInterviewReport({
        resume: resumeContent.text,
        selfDescription,
        jobDescription
    })

    const interviewReport = await interviewReportModel.create({
        user: req.user.id,
        resume: resumeContent.text,
        selfDescription,
        jobDescription,
        ...interviewReportByAi
    })

    res.status(201).json({
        message: "Interview Report Generated successfully",
        data: interviewReport
    })
}

/**
 * @name getInterviewReportByIdController
 * @description get interview report on the basis of interview id
 * @access private
 */

async function getInterviewReportByIdController(req, res){

    const {interviewId} = req.params;

    const interviewReport = await interviewReportModel.findOne({_id: interviewId, user: req.user.id})

    if(!interviewReport){
        res.status(404).json({
            message: "Interview Report Not Found"
        })
    }

    res.status(200).json({
        message: "Interview Report Fetched successfully",
        interviewReport
    })
}

/**
 * @name getAllInterviewReportsController
 * @description get all interview reports of the user
 * @access private
 */

async function getAllInterviewReportsController(req, res){
   const interviewReports = await interviewReportModel.find({ user: req.user.id }).sort({ createdAt: -1 }).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}

/**
 * @name generateResumePdfController
 * @description generate resume pdf on the basis of user self description, resume pdf and job description
 * @access private
 */

async function generateResumePdfController(req, res){
    const {interviewReportId} = req.params
    const interviewReport = await interviewReportModel.findOne({_id: interviewReportId, user: req.user.id})
    if(!interviewReport){
        return res.status(404).json({
            message: "Interview Report Not Found"
        })
    }
 
    const { resume, selfDescription, jobDescription } = interviewReport;

    if(!resume || !selfDescription || !jobDescription){
        res.status(400).json({
            message: "All fields are required"
        })
    }

    const pdfBuffer = await aiService.generateResumePdf({ resume, jobDescription, selfDescription })

    res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
    })

    res.send(pdfBuffer)
}

module.exports = { generateInterviewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }