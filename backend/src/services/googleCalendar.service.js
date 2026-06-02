/**
 * Adds `days` calendar days to a Date and returns the result as "YYYY-MM-DD"
 * @param {Date} base 
 * @param {number} days 
 * @returns {string}
 */
function offsetDate(base, days) {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Makes a single fetch request to the Google Calendar Events API.
 * @param {string} accessToken 
 * @param {object} eventBody 
 * @param {string} [eventId]
 * @returns {Promise<object>} the created/updated event JSON
 */
async function createOrUpdateCalendarEvent(accessToken, eventBody, eventId) {
    const url = eventId
        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`
        : `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

    const method = eventId ? 'PUT' : 'POST';

    const response = await fetch(url, {
        method,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
    });

    const parsed = await response.json();

    if (!response.ok) {
        throw new Error(`Google Calendar API error ${response.status}: ${JSON.stringify(parsed)}`);
    }

    return parsed;
}

/**
 * Syncs a preparation plan to Google Calendar.
 * Day 1 maps to today, Day 2 to tomorrow, etc.
 * Uses Promise.all to process in batches.
 *
 * @param {object} params
 * @param {string}   params.accessToken      - Google OAuth access token
 * @param {Array}    params.preparationPlan  - Array of { day, focus, tasks[], _id, eventId }
 * @param {string}   params.title            - Job title (used in event summary)
 * @returns {Promise<Array>} list of created event objects { summary, htmlLink, date, eventId, planId }
 */
async function syncToGoogleCalendar({ accessToken, preparationPlan, title }) {
    const today = new Date();

    const BATCH_SIZE = 5;
    const syncedEvents = [];

    for (let i = 0; i < preparationPlan.length; i += BATCH_SIZE) {
        const batch = preparationPlan.slice(i, i + BATCH_SIZE);

        const batchPromises = batch.map(async (plan) => {
            const dateStr     = offsetDate(today, plan.day - 1);   // Day 1 = today
            const nextDateStr = offsetDate(today, plan.day);       // end is exclusive in GCal

            const taskList = plan.tasks.map(t => `• ${t}`).join('\n');

            const eventBody = {
                summary: `${title} — Day ${plan.day}: ${plan.focus}`,
                description: `Interview Preparation Plan\n\nFocus: ${plan.focus}\n\nTasks:\n${taskList}`,
                start: {
                    date: dateStr,          // all-day event without explicit UTC timezone
                },
                end: {
                    date: nextDateStr,      // exclusive end for all-day events
                },
                colorId: '7',               // Teal / Peacock
                reminders: {
                    useDefault: false,
                    overrides: [
                        { method: 'email',  minutes: 24 * 60 },  // 1-day email reminder
                        { method: 'popup',  minutes: 30 },        // 30-min popup
                    ],
                },
            };

            const created = await createOrUpdateCalendarEvent(accessToken, eventBody, plan.eventId);
            return {
                summary:  created.summary,
                htmlLink: created.htmlLink,
                date:     dateStr,
                eventId:  created.id,
                planId:   plan._id
            };
        });

        const batchResults = await Promise.all(batchPromises);
        syncedEvents.push(...batchResults);
    }

    return syncedEvents;
}

module.exports = { syncToGoogleCalendar };
