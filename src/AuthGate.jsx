
import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [entering, setEntering] = useState(false);
  const [entryFinished, setEntryFinished] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const previousSession = useRef(null);

  // Theo dõi trạng thái đăng nhập Supabase
  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setError("Không thể kiểm tra phiên đăng nhập. Vui lòng tải lại trang.");
      }

      const currentSession = data?.session ?? null;

      previousSession.current = currentSession;
      setSession(currentSession);
      setLoading(false);
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      // Khi đăng xuất thành công
      if (event === "SIGNED_OUT" && previousSession.current) {
        setEntering(false);
        setEntryFinished(false);
        setLeaving(true);
      }

      // Khi đăng nhập thành công
      if (event === "SIGNED_IN" && newSession) {
        setLeaving(false);
        setEntryFinished(false);
        setEntering(true);
      }

      previousSession.current = newSession;
      setSession(newSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);


  // Tự động đăng xuất sau 15 phút không hoạt động
  useEffect(() => {
    if (!session?.user?.id) return;

    const INACTIVITY_LIMIT = 15 * 60 * 1000;
    const ACTIVITY_KEY = `blue-finance-last-activity-${session.user.id}`;

    let lastActivity =
      Number(localStorage.getItem(ACTIVITY_KEY)) || Date.now();

    let lastSaved = lastActivity;
    let signingOut = false;

    if (!localStorage.getItem(ACTIVITY_KEY)) {
      localStorage.setItem(ACTIVITY_KEY, String(lastActivity));
    }

    const logoutThisDevice = async () => {
      if (signingOut) return;

      signingOut = true;

      try {
        await supabase.auth.signOut({ scope: "local" });
        localStorage.removeItem(ACTIVITY_KEY);
      } catch (error) {
        signingOut = false;
        console.error("Lỗi tự động đăng xuất:", error);
      }
    };

    const recordActivity = () => {
      if (signingOut) return;

      const now = Date.now();

      if (now - lastActivity >= INACTIVITY_LIMIT) {
        logoutThisDevice();
        return;
      }

      lastActivity = now;

      if (now - lastSaved >= 1000) {
        localStorage.setItem(ACTIVITY_KEY, String(now));
        lastSaved = now;
      }
    };

    const checkInactivity = () => {
      if (signingOut) return;

      const sharedActivity =
        Number(localStorage.getItem(ACTIVITY_KEY)) || 0;

      if (sharedActivity > lastActivity) {
        lastActivity = sharedActivity;
      }

      if (Date.now() - lastActivity >= INACTIVITY_LIMIT) {
        logoutThisDevice();
      }
    };

    const handleStorage = (event) => {
      if (event.key === ACTIVITY_KEY && event.newValue) {
        const newActivity = Number(event.newValue);

        if (newActivity > lastActivity) {
          lastActivity = newActivity;
        }
      }
    };

    const events = [
      "pointerdown",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ];

    events.forEach((event) => {
      window.addEventListener(event, recordActivity, {
        passive: true,
      });
    });

    window.addEventListener("storage", handleStorage);
    document.addEventListener("visibilitychange", checkInactivity);

    const timer = setInterval(checkInactivity, 1000);

    checkInactivity();

    return () => {
      clearInterval(timer);

      events.forEach((event) => {
        window.removeEventListener(event, recordActivity);
      });

      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", checkInactivity);

      // Không xóa mốc hoạt động khi tải lại trang
    };
  }, [session?.user?.id]);

  // Thời gian hiệu ứng đăng nhập
  useEffect(() => {
    if (!entering || leaving) return;

    const timer = setTimeout(() => {
      setEntryFinished(true);
    }, 2400);

    return () => clearTimeout(timer);
  }, [entering, leaving]);

  // Thời gian hiệu ứng đăng xuất
  useEffect(() => {
    if (!leaving) return;

    const timer = setTimeout(() => {
      setLeaving(false);
      setEntering(false);
      setEntryFinished(false);

      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);

      setMode("login");
      setError("");
      setMessage("");
    }, 2600);

    return () => clearTimeout(timer);
  }, [leaving]);

  // Đăng nhập
  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setBusy(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) throw loginError;
      
if (!data.session) {
  throw new Error("Đăng nhập chưa hoàn tất. Vui lòng thử lại.");
}

localStorage.setItem(
  `blue-finance-last-activity-${data.session.user.id}`,
  String(Date.now())
);

      setLeaving(false);
      setEntryFinished(false);
      setEntering(true);
    } catch (err) {
      setError(getAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  // Đăng ký
  async function handleRegister(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu cần có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setBusy(true);

    try {
      const { data, error: registerError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (registerError) throw registerError;

      if (data.session) {
        localStorage.setItem(
          `blue-finance-last-activity-${data.session.user.id}`,
          String(Date.now())
        );
        setLeaving(false);
        setEntryFinished(false);
        setEntering(true);
      } else {
        setMessage(
          "Tài khoản đã được tạo. Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.",
        );

        setMode("login");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(getAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  // Quên mật khẩu
  async function handleForgotPassword() {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Vui lòng nhập email trước khi đặt lại mật khẩu.");
      return;
    }

    setBusy(true);

    try {
      const { error: resetError } =
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        });

      if (resetError) throw resetError;

      setMessage("Đã gửi hướng dẫn đặt lại mật khẩu đến email của bạn.");
    } catch (err) {
      setError(getAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  // Đang kiểm tra phiên đăng nhập
  if (loading) {
    return (
      <>
        <style>{globalStyles}</style>
        <div className="finance-loading">
          <div className="finance-loading-spinner" />
          <span>Đang kết nối FINANCE...</span>
        </div>
      </>
    );
  }

  // Đã đăng nhập và hiệu ứng đi vào hoàn tất
// Chỉ vào giao diện chính sau khi hiệu ứng đăng nhập kết thúc
    if (session && (!entering || entryFinished)) {
      return children;
    }

  return (
    <>
      <style>{globalStyles}</style>

      <main className="finance-auth-page">
        <section className="finance-auth-container">
          {/* LOGO */}
          <div className="finance-brand">
            <div className="finance-brand-icon">
              <svg viewBox="0 0 48 48" fill="none">
                <rect
                  x="5"
                  y="11"
                  width="38"
                  height="29"
                  rx="8"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
                <path
                  d="M5 18H36C39.9 18 43 21.1 43 25V29H33C29.7 29 27 26.3 27 23C27 19.7 29.7 17 33 17H43"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="34" cy="23" r="2" fill="currentColor" />
                <path
                  d="M11 11V8.5C11 6.6 12.6 5 14.5 5H34"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <span className="finance-brand-name">FINANCE</span>
          </div>

          {/* TIÊU ĐỀ */}
          <div className="finance-heading">
            <h1>
              {mode === "login" ? "Chào mừng trở lại!" : "Tạo tài khoản"}
            </h1>

            <p>
              {mode === "login"
                ? "Đăng nhập để tiếp tục quản lý tài chính của bạn."
                : "Bắt đầu quản lý tài chính cá nhân của bạn."}
            </p>
          </div>

          {/* TAB ĐĂNG NHẬP / ĐĂNG KÝ */}
          <div className="finance-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
                setMessage("");
              }}
            >
              Đăng nhập
            </button>

            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
                setMessage("");
              }}
            >
              Đăng ký
            </button>
          </div>

          {/* FORM */}
          <form
            className="finance-form"
            onSubmit={mode === "login" ? handleLogin : handleRegister}
          >
            {/* EMAIL */}
            <div className="finance-field">
              <label htmlFor="finance-email">Địa chỉ email</label>

              <div className="finance-input-wrap">
                <span className="finance-input-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M4 7L12 13L20 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>

                <input
                  id="finance-email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* MẬT KHẨU */}
            <div className="finance-field">
              <label htmlFor="finance-password">Mật khẩu</label>

              <div className="finance-input-wrap">
                <span className="finance-input-icon">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="4"
                      y="10"
                      width="16"
                      height="11"
                      rx="3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="15.5" r="1.3" fill="currentColor" />
                  </svg>
                </span>

                <input
                  id="finance-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                />

                <button
                  type="button"
                  className="finance-eye-button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 12C3 12 6.5 5 12 5C17.5 5 21 12 21 12C21 12 17.5 19 12 19C6.5 19 3 12 3 12Z"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* XÁC NHẬN MẬT KHẨU */}
            {mode === "register" && (
              <div className="finance-field">
                <label htmlFor="finance-confirm-password">
                  Xác nhận mật khẩu
                </label>

                <div className="finance-input-wrap">
                  <span className="finance-input-icon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <rect
                        x="4"
                        y="10"
                        width="16"
                        height="11"
                        rx="3"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      />
                      <path
                        d="M8 10V7C8 4.8 9.8 3 12 3C14.2 3 16 4.8 16 7V10"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>

                  <input
                    id="finance-confirm-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập lại mật khẩu"
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            )}

            {/* QUÊN MẬT KHẨU */}
            {mode === "login" && (
              <div className="finance-forgot-row">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={busy}
                >
                  Quên mật khẩu?
                </button>
              </div>
            )}

            {/* THÔNG BÁO */}
            {error && (
              <div className="finance-alert finance-alert-error">
                <span>!</span>
                {error}
              </div>
            )}

            {message && (
              <div className="finance-alert finance-alert-success">
                <span>✓</span>
                {message}
              </div>
            )}

            {/* NÚT ĐĂNG NHẬP */}
            <button
              className="finance-submit"
              type="submit"
              disabled={busy || entering || leaving}
            >
              {busy
                ? "Đang xử lý..."
                : mode === "login"
                  ? "Đăng nhập"
                  : "Tạo tài khoản"}

              {!busy && <span className="finance-submit-arrow">→</span>}
            </button>
          </form>

          {/* BẢO MẬT */}
          <div className="finance-divider">
            <span />
            <p>BẢO MẬT TÀI KHOẢN</p>
            <span />
          </div>

          <div className="finance-security">
            <div className="finance-security-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3L20 6V11.5C20 16.2 16.8 20 12 21C7.2 20 4 16.2 4 11.5V6L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 12L11 14L15.5 9.5"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div>
              <strong>Kết nối an toàn</strong>
              <p>Thông tin tài khoản được bảo vệ bởi Supabase Auth.</p>
            </div>
          </div>

          <div className="finance-footer">
            FINANCE <span>•</span> PERSONAL FINANCE MANAGEMENT
          </div>

          {/* HIỆU ỨNG ĐĂNG NHẬP / ĐĂNG XUẤT */}
          {(entering || leaving) && (
            <div
              className={`finance-entry-animation ${
                leaving ? "finance-logout-animation" : ""
              }`}
            >
              <div className="finance-entry-message">
                <strong>
                  {leaving
                    ? "Đăng xuất thành công!"
                    : "Đăng nhập thành công!"}
                </strong>

                <span>
                  {leaving
                    ? "Đang đóng phiên làm việc của bạn..."
                    : "Đang mở không gian tài chính của bạn..."}
                </span>
              </div>

              <div className="finance-entry-scene">
                <div className="finance-floor" />

                <div className="finance-door">
                  <div className="finance-door-panel" />
                  <div className="finance-door-handle" />
                </div>

                <div className="finance-person">
                  <div className="person-head" />
                  <div className="person-body" />
                  <div className="person-arm" />
                  <div className="person-leg person-leg-left" />
                  <div className="person-leg person-leg-right" />
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}

// XỬ LÝ THÔNG BÁO LỖI SUPABASE
function getAuthError(error) {
  const message = error?.message?.toLowerCase() || "";

  if (message.includes("invalid login credentials")) {
    return "Email hoặc mật khẩu không chính xác.";
  }

  if (message.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư của bạn.";
  }

  if (message.includes("user already registered")) {
    return "Email này đã được đăng ký. Vui lòng đăng nhập.";
  }

  if (message.includes("password should be at least")) {
    return "Mật khẩu cần có ít nhất 6 ký tự.";
  }

  if (message.includes("rate limit")) {
    return "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.";
  }

  if (message.includes("network")) {
    return "Không thể kết nối mạng. Vui lòng kiểm tra Internet.";
  }

  return error?.message || "Đã xảy ra lỗi. Vui lòng thử lại.";
}

// CSS TOÀN BỘ GIAO DIỆN
const globalStyles = `
  * {
    box-sizing: border-box;
  }

  html, body, #root {
    width: 100%;
    min-width: 320px;
    height: 100%;
    min-height: 0;
    margin: 0;
  }

  body {
    overflow: hidden !important;
    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  button, input {
    font: inherit;
  }

  .finance-auth-page {
    position: fixed;
    inset: 0;
    z-index: 9999;
    width: 100%;
    height: 100%;
    height: 100dvh;
    min-height: 0;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: #ffffff;
    color: #292929;
  }

  .finance-auth-container {
    position: relative;
    width: min(100%, 490px);
    max-height: calc(100dvh - 28px);
    padding: clamp(20px, 3.5vh, 32px) clamp(22px, 5vw, 42px);
    overflow: hidden;
    background: #ffffff;
    border: 1px solid #f0e2d6;
    border-radius: 25px;
    box-shadow:
      0 18px 60px rgba(190, 85, 25, 0.13),
      0 3px 12px rgba(40, 30, 20, 0.045);
    animation: finance-card-in 0.65s ease both;
  }

  @keyframes finance-card-in {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .finance-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: clamp(14px, 2.8vh, 25px);
  }

  .finance-brand-icon {
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    color: #D9651D;
    background: #FFF0E3;
    border-radius: 12px;
  }

  .finance-brand-icon svg {
    width: 29px;
    height: 29px;
  }

  .finance-brand-name {
    font-size: 23px;
    font-weight: 850;
    letter-spacing: 3px;
    background: linear-gradient(
      110deg,
      #C65312 0%,
      #E87528 16%,
      #FFC08A 30%,
      #D9651D 43%,
      #FFB36F 58%,
      #C65312 74%,
      #F08A3C 88%,
      #C65312 100%
    );
    background-size: 250% auto;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: finance-text-shimmer 3s linear infinite;
  }

  @keyframes finance-text-shimmer {
    0% { background-position: 100% center; }
    100% { background-position: -150% center; }
  }

  .finance-heading {
    text-align: center;
    margin-bottom: clamp(16px, 2.5vh, 23px);
  }

  .finance-heading h1 {
    margin: 0 0 8px;
    font-size: clamp(22px, 3vh, 27px);
    font-weight: 750;
    letter-spacing: -0.7px;
    color: #262626;
  }

  .finance-heading p {
    margin: 0;
    color: #77716c;
    font-size: 13px;
    line-height: 1.6;
  }

  .finance-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 5px;
    padding: 5px;
    margin-bottom: clamp(17px, 2.7vh, 24px);
    background: #F6F2EE;
    border-radius: 13px;
  }

  .finance-tabs button {
    height: 39px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: #77716c;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
    transition: background 0.25s, color 0.25s, box-shadow 0.25s;
  }

  .finance-tabs button.active {
    color: #C65312;
    background: #ffffff;
    box-shadow: 0 2px 8px rgba(40, 30, 20, 0.08);
  }

  .finance-form {
    display: flex;
    flex-direction: column;
    gap: clamp(13px, 2vh, 18px);
  }

  .finance-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .finance-field label {
    color: #45413e;
    font-size: 12px;
    font-weight: 650;
  }

  .finance-input-wrap {
    height: 49px;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 0 14px;
    border: 1px solid #e7ded6;
    border-radius: 12px;
    background: #ffffff;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .finance-input-wrap:focus-within {
    border-color: #D9651D;
    box-shadow: 0 0 0 3px rgba(217, 101, 29, 0.12);
  }

  .finance-input-icon {
    width: 19px;
    height: 19px;
    flex-shrink: 0;
    color: #A56C48;
  }

  .finance-input-icon svg {
    width: 100%;
    height: 100%;
  }

  .finance-input-wrap input {
    width: 100%;
    min-width: 0;
    height: 100%;
    padding: 0;
    outline: none;
    border: 0;
    background: transparent;
    color: #33302e;
    font-size: 13px;
  }

  .finance-input-wrap input::placeholder {
    color: #aaa19a;
  }

  .finance-eye-button {
    width: 27px;
    height: 27px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    padding: 0;
    border: 0;
    background: transparent;
    color: #927d6d;
    cursor: pointer;
  }

  .finance-eye-button svg {
    width: 18px;
    height: 18px;
  }

  .finance-forgot-row {
    display: flex;
    justify-content: flex-end;
    margin-top: -7px;
  }

  .finance-forgot-row button {
    padding: 0;
    border: 0;
    background: transparent;
    color: #C65312;
    font-size: 12px;
    font-weight: 650;
    cursor: pointer;
  }

  .finance-forgot-row button:hover {
    color: #A8400C;
    text-decoration: underline;
  }

  .finance-submit {
    position: relative;
    width: 100%;
    height: 49px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
    border: 0;
    border-radius: 12px;
    background: linear-gradient(110deg, #C65312, #E87528 55%, #D9651D);
    color: #ffffff;
    font-size: 14px;
    font-weight: 750;
    cursor: pointer;
    box-shadow: 0 7px 18px rgba(190, 79, 14, 0.25);
    transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
  }

  .finance-submit:hover:not(:disabled) {
    background: linear-gradient(110deg, #A8400C, #D9651D 55%, #C65312);
    transform: translateY(-2px);
    box-shadow: 0 9px 22px rgba(190, 79, 14, 0.32);
  }

  .finance-submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .finance-submit-arrow {
    position: absolute;
    right: 17px;
    font-size: 20px;
    font-weight: 400;
  }

  .finance-alert {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 9px;
    font-size: 12px;
    line-height: 1.5;
  }

  .finance-alert span {
    font-weight: 800;
  }

  .finance-alert-error {
    color: #b84035;
    background: #fff2f0;
    border: 1px solid #f8d9d5;
  }

  .finance-alert-success {
    color: #27764b;
    background: #effaf3;
    border: 1px solid #d6f0df;
  }

  .finance-divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: clamp(17px, 2.8vh, 25px) 0 14px;
  }

  .finance-divider span {
    flex: 1;
    height: 1px;
    background: #eee5dd;
  }

  .finance-divider p {
    margin: 0;
    color: #9b887a;
    font-size: 9px;
    font-weight: 750;
    letter-spacing: 1.4px;
    white-space: nowrap;
  }

  .finance-security {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 11px;
    padding: 11px 12px;
    border: 1px solid #F0E3D8;
    border-radius: 12px;
    background: #FFFCF9;
  }

  .finance-security-icon {
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: #C65312;
    background: #FFF0E3;
    border-radius: 10px;
  }

  .finance-security-icon svg {
    width: 21px;
    height: 21px;
  }

  .finance-security strong {
    display: block;
    margin-bottom: 3px;
    color: #514a44;
    font-size: 11px;
  }

  .finance-security p {
    margin: 0;
    color: #82766d;
    font-size: 10px;
    line-height: 1.5;
  }

  .finance-footer {
    margin-top: clamp(13px, 2.3vh, 20px);
    text-align: center;
    color: #9D8C7F;
    font-size: 8px;
    font-weight: 650;
    letter-spacing: 1.3px;
  }

  .finance-footer span {
    padding: 0 5px;
    color: #C65312;
  }

  /* LỚP HIỆU ỨNG */
  .finance-entry-animation {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px;
    border-radius: inherit;
    background: rgba(255, 255, 255, 0.97);
    animation: entry-overlay 0.35s ease both;
  }

  @keyframes entry-overlay {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .finance-entry-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    margin-bottom: 35px;
    text-align: center;
  }

  .finance-entry-message strong {
    color: #33302e;
    font-size: 20px;
  }

  .finance-entry-message span {
    color: #82766d;
    font-size: 12px;
  }

  .finance-entry-scene {
    position: relative;
    width: 220px;
    height: 150px;
  }

  .finance-floor {
    position: absolute;
    bottom: 17px;
    left: 0;
    width: 100%;
    height: 2px;
    background: #eee0d5;
  }

  .finance-door {
    position: absolute;
    right: 15px;
    bottom: 18px;
    width: 76px;
    height: 120px;
    border: 5px solid #D9651D;
    border-bottom: 0;
    border-radius: 7px 7px 0 0;
    background: #FFF0E3;
    transform-origin: left center;
    animation: door-open 1s ease 1.15s forwards;
  }

  .finance-door-panel {
    position: absolute;
    inset: 7px;
    border: 1px solid #E9A06F;
    border-radius: 3px 3px 0 0;
  }

  .finance-door-handle {
    position: absolute;
    right: 9px;
    top: 58px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #A8400C;
  }

  @keyframes door-open {
    to {
      transform: perspective(400px) rotateY(-65deg);
    }
  }

  .finance-person {
    position: absolute;
    bottom: 18px;
    left: 35px;
    width: 35px;
    height: 85px;
    animation: person-walk 1.8s ease-in-out 0.15s forwards;
  }

  .person-head {
    position: absolute;
    top: 0;
    left: 10px;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    background: #DFA078;
  }

  .person-body {
    position: absolute;
    top: 19px;
    left: 8px;
    width: 21px;
    height: 34px;
    border-radius: 8px 8px 5px 5px;
    background: #C65312;
  }

  .person-arm {
    position: absolute;
    top: 22px;
    left: 27px;
    width: 7px;
    height: 29px;
    border-radius: 5px;
    background: #DFA078;
    transform: rotate(-18deg);
    transform-origin: top center;
    animation: person-arm-move 0.35s ease-in-out infinite alternate;
  }

  .person-leg {
    position: absolute;
    top: 49px;
    left: 11px;
    width: 8px;
    height: 32px;
    border-radius: 5px;
    background: #55515a;
    transform-origin: top center;
  }

  .person-leg-left {
    animation: person-leg-left 0.35s ease-in-out infinite alternate;
  }

  .person-leg-right {
    left: 20px;
    animation: person-leg-right 0.35s ease-in-out infinite alternate;
  }

  @keyframes person-walk {
    0% { transform: translateX(0); }
    65% { transform: translateX(105px); }
    100% {
      transform: translate(125px, 4px) scale(0.65);
      opacity: 0;
    }
  }

  @keyframes person-leg-left {
    from { transform: rotate(24deg); }
    to { transform: rotate(-24deg); }
  }

  @keyframes person-leg-right {
    from { transform: rotate(-24deg); }
    to { transform: rotate(24deg); }
  }

  @keyframes person-arm-move {
    from { transform: rotate(-22deg); }
    to { transform: rotate(22deg); }
  }

  /* HIỆU ỨNG ĐĂNG XUẤT: CỬA MỞ NGƯỢC VÀ NGƯỜI ĐI RA */
  .finance-logout-animation .finance-door {
    animation: door-open-out 0.8s ease 0.15s forwards;
  }

  @keyframes door-open-out {
    to {
      transform: perspective(400px) rotateY(65deg);
    }
  }

  .finance-logout-animation .finance-person {
    left: 145px;
    animation: person-walk-out 1.8s ease-in-out 0.2s forwards;
  }

  @keyframes person-walk-out {
    0% {
      transform: translateX(0);
      opacity: 1;
    }

    65% {
      transform: translateX(-90px);
      opacity: 1;
    }

    100% {
      transform: translateX(-125px) scale(0.65);
      opacity: 0;
    }
  }

  /* MÀN HÌNH ĐANG TẢI */
  .finance-loading {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    background: #ffffff;
    color: #82766d;
    font-size: 13px;
  }

  .finance-loading-spinner {
    width: 29px;
    height: 29px;
    border: 3px solid #F6E1D2;
    border-top-color: #C65312;
    border-radius: 50%;
    animation: finance-spin 0.8s linear infinite;
  }

  @keyframes finance-spin {
    to { transform: rotate(360deg); }
  }

  /* MÀN HÌNH THẤP */
  @media (max-height: 760px) {
    .finance-auth-container {
      padding-top: 17px;
      padding-bottom: 16px;
    }

    .finance-brand {
      margin-bottom: 12px;
    }

    .finance-brand-icon {
      width: 33px;
      height: 33px;
    }

    .finance-brand-name {
      font-size: 20px;
    }

    .finance-heading {
      margin-bottom: 13px;
    }

    .finance-heading h1 {
      font-size: 22px;
    }

    .finance-tabs {
      margin-bottom: 14px;
    }

    .finance-form {
      gap: 11px;
    }

    .finance-input-wrap {
      height: 44px;
    }

    .finance-submit {
      height: 45px;
    }

    .finance-divider {
      margin-top: 14px;
      margin-bottom: 10px;
    }

    .finance-security {
      padding: 8px 10px;
    }

    .finance-footer {
      margin-top: 11px;
    }
  }

  @media (max-height: 620px) {
    .finance-auth-page {
      padding: 7px;
    }

    .finance-auth-container {
      max-height: calc(100dvh - 14px);
      padding: 10px 25px;
    }

    .finance-brand {
      margin-bottom: 7px;
    }

    .finance-brand-icon {
      width: 28px;
      height: 28px;
    }

    .finance-brand-icon svg {
      width: 23px;
      height: 23px;
    }

    .finance-brand-name {
      font-size: 18px;
    }

    .finance-heading {
      margin-bottom: 9px;
    }

    .finance-heading h1 {
      font-size: 19px;
      margin-bottom: 4px;
    }

    .finance-heading p {
      font-size: 11px;
    }

    .finance-tabs {
      margin-bottom: 9px;
      padding: 3px;
    }

    .finance-tabs button {
      height: 32px;
    }

    .finance-form {
      gap: 8px;
    }

    .finance-field {
      gap: 5px;
    }

    .finance-field label {
      font-size: 11px;
    }

    .finance-input-wrap {
      height: 38px;
    }

    .finance-submit {
      height: 39px;
    }

    .finance-divider {
      margin: 9px 0 7px;
    }

    .finance-security {
      padding: 6px 9px;
    }

    .finance-security-icon {
      width: 27px;
      height: 27px;
    }

    .finance-footer {
      margin-top: 7px;
      font-size: 7px;
    }
  }

  @media (max-width: 480px) {
    .finance-auth-page {
      padding: 10px;
    }

    .finance-auth-container {
      padding-left: 22px;
      padding-right: 22px;
      border-radius: 20px;
    }

    .finance-heading h1 {
      font-size: 23px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
