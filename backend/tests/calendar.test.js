const { syncToCalendarController } = require('../src/controllers/calendar.controller');
const interviewReportModel = require('../src/models/interviewReport.model');
const googleCalendarService = require('../src/services/googleCalendar.service');

// Mock dependencies
jest.mock('../src/models/interviewReport.model');
jest.mock('../src/services/googleCalendar.service');

describe('Calendar Controller', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockReq = {
            params: { interviewReportId: 'report-123' },
            body: { accessToken: 'valid-token' },
            user: { id: 'user-456' }
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        jest.clearAllMocks();
    });

    it('should return 400 if access token is missing', async () => {
        mockReq.body.accessToken = undefined;

        await syncToCalendarController(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Google access token is required' });
    });

    it('should return 404 if interview report is not found', async () => {
        interviewReportModel.findOne.mockResolvedValue(null);

        await syncToCalendarController(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(404);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'Interview Report Not Found' });
    });

    it('should return 400 if preparation plan is empty', async () => {
        interviewReportModel.findOne.mockResolvedValue({
            preparationPlan: [],
            title: 'Software Engineer'
        });

        await syncToCalendarController(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'No preparation plan found in this report' });
    });

    it('should successfully sync and update eventIds in the database', async () => {
        // Mock report with a preparation plan
        const mockPlanItem = {
            _id: 'plan-1',
            day: 1,
            focus: 'DSA',
            tasks: ['Arrays'],
            eventId: undefined
        };

        const mockSave = jest.fn();
        const mockIdFunc = jest.fn().mockReturnValue(mockPlanItem);

        interviewReportModel.findOne.mockResolvedValue({
            preparationPlan: {
                length: 1,
                id: mockIdFunc
            },
            title: 'Software Engineer',
            save: mockSave
        });

        // Mock the service returning synced events
        googleCalendarService.syncToGoogleCalendar.mockResolvedValue([
            { planId: 'plan-1', eventId: 'gcal-event-1', summary: 'Day 1' }
        ]);

        await syncToCalendarController(mockReq, mockRes);

        // Verify the service was called correctly
        expect(googleCalendarService.syncToGoogleCalendar).toHaveBeenCalledWith(expect.objectContaining({
            accessToken: 'valid-token',
            title: 'Software Engineer'
        }));

        // Verify the eventId was updated on the subdocument
        expect(mockIdFunc).toHaveBeenCalledWith('plan-1');
        expect(mockPlanItem.eventId).toBe('gcal-event-1');

        // Verify the document was saved
        expect(mockSave).toHaveBeenCalled();

        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
            message: 'Successfully synced 1 days to Google Calendar'
        }));
    });

    it('should handle errors gracefully and return 500', async () => {
        interviewReportModel.findOne.mockRejectedValue(new Error('Database error'));

        await syncToCalendarController(mockReq, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(500);
        expect(mockRes.json).toHaveBeenCalledWith({ message: 'An error occurred while syncing to Google Calendar' });
    });
});