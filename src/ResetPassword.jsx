import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";

const T = {
  bg: "#05070b",
  card: "rgba(26, 26, 36, 0.86)",
  cardSolid: "#1a1a24",
  border: "rgba(77, 184, 255, 0.26)",
  borderSoft: "#2a2a3a",
  text: "#ece8e0",
  muted: "#9a9590",
  mutedDark: "#706b63",
  accent: "#4db8ff",
  success: "#43d18a",
  danger: "#f07070",
};

const fieldWrapStyle = {
  position: "relative",
  width: "100%",
};

const inputStyle = {
  width: "100%",
  height: 52,
  padding: "0 1rem 0 2.85rem",
  borderRadius: 12,
  border: `1px solid ${T.borderSoft}`,
  background: "rgba(10, 12, 18, 0.82)",
  color: T.text,
  outline: "none",
  boxSizing: "border-box",
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  transition: "border-color .2s, box-shadow .2s, background .2s",
};

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        const hash = window.location.hash;
        const search = window.location.search;

        if (hash.includes("access_token")) {
          const params = new URLSearchParams(hash.replace("#", ""));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) throw error;

            window.history.replaceState({}, document.title, "/reset-password");
          }
        } else if (search.includes("code=")) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) throw error;
          window.history.replaceState({}, document.title, "/reset-password");
        }
      } catch (e) {
        console.error(e);
        setError("Não foi possível validar o link. Solicite um novo e-mail de acesso.");
      } finally {
        setBooting(false);
      }
    };

    hydrateSession();
  }, []);

  const handleReset = async () => {
    setError("");

    if (!password || password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData?.session?.access_token) {
      setError("Sessão expirada. Solicite um novo link de acesso.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      localStorage.removeItem("ozbarber_auth");
      window.location.replace("/");
    }, 1500);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background:
          `radial-gradient(circle at 50% 0%, rgba(77,184,255,.11), transparent 34%), linear-gradient(180deg, ${T.bg} 0%, #08090d 48%, #050506 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2.25rem 1rem",
        fontFamily: "'DM Sans', sans-serif",
        overflowX: "hidden",
      }}
    >
      <style>{`
        html, body, #root {
          margin: 0 !important;
          padding: 0 !important;
          min-height: 100%;
          width: 100%;
          background: ${T.bg} !important;
          overflow-x: hidden;
        }
        * { box-sizing: border-box; }
        input::placeholder { color: ${T.mutedDark}; }
        input:focus {
          border-color: ${T.accent} !important;
          box-shadow: 0 0 0 3px rgba(77,184,255,.12), 0 0 22px rgba(77,184,255,.10);
          background: rgba(8, 10, 16, .94) !important;
        }
        button:focus-visible, input:focus-visible { outline: none; }
        @media (max-width: 768px) {
          input, select, textarea { font-size: 16px !important; }
        }
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 560,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <img
          src="/ozbarber-logo.png"
          alt="Oz.Barber"
          style={{
            width: "min(260px, 72vw)",
            height: "auto",
            objectFit: "contain",
            marginBottom: "1.45rem",
            filter: "drop-shadow(0 0 22px rgba(77,184,255,.22))",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            width: "100%",
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: "2.25rem",
            boxShadow: "0 24px 80px rgba(0,0,0,.46), inset 0 1px 0 rgba(255,255,255,.035)",
            backdropFilter: "blur(10px)",
          }}
        >
          <h1
            style={{
              color: T.text,
              margin: "0 0 .7rem",
              fontSize: 30,
              lineHeight: 1.1,
              fontWeight: 800,
              letterSpacing: -0.4,
            }}
          >
            Criar acesso
          </h1>

          <p
            style={{
              color: T.muted,
              margin: "0 0 2rem",
              lineHeight: 1.65,
              fontSize: 15,
              maxWidth: 420,
            }}
          >
            Defina sua senha para continuar o cadastro da sua barbearia.
          </p>

          {error && (
            <div
              style={{
                background: "#f0707015",
                border: "1px solid #f0707040",
                color: T.danger,
                padding: "0.85rem 1rem",
                borderRadius: 12,
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                lineHeight: 1.35,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: "#43d18a15",
                border: "1px solid #43d18a40",
                color: T.success,
                padding: "0.85rem 1rem",
                borderRadius: 12,
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                lineHeight: 1.35,
              }}
            >
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
              Senha criada com sucesso. Redirecionando para o cadastro da barbearia…
            </div>
          )}

          <div style={{ marginBottom: "1rem", width: "100%" }}>
            <div style={{ color: T.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Nova senha
            </div>

            <div style={fieldWrapStyle}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 14,
                  transform: "translateY(-50%)",
                  color: T.muted,
                  pointerEvents: "none",
                }}
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                disabled={booting || success}
                style={{
                  ...inputStyle,
                  opacity: booting || success ? 0.65 : 1,
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.45rem", width: "100%" }}>
            <div style={{ color: T.text, fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
              Confirmar senha
            </div>

            <div style={fieldWrapStyle}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: 14,
                  transform: "translateY(-50%)",
                  color: T.muted,
                  pointerEvents: "none",
                }}
              />

              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Confirme sua nova senha"
                disabled={booting || success}
                onKeyDown={(e) => e.key === "Enter" && !booting && !success && handleReset()}
                style={{
                  ...inputStyle,
                  opacity: booting || success ? 0.65 : 1,
                }}
              />
            </div>
          </div>

          <button
            onClick={handleReset}
            disabled={loading || booting || success}
            style={{
              width: "100%",
              height: 54,
              border: "none",
              borderRadius: 12,
              background: `linear-gradient(135deg, ${T.accent}, #7dd3fc)`,
              color: "#061018",
              fontWeight: 900,
              fontSize: 15,
              letterSpacing: 0.1,
              cursor: loading || booting || success ? "wait" : "pointer",
              opacity: loading || booting || success ? 0.72 : 1,
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: "0 12px 32px rgba(77,184,255,.24)",
            }}
          >
            {booting ? "Validando link..." : loading ? "Salvando..." : success ? "Redirecionando..." : "Criar senha e continuar"}
          </button>
        </div>

        <div
          style={{
            marginTop: "1.6rem",
            textAlign: "center",
            color: T.muted,
            fontSize: 14,
            letterSpacing: 0.1,
          }}
        >
          Desenvolvido por <span style={{ color: T.text }}>OzTech SmartControl</span>
        </div>
      </div>
    </div>
  );
}
