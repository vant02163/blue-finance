import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        if (!data.session) {
          setMessage(
            "Đăng ký thành công. Hãy kiểm tra email để xác nhận tài khoản."
          );
        } else {
          setMessage("Đăng ký thành công.");
        }
      }
    } catch (error) {
      console.error(error);
      setMessage("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  if (loadingSession) {
    return (
      <div style={styles.page}>
        <div style={styles.loading}>Đang kiểm tra đăng nhập...</div>
      </div>
    );
  }

  if (session) {
    return children;
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>◇</div>

        <h1 style={styles.title}>BLUE FINANCE</h1>

        <p style={styles.subtitle}>PERSONAL FINANCE SYSTEM</p>

        <div style={styles.tabs}>
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage("");
            }}
            style={{
              ...styles.tab,
              ...(mode === "login" ? styles.activeTab : {}),
            }}
          >
            Đăng nhập
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("register");
              setMessage("");
            }}
            style={{
              ...styles.tab,
              ...(mode === "register" ? styles.activeTab : {}),
            }}
          >
            Đăng ký
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Email</label>

          <input
            style={styles.input}
            type="email"
            placeholder="Nhập email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label style={styles.label}>Mật khẩu</label>

          <input
            style={styles.input}
            type="password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          <button
            style={styles.submitButton}
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Đang xử lý..."
              : mode === "login"
              ? "ĐĂNG NHẬP"
              : "TẠO TÀI KHOẢN"}
          </button>
        </form>

        {message && <div style={styles.message}>{message}</div>}

        <p style={styles.note}>
          Dữ liệu tài chính được bảo vệ theo tài khoản đăng nhập.
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background:
      "radial-gradient(circle at top, #13233d 0%, #08111f 50%, #050b14 100%)",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },

  card: {
    width: "100%",
    maxWidth: "420px",
    margin: "24px",
    padding: "38px",
    borderRadius: "18px",
    background: "#101827",
    border: "1px solid #243753",
    boxShadow: "0 25px 60px rgba(0,0,0,0.45)",
  },

  logo: {
    fontSize: "42px",
    color: "#60a5fa",
    textAlign: "center",
  },

  title: {
    margin: "8px 0 4px",
    textAlign: "center",
    color: "#60a5fa",
    letterSpacing: "1px",
  },

  subtitle: {
    textAlign: "center",
    color: "#7186a3",
    fontSize: "12px",
    letterSpacing: "2px",
    marginBottom: "30px",
  },

  tabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "24px",
    padding: "5px",
    borderRadius: "10px",
    background: "#08111f",
  },

  tab: {
    padding: "11px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    background: "transparent",
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "600",
  },

  activeTab: {
    background: "#172943",
    color: "#60a5fa",
  },

  label: {
    display: "block",
    marginBottom: "7px",
    marginTop: "15px",
    color: "#cbd5e1",
    fontSize: "14px",
    fontWeight: "600",
  },

  input: {
    boxSizing: "border-box",
    width: "100%",
    padding: "13px 14px",
    borderRadius: "9px",
    border: "1px solid #304662",
    background: "#0b1220",
    color: "#f1f5f9",
    outline: "none",
    fontSize: "15px",
  },

  submitButton: {
    width: "100%",
    marginTop: "25px",
    padding: "14px",
    border: "none",
    borderRadius: "9px",
    background: "#2563eb",
    color: "white",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },

  message: {
    marginTop: "16px",
    padding: "11px",
    borderRadius: "8px",
    background: "#162238",
    color: "#93c5fd",
    fontSize: "13px",
    lineHeight: "1.5",
  },

  note: {
    marginTop: "24px",
    textAlign: "center",
    color: "#64748b",
    fontSize: "12px",
  },

  loading: {
    color: "#cbd5e1",
    fontSize: "16px",
  },
};