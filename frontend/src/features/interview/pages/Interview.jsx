import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useInterview } from '../hooks/useInterview';
import CalendarSyncModal from '../components/CalendarSyncModal';
import { createSession } from '../../mockInterview/services/mockInterview.api';
import '../style/interview.scss';

// ─── NAV SECTIONS ────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'technical', label: 'Technical Questions' },
  { id: 'behavioral', label: 'Behavioral Questions' },
  { id: 'roadmap', label: 'Road Map' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const QuestionCard = ({ index, question, intention, answer }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={`iv-question-card ${open ? 'iv-question-card--open' : ''}`}>
      <button className="iv-question-card__header" onClick={() => setOpen(v => !v)}>
        <span className="iv-question-card__index">{String(index + 1).padStart(2, '0')}</span>
        <span className="iv-question-card__q">{question}</span>
        <span className="iv-question-card__chevron">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="iv-question-card__body">
          <div className="iv-question-card__block">
            <span className="iv-question-card__block-label">INTENTION</span>
            <p>{intention}</p>
          </div>
          <div className="iv-question-card__block">
            <span className="iv-question-card__block-label">SUGGESTED ANSWER</span>
            <p>{answer}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const RoadmapCard = ({ day, focus, tasks }) => (
  <div className="iv-roadmap-card">
    <div className="iv-roadmap-card__day">DAY {day}</div>
    <div className="iv-roadmap-card__focus">{focus}</div>
    <ul className="iv-roadmap-card__tasks">
      {tasks.map((task, i) => (
        <li key={i} className="iv-roadmap-card__task">
          <span className="iv-roadmap-card__bullet" />
          {task}
        </li>
      ))}
    </ul>
  </div>
);

// ─── Main content renderer ────────────────────────────────────────────────────
const MainContent = ({ activeSection, data, onSyncCalendar }) => {
  if (!data) return null;


  if (activeSection === 'technical') {
    return (
      <div className="iv-content-section">
        <h2 className="iv-content-section__title">Technical Questions</h2>
        <p className="iv-content-section__meta">{data.technicalQuestions.length} questions • Click to expand</p>
        <div className="iv-content-section__list">
          {data.technicalQuestions.map((q, i) => (
            <QuestionCard key={i} index={i} {...q} />
          ))}
        </div>
      </div>
    );
  }

  if (activeSection === 'behavioral') {
    return (
      <div className="iv-content-section">
        <h2 className="iv-content-section__title">Behavioral Questions</h2>
        <p className="iv-content-section__meta">{data.behavioralQuestions.length} questions • Click to expand</p>
        <div className="iv-content-section__list">
          {data.behavioralQuestions.map((q, i) => (
            <QuestionCard key={i} index={i} {...q} />
          ))}
        </div>
      </div>
    );
  }

  if (activeSection === 'roadmap') {
    return (
      <div className="iv-content-section">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '6px' }}>
          <div>
            <h2 className="iv-content-section__title">Preparation Road Map</h2>
            <p className="iv-content-section__meta">{data.preparationPlan.length}-day focused plan</p>
          </div>
          <button
            id="cal-sync-btn"
            className="home__btn-generate"
            style={{ fontSize: '0.78rem', padding: '9px 14px', borderRadius: '8px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' }}
            onClick={onSyncCalendar}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Sync to Google Calendar
          </button>
        </div>
        <div className="iv-content-section__list">
          {data.preparationPlan.map((plan, i) => (
            <RoadmapCard key={i} {...plan} />
          ))}
        </div>
      </div>
    );
  }

  return null;
};

// ─── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#e8334a';

  return (
    <div className="iv-score">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#2a2a2a" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius}
          fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
      </svg>
      <div className="iv-score__label">
        <span className="iv-score__value" style={{ color }}>{score}</span>
        <span className="iv-score__unit">/ 100</span>
      </div>
    </div>
  );
};

// ─── PAGE COMPONENT ───────────────────────────────────────────────────────────
const Interview = () => {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { report, loading, getReportById, getResumePdf, syncCalendar } = useInterview();
  const [activeSection, setActiveSection] = useState('technical');
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [startingSession, setStartingSession] = useState(false);

  const handleStartMockInterview = async () => {
    setStartingSession(true);
    try {
      const res = await createSession(interviewId);
      navigate(`/mock-interview/session/${res.data.session._id}`);
    } catch (err) {
      console.error('Failed to create session:', err);
      alert(err?.response?.data?.message || 'Failed to start mock interview. Please try again.');
    } finally {
      setStartingSession(false);
    }
  };

  // Fetch from API whenever the URL param changes
  // (handles direct navigation / page refresh)
  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId);
    }
  }, [interviewId]);

  // ── Loading state ──
  if (loading) {
    return (
      <main className="interview interview--loading">
        <div className="iv-spinner" />
        <p className="iv-loading-text">Loading your interview report…</p>
      </main>
    );
  }

  // ── Error / not found state ──
  if (!report) {
    return (
      <main className="interview interview--loading">
        <p className="iv-loading-text">Report not found.</p>
      </main>
    );
  }

  return (
    <main className="interview">

      {/* ── Left Sidebar — Navigation ── */}
      <aside className="iv-sidebar iv-sidebar--left">
        <div className="iv-sidebar__brand">
          <span className="iv-sidebar__brand-dot" />
          INTERVIEW REPORT
        </div>

        <nav className="iv-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`iv-nav__item ${activeSection === item.id ? 'iv-nav__item--active' : ''}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className="iv-nav__indicator" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Start Mock Interview */}
        <button
          className="home__btn-generate"
          style={{
            marginTop: 'auto',
            fontSize: '0.82rem',
            padding: '11px 12px',
            borderRadius: '8px',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
            opacity: startingSession ? 0.7 : 1,
          }}
          onClick={handleStartMockInterview}
          disabled={startingSession}
        >
          {startingSession ? '⏳ Starting…' : '🎙 Start Mock Interview'}
        </button>

        {/* Download Resume */}
        <button 
          className="home__btn-generate" 
          style={{ fontSize: '0.82rem', padding: '10px 12px', borderRadius: "8px", fontWeight: 500}}
          onClick={() => {getResumePdf(interviewId)}}
        >
          Download <br /> AI-Generated Custom Resume
        </button>
      </aside>

      {/* ── Center — Main Content ── */}
      <section className="iv-main">
        <MainContent activeSection={activeSection} data={report} onSyncCalendar={() => setShowCalendarModal(true)} />
      </section>

      {/* ── Right Sidebar — Skill Gaps + Score ── */}
      <aside className="iv-sidebar iv-sidebar--right">

        {/* Match Score */}
        <div className="iv-sidebar__block">
          <span className="iv-sidebar__block-label">MATCH SCORE</span>
          <ScoreRing score={report.matchScore} />
        </div>

        {/* Skill Gaps */}
        <div className="iv-sidebar__block">
          <span className="iv-sidebar__block-label">SKILL GAPS</span>
          <div className="iv-skill-gaps">
            {report.skillGaps.map((gap, i) => (
              <span
                key={i}
                className={`iv-skill-gap iv-skill-gap--${gap.severity}`}
                title={`Severity: ${gap.severity}`}
              >
                {gap.skill}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Google Calendar Sync Modal ── */}
      <CalendarSyncModal
        isOpen={showCalendarModal}
        onClose={() => setShowCalendarModal(false)}
        report={report}
        interviewId={interviewId}
        syncCalendar={syncCalendar}
      />
    </main>
  );
};

export default Interview;