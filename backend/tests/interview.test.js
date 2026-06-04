const interviewReportModel = require('../src/models/interviewReport.model');

// Mock dependencies
jest.mock('../src/models/interviewReport.model');
jest.mock('../src/services/ai.service', () => ({
    generateResumePdf: jest.fn()
}));

const { generateResumePdfController } = require('../src/controllers/interview.controller');
const aiService = require('../src/services/ai.service');

describe('Interview Controller - Resume PDF', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            params: { interviewReportId: 'report-123' },
            user: { id: 'user-456' }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            set: jest.fn(),
            send: jest.fn()
        };

        jest.clearAllMocks();
    });

    it('should return 404 if the interview report is not found', async () => {
        interviewReportModel.findOne.mockResolvedValue(null);

        await generateResumePdfController(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Interview Report Not Found' });
    });

    it('should return 400 if required fields are missing', async () => {
        interviewReportModel.findOne.mockResolvedValue({
            resume: 'Some resume',
            // Missing selfDescription and jobDescription
        });

        await generateResumePdfController(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'All fields are required' });
    });

    it('should generate PDF, set appropriate headers, and send the buffer', async () => {
        const mockPdfBuffer = Buffer.from('mock-pdf-content');

        interviewReportModel.findOne.mockResolvedValue({
            resume: 'Resume Text',
            selfDescription: 'Self Desc',
            jobDescription: 'Job Desc'
        });

        aiService.generateResumePdf.mockResolvedValue(mockPdfBuffer);

        await generateResumePdfController(mockReq, mockRes);

        // Verify the AI service was called with the correct parameters
        expect(aiService.generateResumePdf).toHaveBeenCalledWith({
            resume: 'Resume Text',
            selfDescription: 'Self Desc',
            jobDescription: 'Job Desc'
        });

        // Verify correct PDF headers were set
        expect(mockRes.set).toHaveBeenCalledWith({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_report-123.pdf`
        });

        // Verify the response sent the buffer
        expect(mockRes.send).toHaveBeenCalledWith(mockPdfBuffer);
    });
});