const https = require('https');

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
 * Makes a single HTTPS POST to the Google Calendar Events API.
 * @param {string} accessToken 
 * @param {object} eventBody 
 * @returns {Promise<object>} the created event JSON
 */
function createCalendarEvent(accessToken, eventBody) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(eventBody);

        const options = {
            hostname: 'www.googleapis.com',
            path:     '/calendar/v3/calendars/primary/events',
            method:   'POST',
            headers: {
                'Authorization':  `Bearer ${accessToken}`,
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(parsed);
                    } else {
                        reject(new Error(`Google Calendar API error ${res.statusCode}: ${data}`));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

/**
 * Syncs a preparation plan to Google Calendar.
 * Day 1 maps to today, Day 2 to tomorrow, etc.
 *
 * @param {object} params
 * @param {string}   params.accessToken      - Google OAuth access token
 * @param {Array}    params.preparationPlan  - Array of { day, focus, tasks[] }
 * @param {string}   params.title            - Job title (used in event summary)
 * @returns {Promise<Array>} list of created event objects { summary, htmlLink, date }
 */
async function syncToGoogleCalendar({ accessToken, preparationPlan, title }) {
    const today = new Date();

    const createdEvents = [];

    for (const plan of preparationPlan) {
        const dateStr     = offsetDate(today, plan.day - 1);   // Day 1 = today
        const nextDateStr = offsetDate(today, plan.day);       // end is exclusive in GCal

        const taskList = plan.tasks.map(t => `• ${t}`).join('\n');

        const eventBody = {
            summary: `${title} — Day ${plan.day}: ${plan.focus}`,
            description: `Interview Preparation Plan\n\nFocus: ${plan.focus}\n\nTasks:\n${taskList}`,
            start: {
                date: dateStr,          // all-day event
                timeZone: 'UTC',
            },
            end: {
                date: nextDateStr,      // exclusive end for all-day events
                timeZone: 'UTC',
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

        const created = await createCalendarEvent(accessToken, eventBody);
        createdEvents.push({
            summary:  created.summary,
            htmlLink: created.htmlLink,
            date:     dateStr,
        });
    }

    return createdEvents;
}

module.exports = { syncToGoogleCalendar };
