import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:3000",
    withCredentials: true,
});

/**
 * Syncs the preparation plan of an interview report to Google Calendar.
 * @param {object} params
 * @param {string} params.interviewReportId
 * @param {string} params.accessToken - Google OAuth access token
 * @returns {Promise<{ message: string, events: Array }>}
 */
export const syncToGoogleCalendar = async ({ interviewReportId, accessToken }) => {
    const response = await api.post(
        `/api/interview/calendar/sync/${interviewReportId}`,
        { accessToken }
    );
    return response.data;
};
