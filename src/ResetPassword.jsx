import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Lock, CheckCircle, AlertCircle } from "lucide-react";

const T = {
  bg: "#0b0b0e",
  card: "#1a1a24",
  border: "#2a2a3a",
  text: "#ece8e0",
  muted: "#706b63",
  accent: "#4db8ff",
  success: "#43d18a",
  danger: "#f07070",
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

            // Remove os tokens da URL para o App não voltar para esta tela em loop.
            window.history.replaceState({}, document.title, "/reset-password");
          }
        } else if (search.includes("code=")) {
          // Compatível com links PKCE do Supabase.
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

    // Mantém a sessão ativa. O App vai detectar o usuário logado e, se ainda não houver
    // barbearia vinculada, direciona para o onboarding automaticamente.
    setTimeout(() => {
      localStorage.removeItem("ozbarber_auth");
      window.location.replace("/");
    }, 1500);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: "2rem",
        }}
      >
        <h1 style={{ color: T.text, marginBottom: 8, fontSize: 28 }}>
          Criar acesso
        </h1>

        <p style={{ color: T.muted, marginBottom: "2rem", lineHeight: 1.5 }}>
          Defina sua senha para continuar o cadastro da sua barbearia.
        </p>

        {error && (
          <div
            style={{
              background: "#f0707015",
              border: "1px solid #f0707040",
              color: T.danger,
              padding: "0.8rem",
              borderRadius: 10,
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: "#43d18a15",
              border: "1px solid #43d18a40",
              color: T.success,
              padding: "0.8rem",
              borderRadius: 10,
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <CheckCircle size={18} />
            Senha criada com sucesso. Redirecionando para o cadastro da barbearia…
          </div>
        )}

        <div style={{ marginBottom: "1rem" }}>
          <div style={{ color: T.text, fontSize: 13, marginBottom: 8 }}>
            Nova senha
          </div>

          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                top: 14,
                left: 12,
                color: T.muted,
              }}
            />

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua nova senha"
              disabled={booting || success}
              style={{
                width: "100%",
                height: 48,
                paddingLeft: 40,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: "#0f0f15",
                color: T.text,
                outline: "none",
                opacity: booting || success ? 0.65 : 1,
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ color: T.text, fontSize: 13, marginBottom: 8 }}>
            Confirmar senha
          </div>

          <div style={{ position: "relative" }}>
            <Lock
              size={18}
              style={{
                position: "absolute",
                top: 14,
                left: 12,
                color: T.muted,
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
                width: "100%",
                height: 48,
                paddingLeft: 40,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: "#0f0f15",
                color: T.text,
                outline: "none",
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
            height: 48,
            border: "none",
            borderRadius: 10,
            background: T.accent,
            color: "#000",
            fontWeight: 700,
            cursor: loading || booting || success ? "wait" : "pointer",
            opacity: loading || booting || success ? 0.7 : 1,
          }}
        >
          {booting ? "Validando link..." : loading ? "Salvando..." : success ? "Redirecionando..." : "Criar senha e continuar"}
        </button>
      </div>
    </div>
  );
}
