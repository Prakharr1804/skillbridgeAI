# Codebase Review: Shortcomings & Areas for Improvement

Here is a high-level summary of the main issues across both the frontend and backend of the skillbridgeAI repository, along with a specific check on the Google Calendar connectivity.

## 1. Backend Shortcomings

*   **Missing Environment Variables / `.env.example`:** The backend heavily relies on environment variables (`process.env.MONGO_URI`, `process.env.JWT_SECRET`, `process.env.GEMINI_API_KEY`, etc.), but there is no `.env.example` file provided. This makes it difficult for a new developer to set up the project locally. The backend currently crashes on startup if `MONGO_URI` is not set because there's no fallback or informative error message, only a raw Mongoose exception.
*   **Hardcoded Origins (CORS):** In `backend/src/app.js`, CORS is hardcoded to `http://localhost:5173`. This will break when deploying to production, as the frontend will have a different domain. It should be driven by an environment variable (e.g., `process.env.FRONTEND_URL`).
*   **Security Concerns:**
    *   Passwords are encrypted, which is good, but there's no rate limiting (e.g., `express-rate-limit`) on auth endpoints like `/api/auth/login`, making it susceptible to brute-force attacks.
    *   Session cookies (JWT token) are set without `secure: true` and `httpOnly: true` (or it's not explicitly enforced properly in all routes), which can expose them to XSS and man-in-the-middle attacks over HTTP.
*   **Error Handling:** The backend often returns generic error messages and relies heavily on `try-catch` blocks being completely absent from async controllers (e.g., `auth.controller.js`). If a database query fails or throws an exception, the Node.js process might crash because there is no global error handling middleware catching unhandled promise rejections.
*   **Lack of Tests:** There's no automated testing setup (Jest, Mocha, etc.) for the backend services and controllers. The `package.json` script for tests just prints "Error: no test specified".

## 2. Frontend Shortcomings

*   **Hardcoded API URLs:** In `frontend/src/features/interview/services/calendar.api.js` (and likely other API files), the `baseURL` is hardcoded to `http://localhost:3000`. Similar to the backend CORS issue, this will require manual code changes before deploying to production. It should use `import.meta.env.VITE_API_URL` instead.
*   **Error Handling in UI:** In `CalendarSyncModal.jsx`, while there is a basic error state for Google Calendar, there is no global error boundary or generalized way to display API errors to the user in a friendly manner if backend requests fail globally.
*   **Missing `.env.example`:** Same as the backend, the frontend requires a `VITE_GOOGLE_CLIENT_ID` to function correctly (for Google Auth/Calendar), but there is no `.env.example` provided. The code in `CalendarSyncModal.jsx` handles this gracefully by showing a fallback screen, but a template `.env` would speed up setup.
*   **Lack of Tests:** The frontend is similarly missing automated tests (Unit testing with Vitest/React Testing Library or E2E with Cypress/Playwright).

## 3. Specific Focus: Google Calendar Connectivity

The Google Calendar synchronization feature (`syncToGoogleCalendar`) has a few significant shortcomings and potential bugs:

*   **Timezone & All-Day Event Ambiguity:** In `backend/src/services/googleCalendar.service.js`, the events are created as "all-day" events by specifying only `date` (e.g., `2024-11-20`) and setting `timeZone: 'UTC'`.
    *   **The Issue:** Google Calendar expects `date` properties to represent all-day events according to the user's local timezone, but forcing `timeZone: 'UTC'` can cause the events to appear on the wrong day depending on the user's timezone relative to UTC.
    *   **Improvement:** It's generally better to let Google Calendar handle the timezone implicitly for all-day events (by just providing `YYYY-MM-DD` and omitting `timeZone`), or explicitly fetch the user's timezone from the frontend and pass it to the backend.
*   **Missing Refresh Token Handling:** The integration only uses the short-lived `access_token` passed directly from the frontend (`useGoogleLogin`). This is fine for a one-off immediate sync right after the user clicks the button. However, if the backend process takes too long or if there's an intent to sync *future* events asynchronously, this will fail once the token expires (usually 1 hour). A robust integration would use an OAuth "authorization code flow", securely store a `refresh_token` on the backend, and get a fresh access token when needed.
*   **No "Undo" or "Update" Capability:** The `syncToCalendarController` simply loops through the preparation plan and creates *new* events on Google Calendar. If the user clicks "Sync" twice for the same report, they will get duplicate events. The system does not keep track of the Google Calendar `eventId`s it created, so it cannot update or delete them later.
*   **Rate Limiting / Batching:** The backend creates calendar events by making sequential HTTP POST requests in a `for` loop (`await createCalendarEvent`). If a preparation plan has 30 days, this makes 30 sequential API calls. This is slow and risks hitting Google Calendar API rate limits. It should ideally be batched, parallelized (with concurrency limits like `Promise.all` in chunks), or placed in a background queue.
*   **Raw HTTPS Module Usage:** The `googleCalendar.service.js` uses Node's native `https` module directly. While this works, using an established library like `axios`, `node-fetch`, or the official `googleapis` npm package would make the code much cleaner, easier to maintain, and less prone to parsing errors.

## Conclusion

The application provides a solid proof-of-concept but lacks production readiness. The immediate priorities before any release should be extracting hardcoded URLs into environment variables, implementing global error handling on the backend (to prevent crashes), and securing the session management. For the Google Calendar feature specifically, preventing duplicate event creation and handling user timezones correctly are the most critical fixes.
