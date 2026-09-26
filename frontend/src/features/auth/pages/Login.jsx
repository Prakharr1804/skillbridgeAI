import React, { useState, useEffect, useRef } from 'react'
import { useNavigate ,Link } from 'react-router'
import { useLocation } from "react-router";
import { useAuth } from '../hooks/useAuth'
import { sendOtp, verifyOtp } from "../services/auth.api";
import "../auth.form.scss";

const Login = () => {
  const location = useLocation();
  const initialEmail = location.state?.registeredEmail || "";
  const successMsg = location.state?.successMessage || "";
  const { setUser } = useAuth();
  const navigate = useNavigate();

  // Steps: 'email' (Step 1) | 'otp' (Step 2)
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

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

  // ── Step 1: Send OTP ────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendOtp({ email });
      setStep("otp");
      setTimer(60);
      setCanResend(false);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to send verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const isSubmittingRef = useRef(false);

  // ── Handle 6-Digit OTP Inputs ────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    setError("");
    const cleaned = value.replace(/\D/g, ""); // Keep only digits
    if (!cleaned && value !== "") return;

    const newOtp = [...otp];
    newOtp[index] = cleaned ? cleaned.slice(-1) : "";
    setOtp(newOtp);

    // Auto-focus next input if a digit was entered
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    setError("");
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e) => {
    setError("");
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
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

  const executeVerify = async (codeToVerify) => {
    if (isSubmittingRef.current) return;

    const code = codeToVerify || otp.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    isSubmittingRef.current = true;
    setError("");
    setLoading(true);

    try {
      const data = await verifyOtp({ email, otp: code });
      setUser(data.user);
      navigate("/");
    } catch (err) {
      console.error("OTP verification error:", err);
      const backendMessage = err.response?.data?.message;
      setError(backendMessage || err.message || "Invalid or expired code. Please try again.");
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    await executeVerify();
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-card__brand">
          <span className="auth-card__brand-dot" />
          SKILLBRIDGE AI
        </div>

        <div className="auth-card__header">
          <h1 className="auth-card__title">
            {step === "email" ? "Sign In with Email" : "Check your inbox"}
          </h1>
          <p className="auth-card__subtitle">
            {step === "email"
              ? "Enter your email to receive a 6-digit verification code"
              : `We sent a code to ${email}`}
          </p>
        </div>

        {successMsg && !error && (
          <div style={{ background: '#064e3b', color: '#6ee7b7', padding: '12px 16px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', border: '1px solid #059669', textAlign: 'center' }}>
            {successMsg}
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        {step === "email" ? (
          <form onSubmit={handleSendOtp} className="auth-form">
            <div className="auth-field">
              <label className="auth-label">Email address</label>
              <input
                type="email"
                className="auth-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Sending code..." : "Continue with Email"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div
              className="otp-inputs-container"
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "center",
                margin: "16px 0",
              }}
            >
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (inputRefs.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  style={{
                    width: "44px",
                    height: "52px",
                    fontSize: "22px",
                    fontWeight: "600",
                    textAlign: "center",
                    background: "#0f172a",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#ffffff",
                  }}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={loading || otp.join("").length !== 6}
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <div
              style={{
                marginTop: "16px",
                textAlign: "center",
                fontSize: "14px",
                color: "#94a3b8",
              }}
            >
              {canResend ? (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#38bdf8",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  Resend code
                </button>
              ) : (
                <span>Resend code in {timer}s</span>
              )}
              <span style={{ margin: "0 8px" }}>•</span>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setOtp(["", "", "", "", "", ""]);
                  setError("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                Change email
              </button>
            </div>
          </form>
        )}
        <div className="auth-card__footer">
          <p>
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </main>
  );
};

export default Login;