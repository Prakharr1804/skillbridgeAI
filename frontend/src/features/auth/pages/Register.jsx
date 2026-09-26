import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { sendOtp } from "../services/auth.api";
import "../auth.form.scss";

const Register = () => {
  const { handleRegister } = useAuth();
  const navigate = useNavigate();

  // Steps: 'form' (Step 1) | 'otp' (Step 2)
  const [step, setStep] = useState("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);
  const isSubmittingRef = useRef(false);

  // ── Resend Countdown Timer ───────────────────────────────────────────
  useEffect(() => {
    let interval = null;
    if (step === "otp" && timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0) {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  // ── Step 1: Send Registration OTP ────────────────────────────────────
  const handleSendRegisterOtp = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Reusing existing sendOtp with isRegistration: true
      await sendOtp({ email, isRegistration: true });
      setStep("otp");
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Handle 6-Digit OTP Inputs ────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    setError("");
    const cleaned = value.replace(/\D/g, "");
    if (!cleaned && value !== "") return;

    const newOtp = [...otp];
    newOtp[index] = cleaned ? cleaned.slice(-1) : "";
    setOtp(newOtp);

    // Auto-focus next input
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    setError("");
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    setError("");
    e.preventDefault();
    const pasteData = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (pasteData.length > 0) {
      const newOtp = ["", "", "", "", "", ""];
      pasteData.split("").forEach((ch, idx) => {
        if (idx < 6) newOtp[idx] = ch;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pasteData.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  // ── Step 2: Verify OTP, Create Account & Redirect to Sign In ─────────
  const handleVerifyAndRegister = async (e) => {
    e?.preventDefault();
    if (isSubmittingRef.current) return;

    const code = otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    isSubmittingRef.current = true;
    setError("");
    setLoading(true);

    try {
      await handleRegister({
        username,
        email,
        password,
        otp: code,
      });

      // Redirect user to Sign In page with pre-filled email and success toast
      navigate("/login", {
        state: {
          registeredEmail: email,
          successMessage:
            "Account created successfully! Please sign in with your email.",
        },
      });
    } catch (err) {
      const backendMessage = err.response?.data?.message;
      setError(
        backendMessage ||
          err.message ||
          "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        {/* ── Brand ── */}
        <div className="auth-card__brand">
          <span className="auth-card__brand-dot" />
          SKILLBRIDGE AI
        </div>

        {/* ── Header ── */}
        <div className="auth-card__header">
          <h1 className="auth-card__title">
            {step === "form" ? "Create Account" : "Verify Email"}
          </h1>
          <p className="auth-card__subtitle">
            {step === "form"
              ? "Start building your AI-driven interview strategy"
              : `We sent a 6-digit verification code to ${email}`}
          </p>
        </div>

        {/* ── Error message ── */}
        {error && (
          <div className="auth-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {step === "form" ? (
          <form onSubmit={handleSendRegisterOtp} className="auth-form">
            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-username">Username</label>
              <input
                id="reg-username"
                type="text"
                className="auth-field__input"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-email">Email Address</label>
              <input
                id="reg-email"
                type="email"
                className="auth-field__input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field">
              <label className="auth-field__label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                className="auth-field__input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="auth-spinner auth-spinner--small" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyAndRegister} className="auth-form">
            <div className="auth-otp-container">
              <div className="auth-otp-boxes">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`auth-otp-box ${digit ? "auth-otp-box--filled" : ""}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <div className="auth-otp-toolbar">
                {canResend ? (
                  <button
                    type="button"
                    className="auth-text-btn"
                    onClick={handleSendRegisterOtp}
                  >
                    Resend Code
                  </button>
                ) : (
                  <span>Resend in {timer}s</span>
                )}
                <span className="auth-otp-toolbar__dot">•</span>
                <button
                  type="button"
                  className="auth-text-btn auth-text-btn--muted"
                  onClick={() => {
                    setStep("form");
                    setOtp(["", "", "", "", "", ""]);
                    setError("");
                  }}
                >
                  Edit Details
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading || otp.join("").length !== 6}
            >
              {loading ? (
                <>
                  <div className="auth-spinner auth-spinner--small" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Verify & Create Account</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </>
              )}
            </button>
          </form>
        )}

        {/* ── Footer ── */}
        <p className="auth-card__footer">
          Already have an account?{" "}
          <Link className="auth-card__link" to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
};

export default Register;