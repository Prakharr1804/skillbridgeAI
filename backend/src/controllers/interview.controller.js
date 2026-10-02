const interviewReportModel = require('../models/interviewReport.model')
const aiService = require('../services/ai.service')
const pdfParse = require('pdf-parse')

/**
 * @name generateInterviewReportController
 * @description generate interview report on the basis of user self description, resume pdf and job description
 * @access private
 */

async function generateInterviewReportController(req, res){
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ message: "Resume file is required" });
        }

        const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText();
        const { selfDescription, jobDescription } = req.body;

        if (!resumeContent?.text || !selfDescription || !jobDescription) {
            return res.status(400).json({
                message: "All fields (resume, selfDescription, jobDescription) are required"
            });
        }

        const interviewReportByAi = await aiService.generateInterviewReport({
            resume: resumeContent.text,
            selfDescription,
            jobDescription
        });

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeContent.text,
            selfDescription,
            jobDescription,
            ...interviewReportByAi
        });

        return res.status(201).json({
            message: "Interview Report Generated successfully",
            data: interviewReport
        });
    } catch (error) {
        console.error("generateInterviewReportController error:", error);
        return res.status(500).json({ message: error.message || "Failed to generate interview report" });
    }
}

/**
 * @name getInterviewReportByIdController
 * @description get interview report on the basis of interview id
 * @access private
 */

async function getInterviewReportByIdController(req, res){
    try {
        const { interviewId } = req.params;

        const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id });

        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview Report Not Found"
            });
        }

        return res.status(200).json({
            message: "Interview Report Fetched successfully",
            interviewReport
        });
    } catch (error) {
        console.error("getInterviewReportByIdController error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * @name getAllInterviewReportsController
 * @description get all interview reports of the user
 * @access private
 */

async function getAllInterviewReportsController(req, res){
    try {
        const interviewReports = await interviewReportModel.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan");

        return res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports
        });
    } catch (error) {
        console.error("getAllInterviewReportsController error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * @name generateResumePdfController
 * @description generate resume pdf on the basis of user self description, resume pdf and job description
 * @access private
 */

async function generateResumePdfController(req, res){
    try {
        const { interviewReportId } = req.params;
        const interviewReport = await interviewReportModel.findOne({ _id: interviewReportId, user: req.user.id });
        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview Report Not Found"
            });
        }
     
        const { resume, selfDescription, jobDescription } = interviewReport;

        if (!resume || !selfDescription || !jobDescription) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const pdfBuffer = await aiService.generateResumePdf({ resume, jobDescription, selfDescription });

        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        });

        return res.send(pdfBuffer);
    } catch (error) {
        console.error("generateResumePdfController error:", error);
        return res.status(500).json({ message: error.message || "Failed to generate resume PDF" });
    }
}

module.exports = { generateInterviewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController }