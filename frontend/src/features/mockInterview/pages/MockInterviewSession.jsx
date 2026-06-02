import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { getNextQuestion, submitAudioAnswer } from '../services/mockInterview.api';
import '../style/mockInterview.scss';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatTime = (secs) => {
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return `${m}:${s}`;
};

const scoreColor = (score) =>
  score >= 8 ? 'var(--score-high)' : score >= 5 ? 'var(--score-mid)' : 'var(--score-low)';

// ── Sub-components ────────────────────────────────────────────────────────────

const WaveForm = ({ active }) => (
  <div className="mi-recording__waveform">
    {Array.from({ length: 16 }, (_, i) => (
      <div
        key={i}
        className={`mi-recording__wave-bar ${active ? 'mi-recording__wave-bar--active' : ''}`}
        style={{
          height: `${20 + Math.sin(i * 0.8) * 14 + Math.random() * 8}px`,
          opacity: active ? undefined : 0.25,
        }}
      />
    ))}
  </div>
);

const ScoreCard = ({ label, score }) => (
  <div className="mi-score-card">
    <span className="mi-score-card__value" style={{ color: scoreColor(score) }}>
      {score?.toFixed(1) ?? '—'}
    </span>
    <span className="mi-score-card__label">{label}</span>
  </div>
);

const StarItem = ({ label, value }) => (
  <div className={`mi-star-item ${value ? 'mi-star-item--pass' : 'mi-star-item--fail'}`}>
    <span className="mi-star-item__icon">{value ? '✓' : '✗'}</span>
    {label}
  </div>
);

// ── Feedback panel shown after submission ─────────────────────────────────────
const FeedbackPanel = ({ response, onNext, isLast }) => {
  const { scores, speechAnalysis, starAnalysis, feedback, strengths, improvements, questionType } = response;
  const isBehavioral = questionType === 'behavioral';

  return (
    <div className="mi-feedback-panel" style={{ animation: 'mi-fade-in 0.4s ease' }}>

      {/* Overall score */}
      <div>
        <div className="mi-feedback-panel__label">Overall Score</div>
        <div className="mi-overall">
          <div className="mi-overall__label">
            <span className="mi-overall__title">Score</span>
            <span className="mi-overall__value" style={{ color: scoreColor(scores.overall) }}>
              {scores.overall?.toFixed(1)}
            </span>
          </div>
          <span className="mi-overall__max">/ 10</span>
        </div>
      </div>

      {/* Score breakdown */}
      <div>
        <div className="mi-feedback-panel__label">Breakdown</div>
        <div className="mi-score-grid">
          <ScoreCard label="Content" score={scores.contentAccuracy} />
          <ScoreCard label="Clarity" score={scores.clarity} />
          <ScoreCard label="Structure" score={scores.structure} />
          <ScoreCard label="Comm." score={scores.communication} />
        </div>
      </div>

      {/* STAR analysis — behavioral only */}
      {isBehavioral && starAnalysis && (
        <div>
          <div className="mi-feedback-panel__label">STAR Analysis</div>
          <div className="mi-star-grid">
            <StarItem label="Situation" value={starAnalysis.situation} />
            <StarItem label="Task"      value={starAnalysis.task}      />
            <StarItem label="Action"    value={starAnalysis.action}    />
            <StarItem label="Result"    value={starAnalysis.result}    />
          </div>
        </div>
      )}

      {/* Strengths */}
      {strengths?.length > 0 && (
        <div>
          <div className="mi-feedback-panel__label">Strengths</div>
          <div className="mi-feedback-list">
            {strengths.map((s, i) => (
              <div key={i} className="mi-feedback-item">{s}</div>
            ))}
          </div>
        </div>
      )}

      {/* Improvements */}
      {improvements?.length > 0 && (
        <div>
          <div className="mi-feedback-panel__label">Improvements</div>
          <div className="mi-feedback-list">
            {improvements.map((s, i) => (
              <div key={i} className="mi-feedback-item">{s}</div>
            ))}
          </div>
        </div>
      )}

      {/* Speech metrics */}
      {speechAnalysis && (
        <div>
          <div className="mi-feedback-panel__label">Speech Metrics</div>
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

      {/* Feedback points */}
      {feedback?.length > 0 && (
        <div>
          <div className="mi-feedback-panel__label">Feedback</div>
          <div className="mi-feedback-list">
            {feedback.map((f, i) => (
              <div key={i} className="mi-feedback-item">{f}</div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <button className="mi-btn mi-btn--next" onClick={onNext}>
        {isLast ? '🎉 View Results' : 'Next Question →'}
      </button>
    </div>
  );
};

// Placeholder when no feedback yet
const FeedbackPlaceholder = () => (
  <div className="mi-feedback-panel">
    <div className="mi-feedback-panel__placeholder">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      <p className="mi-feedback-panel__placeholder-text">
        Record your answer and submit<br />to see your evaluation here.
      </p>
    </div>
  </div>
);

// ── Main Session Page ─────────────────────────────────────────────────────────
const MockInterviewSession = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Phase: 'loading' | 'idle' | 'recording' | 'recorded' | 'processing' | 'feedback' | 'done'
  const [phase, setPhase] = useState('loading');
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [response, setResponse] = useState(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [error, setError] = useState('');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const timerRef         = useRef(null);
  const streamRef        = useRef(null);

  // ── Load next question ──────────────────────────────────────────────────────
  const loadNextQuestion = useCallback(async () => {
    setPhase('loading');
    setAudioBlob(null);
    setAudioUrl(null);
    setResponse(null);
    setRecordingTime(0);
    setError('');

    try {
      const res = await getNextQuestion(sessionId);
      if (res.data.done) {
        setPhase('done');
        setSessionComplete(true);
      } else {
        setCurrentQuestion(res.data);
        setProgress(res.data.progress || { completed: 0, total: 0 });
        setPhase('idle');
      }
    } catch (err) {
      setError('Failed to load question. Please refresh the page.');
      setPhase('idle');
    }
  }, [sessionId]);

  useEffect(() => {
    loadNextQuestion();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
    };
  }, [loadNextQuestion]);

  // ── Recording controls ──────────────────────────────────────────────────────
  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        setPhase('recorded');
      };

      recorder.start(100);
      setPhase('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch (err) {
      setError('Microphone access denied. Please allow microphone access in your browser and try again.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const reRecord = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setError('');
    setPhase('idle');
  };

  // ── Submit answer ───────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!audioBlob || !currentQuestion) return;
    setPhase('processing');
    setError('');

    try {
      const res = await submitAudioAnswer({
        sessionId,
        question:     currentQuestion.question,
        questionType: currentQuestion.questionType,
        audioBlob,
      });

      setResponse({
        ...res.data.response,
        questionType: currentQuestion.questionType,
      });

      setPhase('feedback');

      const updatedCompleted = res.data.session.completedQuestions;
      setProgress(p => ({ ...p, completed: updatedCompleted }));

      if (res.data.session.status === 'completed') {
        setSessionComplete(true);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Evaluation failed. Please try again.';
      setError(msg);
      setPhase('recorded');
    }
  };

  // ── Navigate to next ────────────────────────────────────────────────────────
  const handleNext = () => {
    if (sessionComplete) {
      navigate(`/mock-interview/session/${sessionId}/results`);
    } else {
      loadNextQuestion();
    }
  };

  // ── Render helpers ──────────────────────────────────────────────────────────
  if (phase === 'loading' && !currentQuestion) {
    return (
      <div className="mi-fullscreen-state">
        <div className="mi-fullscreen-state__spinner" />
        <p className="mi-fullscreen-state__sub">Loading your question…</p>
      </div>
    );
  }

  if (phase === 'done' && !response) {
    return (
      <div className="mi-fullscreen-state">
        <div className="mi-fullscreen-state__icon">🎉</div>
        <h2 className="mi-fullscreen-state__title">All done!</h2>
        <p className="mi-fullscreen-state__sub">Redirecting you to your results…</p>
        <button className="mi-btn mi-btn--submit" onClick={() => navigate(`/mock-interview/session/${sessionId}/results`)}>
          View Results
        </button>
      </div>
    );
  }

  const progressPct = progress.total > 0
    ? ((progress.completed / progress.total) * 100).toFixed(1)
    : 0;

  const isLastQuestion = progress.completed + 1 >= progress.total;

  return (
    <div className="mi-page">

      {/* ── Header ── */}
      <header className="mi-header">
        <button className="mi-header__back" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <span className="mi-header__title">Mock Interview</span>
        <div className="mi-header__progress-wrap">
          <div className="mi-header__progress-track">
            <div className="mi-header__progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="mi-header__count">
            {progress.completed} / {progress.total}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mi-body">

        {/* ── Left: Question + Recording ── */}
        <div className="mi-question-panel">

          {/* Question header */}
          <div>
            <div
              className={`mi-type-badge mi-type-badge--${currentQuestion?.questionType}`}
            >
              {currentQuestion?.questionType === 'technical' ? '⚙ Technical' : '💬 Behavioral'}
            </div>
          </div>

          <p className="mi-question-text">{currentQuestion?.question}</p>

          {/* Error */}
          {error && (
            <div className="mi-error">⚠️ {error}</div>
          )}

          {/* Recording area */}
          <div className="mi-recording">

            <span className={`mi-recording__status ${
              phase === 'recording' ? 'mi-recording__status--recording'
              : phase === 'recorded' ? 'mi-recording__status--done'
              : ''
            }`}>
              {phase === 'recording' ? '● RECORDING'
               : phase === 'recorded' ? '✓ RECORDED'
               : phase === 'processing' ? '⏳ EVALUATING…'
               : 'READY TO RECORD'}
            </span>

            {/* Waveform */}
            <WaveForm active={phase === 'recording'} />

            {/* Timer */}
            {(phase === 'recording' || phase === 'recorded') && (
              <span className="mi-recording__timer">{formatTime(recordingTime)}</span>
            )}

            {/* Audio preview after recording */}
            {phase === 'recorded' && audioUrl && (
              <audio className="mi-recording__audio-player" src={audioUrl} controls />
            )}

            {/* Processing */}
            {phase === 'processing' && (
              <div className="mi-processing">
                <div className="mi-processing__spinner" />
                <span className="mi-processing__text">Gemini is evaluating your answer…</span>
              </div>
            )}

            {/* Hint */}
            {phase === 'idle' && (
              <span className="mi-recording__hint">
                Click "Record" to start your answer.<br />Speak clearly and take your time.
              </span>
            )}

            {/* Controls */}
            {phase !== 'processing' && phase !== 'feedback' && (
              <div className="mi-recording__controls">
                {phase === 'idle' && (
                  <button className="mi-btn mi-btn--record" onClick={startRecording}>
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <circle cx="5" cy="5" r="5" fill="currentColor" />
                    </svg>
                    Record
                  </button>
                )}

                {phase === 'recording' && (
                  <button className="mi-btn mi-btn--stop" onClick={stopRecording}>
                    <svg width="12" height="12" viewBox="0 0 12 12">
                      <rect x="1" y="1" width="10" height="10" rx="2" fill="currentColor" />
                    </svg>
                    Stop Recording
                  </button>
                )}

                {phase === 'recorded' && (
                  <>
                    <button className="mi-btn mi-btn--rerecord" onClick={reRecord}>
                      ↺ Re-record
                    </button>
                    <button className="mi-btn mi-btn--submit" onClick={submitAnswer}>
                      Submit Answer
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Feedback ── */}
        {phase === 'feedback' && response ? (
          <FeedbackPanel
            response={response}
            onNext={handleNext}
            isLast={sessionComplete}
          />
        ) : (
          <FeedbackPlaceholder />
        )}
      </div>
    </div>
  );
};

export default MockInterviewSession;
