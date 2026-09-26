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
            setError(err.response?.data?.message || "Failed to send verification code.");
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

            // Redirect user to Sign In page with success message
            navigate("/login", {
                state: {
                    registeredEmail: email,
                    successMessage: "Account created successfully! Please sign in with your email."
                }
            });
        } catch (err) {
            const backendMessage = err.response?.data?.message;
            setError(backendMessage || err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
            isSubmittingRef.current = false;
        }
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
                        {step === "form" ? "Create Account" : "Verify Email"}
                    </h1>
                    <p className="auth-card__subtitle">
                        {step === "form"
                            ? "Start building your interview strategy"
                            : `We sent a verification code to ${email}`}
                    </p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                {step === "form" ? (
                    <form onSubmit={handleSendRegisterOtp} className="auth-form">
                        <div className="auth-field">
                            <label className="auth-label">Username</label>
                            <input
                                type="text"
                                className="auth-input"
                                placeholder="johndoe"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="auth-field">
                            <label className="auth-label">Email address</label>
                            <input
                                type="email"
                                className="auth-input"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="auth-field">
                            <label className="auth-label">Password</label>
                            <input
                                type="password"
                                className="auth-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <button type="submit" className="auth-button" disabled={loading}>
                            {loading ? "Sending code..." : "Continue"}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyAndRegister} className="auth-form">
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
                            {loading ? "Creating Account..." : "Verify & Create Account"}
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
                                    onClick={handleSendRegisterOtp}
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
                                    setStep("form");
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
                                Edit details
                            </button>
                        </div>
                    </form>
                )}

                <div className="auth-card__footer">
                    <p>
                        Already have an account? <Link to="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </main>
    );
};

export default Register;