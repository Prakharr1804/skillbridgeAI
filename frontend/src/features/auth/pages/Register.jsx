import React, { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../hooks/useAuth";
import '../auth.form.scss'

const Register = () => {
    const navigate = useNavigate();
    const { loading, handleRegister } = useAuth()

    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        try {
            await handleRegister({ email, username, password })
            navigate('/')
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.')
        }
    }

    if (loading) {
        return (
            <main className="auth-page auth-page--loading">
                <div className="auth-spinner" />
                <p className="auth-loading-text">Creating your account…</p>
            </main>
        )
    }

    return (
        <main className="auth-page">
            <div className="auth-card">

                {/* ── Brand mark ── */}
                <div className="auth-card__brand">
                    <span className="auth-card__brand-dot" />
                    CARBON TALENT
                </div>

                {/* ── Heading ── */}
                <div className="auth-card__header">
                    <h1 className="auth-card__title">Create account</h1>
                    <p className="auth-card__subtitle">Start building your interview strategy</p>
                </div>

                {/* ── Error banner ── */}
                {error && (
                    <div className="auth-error">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* ── Form ── */}
                <form className="auth-form" onSubmit={handleSubmit}>

                    <div className="auth-field">
                        <label className="auth-field__label" htmlFor="username">USERNAME</label>
                        <input
                            className="auth-field__input"
                            id="username"
                            name="username"
                            type="text"
                            placeholder="johndoe"
                            autoComplete="username"
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-field__label" htmlFor="email">EMAIL</label>
                        <input
                            className="auth-field__input"
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            autoComplete="email"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="auth-field">
                        <label className="auth-field__label" htmlFor="password">PASSWORD</label>
                        <input
                            className="auth-field__input"
                            id="password"
                            name="password"
                            type="password"
                            placeholder="••••••••"
                            autoComplete="new-password"
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button className="auth-btn" type="submit" disabled={loading}>
                        {loading ? 'CREATING ACCOUNT…' : 'CREATE ACCOUNT'}
                        {!loading && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="5" y1="12" x2="19" y2="12" />
                                <polyline points="12 5 19 12 12 19" />
                            </svg>
                        )}
                    </button>
                </form>

                {/* ── Footer link ── */}
                <p className="auth-card__footer">
                    Already have an account?{' '}
                    <Link className="auth-card__link" to="/login">Sign in</Link>
                </p>

            </div>
        </main>
    )
}

export default Register;
