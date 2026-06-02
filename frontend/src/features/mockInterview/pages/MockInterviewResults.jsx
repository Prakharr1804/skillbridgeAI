import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getSession, getSessionResponses } from '../services/mockInterview.api';
import '../style/mockInterview.scss';

// ── Helpers ───────────────────────────────────────────────────────────────────

const scoreColor = (score) =>
  score >= 8 ? 'var(--score-high)' : score >= 5 ? 'var(--score-mid)' : 'var(--score-low)';

// ── Response Card ─────────────────────────────────────────────────────────────
const ResponseCard = ({ response, index }) => {
  const [open, setOpen] = useState(false);
  const { scores, speechAnalysis, starAnalysis, strengths, improvements, feedback,
          question, questionType, transcript } = response;

  return (
    <div className="mi-response-card">
      <div className="mi-response-card__header" onClick={() => setOpen(v => !v)}>
        <div className="mi-response-card__q-wrap">
          <div
            className={`mi-type-badge mi-type-badge--${questionType}`}
            style={{ fontSize: '0.55rem' }}
          >
            {questionType === 'technical' ? '⚙ Technical' : '💬 Behavioral'}
          </div>
          <p className="mi-response-card__q-text">
            <span style={{ color: 'var(--text-muted)', marginRight: 8, fontSize: '0.72rem' }}>
              Q{index + 1}
            </span>
            {question}
          </p>
        </div>
        <div className="mi-response-card__overall">
          <span className="mi-response-card__overall-value"
            style={{ color: scoreColor(scores?.overall) }}>
            {scores?.overall?.toFixed(1) ?? '—'}
          </span>
          <span className="mi-response-card__overall-label">/ 10</span>
        </div>
        <span className={`mi-response-card__chevron ${open ? 'mi-response-card__chevron--open' : ''}`}>
          ▾
        </span>
      </div>

      {open && (
        <div className="mi-response-card__body">
          {/* Score pills */}
          <div className="mi-response-card__scores">
            {[
              ['Content', scores?.contentAccuracy],
              ['Clarity', scores?.clarity],
              ['Structure', scores?.structure],
              ['Communication', scores?.communication],
            ].map(([label, val]) => (
              <span key={label} className="mi-response-card__score-pill">
                {label}: <span style={{ color: scoreColor(val) }}>{val?.toFixed(1) ?? '—'}</span>
              </span>
            ))}
          </div>

          {/* Transcript */}
          {transcript && (
            <div>
              <div className="mi-feedback-panel__label" style={{ marginBottom: 6 }}>Your Answer</div>
              <p className="mi-response-card__transcript">{transcript}</p>
            </div>
          )}

          {/* STAR (behavioral only) */}
          {questionType === 'behavioral' && starAnalysis && (
            <div>
              <div className="mi-feedback-panel__label" style={{ marginBottom: 6 }}>STAR Analysis</div>
              <div className="mi-star-grid">
                {[['Situation', starAnalysis.situation], ['Task', starAnalysis.task],
                  ['Action', starAnalysis.action], ['Result', starAnalysis.result]].map(([k, v]) => (
                  <div key={k} className={`mi-star-item ${v ? 'mi-star-item--pass' : 'mi-star-item--fail'}`}>
                    <span>{v ? '✓' : '✗'}</span>{k}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Speech metrics */}
          {speechAnalysis && (
            <div>
              <div className="mi-feedback-panel__label" style={{ marginBottom: 6 }}>Speech Metrics</div>
              <div className="mi-speech-metrics">
                <div className="mi-metric">
                  <span className="mi-metric__value">{speechAnalysis.speakingRate}</span>
                  <span className="mi-metric__label">WPM</span>
                </div>
                <div className="mi-metric">
                  <span className="mi-metric__value">{speechAnalysis.fillerWords}</span>
                  <span className="mi-metric__label">Fillers</span>
                </div>
                <div className="mi-metric">
                  <span className="mi-metric__value">{speechAnalysis.durationSeconds}s</span>
                  <span className="mi-metric__label">Duration</span>
                </div>
                <div className="mi-metric">
                  <span className="mi-metric__value">{speechAnalysis.averagePauseSeconds}s</span>
                  <span className="mi-metric__label">Avg Pause</span>
                </div>
              </div>
            </div>
          )}

          {/* Strengths */}
          {strengths?.length > 0 && (
            <div>
              <div className="mi-feedback-panel__label" style={{ marginBottom: 6 }}>Strengths</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {strengths.map((s, i) => (
                  <div key={i} className="mi-strength-item">{s}</div>
                ))}
              </div>
            </div>
          )}

          {/* Improvements */}
          {improvements?.length > 0 && (
            <div>
              <div className="mi-feedback-panel__label" style={{ marginBottom: 6 }}>Improvements</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {improvements.map((s, i) => (
                  <div key={i} className="mi-improvement-item">{s}</div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback */}
          {feedback?.length > 0 && (
            <div>
              <div className="mi-feedback-panel__label" style={{ marginBottom: 6 }}>Coach Feedback</div>
              <div className="mi-feedback-list">
                {feedback.map((f, i) => <div key={i} className="mi-feedback-item">{f}</div>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Progress bar ──────────────────────────────────────────────────────────────
const StatBar = ({ label, value, max = 10 }) => (
  <div className="mi-summary-banner__stat-row">
    <span className="mi-summary-banner__stat-label">{label}</span>
    <div className="mi-summary-banner__stat-bar-wrap">
      <div
        className="mi-summary-banner__stat-bar"
        style={{
          width: `${(value / max) * 100}%`,
          background: scoreColor(value),
        }}
      />
    </div>
    <span className="mi-summary-banner__stat-value" style={{ color: scoreColor(value) }}>
      {value?.toFixed(1) ?? '—'}
    </span>
  </div>
);

// ── Main Results Page ─────────────────────────────────────────────────────────
const MockInterviewResults = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [responses, setResponses] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionRes, responsesRes] = await Promise.all([
          getSession(sessionId),
          getSessionResponses(sessionId),
        ]);
        setSession(sessionRes.data.session);
        setResponses(responsesRes.data.responses || []);
      } catch (err) {
        setError('Failed to load results. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="mi-fullscreen-state">
        <div className="mi-fullscreen-state__spinner" />
        <p className="mi-fullscreen-state__sub">Loading your results…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mi-fullscreen-state">
        <div className="mi-fullscreen-state__icon">⚠️</div>
        <p className="mi-fullscreen-state__sub">{error}</p>
        <button className="mi-btn mi-btn--outline" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  const summary = session?.summary || {};
  const overallScore = session?.overallScore ?? summary.overallScore;
  const techAvg = summary.technicalAverage;
  const behAvg  = summary.behavioralAverage;
  const topStrengths    = summary.topStrengths    || [];
  const topImprovements = summary.topImprovements || [];

  const reportId = session?.interviewReport?._id || session?.interviewReport;

  return (
    <div className="mi-results-page">

      {/* Header */}
      <header className="mi-results-header">
        <button
          className="mi-btn mi-btn--outline"
          style={{ padding: '6px 14px', fontSize: '0.78rem' }}
          onClick={() => navigate(reportId ? `/interview/${reportId}` : '/')}
        >
          ← Back to Report
        </button>
        <span className="mi-results-header__title">Session Results</span>
      </header>

      <div className="mi-results-body">

        {/* Summary banner */}
        <div className="mi-summary-banner">
          <div className="mi-summary-banner__score-block">
            <span className="mi-summary-banner__score-label">Overall Score</span>
            <span
              className="mi-summary-banner__score-value"
              style={{ color: scoreColor(overallScore) }}
            >
              {overallScore?.toFixed(1) ?? '—'}
            </span>
            <span className="mi-summary-banner__score-max">/ 10</span>
          </div>

          <div className="mi-summary-banner__divider" />

          <div className="mi-summary-banner__stats">
            {techAvg !== undefined && <StatBar label="Technical Average"  value={techAvg} />}
            {behAvg  !== undefined && <StatBar label="Behavioral Average" value={behAvg}  />}
            <div className="mi-summary-banner__stat-row">
              <span className="mi-summary-banner__stat-label">Questions Completed</span>
              <span className="mi-summary-banner__stat-value" style={{ color: 'var(--text-primary)' }}>
                {session?.completedQuestions} / {session?.totalQuestions}
              </span>
            </div>
          </div>
        </div>

        {/* Top Strengths */}
        {topStrengths.length > 0 && (
          <div>
            <h2 className="mi-section-title">Top Strengths</h2>
            <div className="mi-strengths-grid">
              {topStrengths.map((s, i) => (
                <div key={i} className="mi-strength-item">{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* Top Improvements */}
        {topImprovements.length > 0 && (
          <div>
            <h2 className="mi-section-title">Key Improvements</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topImprovements.map((s, i) => (
                <div key={i} className="mi-improvement-item">{s}</div>
              ))}
            </div>
          </div>
        )}

        {/* Per-question responses */}
        {responses.length > 0 && (
          <div>
            <h2 className="mi-section-title">Question Breakdown</h2>
            <div className="mi-response-list">
              {responses.map((r, i) => (
                <ResponseCard key={r._id} response={r} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* Footer action */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <button
            className="mi-btn mi-btn--submit"
            style={{ padding: '12px 32px', fontSize: '0.88rem' }}
            onClick={() => navigate(reportId ? `/interview/${reportId}` : '/')}
          >
            Back to Interview Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default MockInterviewResults;
