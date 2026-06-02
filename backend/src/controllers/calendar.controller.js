const interviewReportModel = require('../models/interviewReport.model');
const { syncToGoogleCalendar } = require('../services/googleCalendar.service');

/**
 * @name syncToCalendarController
 * @description Syncs a preparation plan from an interview report to Google Calendar.
 *              Requires a valid Google OAuth access token in the request body.
 * @access private
 */
async function syncToCalendarController(req, res) {
    try {
        const { interviewReportId } = req.params;
        const { accessToken } = req.body;

        if (!accessToken) {
            return res.status(400).json({ message: 'Google access token is required' });
        }

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id,
        });

        if (!interviewReport) {
            return res.status(404).json({ message: 'Interview Report Not Found' });
        }

        const { preparationPlan, title } = interviewReport;

        if (!preparationPlan || preparationPlan.length === 0) {
            return res.status(400).json({ message: 'No preparation plan found in this report' });
        }

        const events = await syncToGoogleCalendar({ accessToken, preparationPlan, title });

        // Update the preparation plan with the returned event IDs
        events.forEach(event => {
            const planItem = interviewReport.preparationPlan.id(event.planId);
            if (planItem) {
                planItem.eventId = event.eventId;
            }
        });

        await interviewReport.save();

        return res.status(200).json({
            message: `Successfully synced ${events.length} days to Google Calendar`,
            events,
        });
    } catch (error) {
        console.error('Calendar sync error:', error);
        return res.status(500).json({ message: 'An error occurred while syncing to Google Calendar' });
    }
}

module.exports = { syncToCalendarController };
