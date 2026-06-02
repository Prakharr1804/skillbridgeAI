import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import '../style/calendar-modal.scss';

// ── SVG Icons ─────────────────────────────────────────────────────────────────

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8"  y1="2" x2="8"  y2="6" />
    <line x1="3"  y1="10" x2="21" y2="10" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inner component — only rendered when GoogleOAuthProvider is mounted.
 * Keeps useGoogleLogin away from cases where the provider is absent.
 */
const CalendarSyncInner = ({ onClose, report, interviewId, syncCalendar }) => {
  const [status, setStatus] = useState('idle'); // 'idle' | 'syncing' | 'success' | 'error'
  const [createdEvents, setCreatedEvents] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');


  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const login = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/calendar.events',
    onSuccess: async (tokenResponse) => {
      setStatus('syncing');
      setErrorMsg('');
      try {
        const result = await syncCalendar({
          accessToken: tokenResponse.access_token,
          interviewReportId: interviewId,
        });
        setCreatedEvents(result.events || []);
        setStatus('success');
      } catch (err) {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          'Failed to sync with Google Calendar. Please try again.';
        setErrorMsg(msg);
        setStatus('error');
      }
    },
    onError: (err) => {
      console.error('Google OAuth error', err);
      setErrorMsg('Google sign-in was cancelled or failed. Please try again.');
      setStatus('error');
    },
  });

  const handleClose = () => {
    setStatus('idle');
    setCreatedEvents([]);
    setErrorMsg('');
    onClose();
  };

  const plan = report?.preparationPlan || [];

  return (
    <>
      {/* ── Header ── */}
      <div className="cal-modal__header">
        <div className="cal-modal__title-wrap">
          <div className="cal-modal__icon"><CalendarIcon /></div>
          <div>
            <div className="cal-modal__title" id="cal-modal-title">Sync to Google Calendar</div>
            <div className="cal-modal__subtitle">Add your prep plan as calendar events</div>
          </div>
        </div>
        <button className="cal-modal__close" onClick={handleClose} aria-label="Close modal">✕</button>
      </div>

      {/* IDLE / ERROR */}
      {(status === 'idle' || status === 'error') && (
        <>
          <div className="cal-modal__info">
            <div className="cal-modal__info-row">
              <span className="cal-modal__info-label">Plan</span>
              <span className="cal-modal__info-value">{report?.title || 'Interview Prep'}</span>
            </div>
            <div className="cal-modal__info-divider" />
            <div className="cal-modal__info-row">
              <span className="cal-modal__info-label">Duration</span>
              <span className="cal-modal__info-value">{plan.length} days</span>
            </div>
            <div className="cal-modal__info-divider" />
            <div className="cal-modal__info-row">
              <span className="cal-modal__info-label">Starting</span>
              <span className="cal-modal__info-value">Today — {todayLabel}</span>
            </div>
            {plan.length > 0 && (
              <>
                <div className="cal-modal__info-divider" />
                <div className="cal-modal__day-preview">
                  {plan.slice(0, 7).map((p) => (
                    <span key={p.day} className="cal-modal__day-chip">Day {p.day}</span>
                  ))}
                  {plan.length > 7 && (
                    <span className="cal-modal__day-chip">+{plan.length - 7} more</span>
                  )}
                </div>
              </>
            )}
          </div>

          {status === 'error' && (
            <div className="cal-modal__error">
              <span className="cal-modal__error-icon">⚠️</span>
              <span className="cal-modal__error-text">{errorMsg}</span>
            </div>
          )}

          <div className="cal-modal__actions">
            <button id="cal-connect-sync-btn" className="cal-modal__btn-google" onClick={() => login()}>
              <GoogleIcon />
              {status === 'error' ? 'Try Again with Google' : 'Connect & Sync with Google'}
            </button>
            <button className="cal-modal__btn-cancel" onClick={handleClose}>Cancel</button>
          </div>
        </>
      )}

      {/* SYNCING */}
      {status === 'syncing' && (
        <div className="cal-modal__loading">
          <div className="cal-modal__loading-spinner" />
          <p className="cal-modal__loading-text">CREATING {plan.length} CALENDAR EVENTS…</p>
        </div>
      )}

      {/* SUCCESS */}
      {status === 'success' && (
        <>
          <div className="cal-modal__success">
            <div className="cal-modal__success-icon"><CheckIcon /></div>
            <div className="cal-modal__success-title">All done! 🎉</div>
            <div className="cal-modal__success-sub">
              {createdEvents.length} events added to your Google Calendar starting today.
            </div>
            <div className="cal-modal__success-events">
              {createdEvents.map((ev, i) => (
                <div key={i} className="cal-modal__success-event">
                  <span className="cal-modal__success-event-name">{ev.summary}</span>
                  <a href={ev.htmlLink} target="_blank" rel="noreferrer" className="cal-modal__success-event-link">
                    View ↗
                  </a>
                </div>
              ))}
            </div>
          </div>
          <div className="cal-modal__actions">
            <button className="cal-modal__btn-cancel" onClick={handleClose}>Close</button>
          </div>
        </>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Not-configured fallback — shown when VITE_GOOGLE_CLIENT_ID is missing.
 */
const CalendarNotConfigured = ({ onClose }) => (
  <>
    <div className="cal-modal__header">
      <div className="cal-modal__title-wrap">
        <div className="cal-modal__icon"><CalendarIcon /></div>
        <div>
          <div className="cal-modal__title" id="cal-modal-title">Setup Required</div>
          <div className="cal-modal__subtitle">Google Calendar isn't configured yet</div>
        </div>
      </div>
      <button className="cal-modal__close" onClick={onClose} aria-label="Close modal">✕</button>
    </div>

    <div className="cal-modal__error" style={{ flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="cal-modal__error-icon">⚙️</span>
        <span className="cal-modal__error-text" style={{ fontWeight: 600 }}>
          VITE_GOOGLE_CLIENT_ID is not set
        </span>
      </div>
      <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[
          'Go to console.cloud.google.com',
          'Enable Google Calendar API',
          'Create an OAuth Client ID (Web app)',
          'Add http://localhost:5173 as Authorized JS origin',
          'Create frontend/.env with VITE_GOOGLE_CLIENT_ID=<your-id>',
          'Restart the Vite dev server',
        ].map((step, i) => (
          <li key={i} className="cal-modal__error-text">{step}</li>
        ))}
      </ol>
    </div>

    <div className="cal-modal__actions">
      <button className="cal-modal__btn-cancel" onClick={onClose}>Close</button>
    </div>
  </>
);

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public modal shell — safely handles missing GoogleOAuthProvider.
 */
const CalendarSyncModal = ({ isOpen, onClose, report, interviewId, syncCalendar }) => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isConfigured = Boolean(clientId && clientId !== 'your_google_client_id_here');

  if (!isOpen) return null;

  return (
    <div
      className="cal-modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="cal-modal" role="dialog" aria-modal="true" aria-labelledby="cal-modal-title">
        {isConfigured ? (
          <CalendarSyncInner
            onClose={onClose}
            report={report}
            interviewId={interviewId}
            syncCalendar={syncCalendar}
          />
        ) : (
          <CalendarNotConfigured onClose={onClose} />
        )}
      </div>
    </div>
  );
};

export default CalendarSyncModal;
