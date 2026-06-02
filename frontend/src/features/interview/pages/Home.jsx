import React, {useState, useRef} from 'react';
import { useInterview } from '../hooks/useInterview';
import { useNavigate } from 'react-router';
import '../style/home.scss';

const Home = () => {
    const navigate = useNavigate();
    const {loading, generateReport, reports} = useInterview();

    const [jobDescription, setJobDescription] = useState("");
    const [selfDescription, setSelfDescription] = useState("");
    const [resumeFile, setResumeFile] = useState(null);
    const resumeInputRef = useRef();

    const handleGenerateReport = async () => {
        const resumeFile = resumeInputRef.current.files[0];
        if (!resumeFile) return;
        const data = await generateReport({resumeFile, selfDescription, jobDescription});
        if (data?._id) navigate(`/interview/${data._id}`);
    };

    if (loading) {
        return (
            <main className="home home--loading">
                <div className="home__spinner" />
                <p className="home__loading-text">Loading…</p>
            </main>
        );
    }

    return (
        <main className="home">
            <div className="home__container">

                {/* ── Page Header ── */}
                <header className="home__header">
                    <h1 className="home__title">Create your custom interview plan</h1>
                    <p className="home__subtitle">CARBON TALENT PRECISION ENGINE</p>
                </header>

                {/* ── Two-column form grid ── */}
                <div className="home__grid">

                    {/* Left Column: Job Description */}
                    <section className="home__section home__section--left">
                        <span className="home__section-label">01. JOB DESCRIPTION</span>
                        <div className="home__card home__card--tall">
                            <div className="home__card-icon">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                    <polyline points="14 2 14 8 20 8" />
                                    <line x1="16" y1="13" x2="8" y2="13" />
                                    <line x1="16" y1="17" x2="8" y2="17" />
                                    <polyline points="10 9 9 9 8 9" />
                                </svg>
                            </div>
                            <textarea
                                id="jobDescription"
                                name="jobDescription"
                                className="home__textarea"
                                placeholder="Paste the target job description here. Include key requirements, responsibilities, and company values for the best analysis..."
                                defaultValue={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                            />
                        </div>
                    </section>

                    {/* Right Column: Resume + Self Description + CTA */}
                    <section className="home__section home__section--right">

                        {/* Resume Upload */}
                        <div>
                            <span className="home__section-label">02. RESUME</span>
                            <div
                                className={`home__card home__card--upload ${resumeFile ? 'home__card--upload-active' : ''}`}
                                onDragOver={(e) => e.preventDefault()}
                                onClick={() => resumeInputRef.current.click()}
                            >
                                <input
                                    id="resumeInput"
                                    type="file"
                                    name="resume"
                                    accept=".pdf"
                                    hidden
                                    ref={resumeInputRef}
                                    onChange={(e) => setResumeFile(e.target.files[0])}
                                />
                                <div className="home__upload-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="16 16 12 12 8 16" />
                                        <line x1="12" y1="12" x2="12" y2="21" />
                                        <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                                    </svg>
                                </div>
                                <p className="home__upload-title">
                                    {resumeFile ? resumeFile.name : 'Upload Resume'}
                                </p>
                                <p className="home__upload-hint">PDF only</p>
                            </div>
                        </div>
                        
                        {/* Self Description */}
                        <div>
                            <span className="home__section-label">03. SELF DESCRIPTION</span>
                            <div className="home__card home__card--medium">
                                <div className="home__card-icon home__card-icon--right">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <line x1="12" y1="8" x2="12" y2="12" />
                                        <line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                </div>
                                <textarea
                                    id="selfDescription"
                                    name="selfDescription"
                                    className="home__textarea"
                                    placeholder="Tell us about your background, career goals, or specific projects you want the report to highlight..."
                                    defaultValue={selfDescription}
                                    onChange={(e) => setSelfDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Generate CTA */}
                        <div className="home__cta">
                            <button
                                className="home__btn-generate"
                                onClick={handleGenerateReport}
                                disabled={loading}
                                id="generateInterviewReport"
                            >
                                {loading ? 'GENERATING...' : 'GENERATE INTERVIEW REPORT'}
                                {!loading && (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                    </svg>
                                )}
                            </button>
                            <p className="home__cta-hint">AI-POWERED ANALYSIS • TAKES ~30 SECONDS</p>
                        </div>

                    </section>
                </div>

                {/* ── Recent Reports — full width below the grid ── */}
                {reports.length > 0 && (
                    <section className="recent-reports">
                        <h2 className="recent-reports__title">My Recent Interview Plans</h2>
                        <ul className="reports-list">
                            {reports.map(report => (
                                <li
                                    key={report._id}
                                    className="report-item"
                                    onClick={() => navigate(`/interview/${report._id}`)}
                                >
                                    <div className="report-item__left">
                                        <h3 className="report-item__name">{report.title || 'Untitled Position'}</h3>
                                        <p className="report-meta">Generated on {new Date(report.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                    <div className="report-item__right">
                                        <span className={`match-score ${report.matchScore >= 80 ? 'score--high' : report.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>
                                            {report.matchScore}%
                                        </span>
                                        <svg className="report-item__arrow" width="16" height="16" viewBox="0 0 24 24" fill="none"
                                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

            </div>
        </main>
    );
};

export default Home;