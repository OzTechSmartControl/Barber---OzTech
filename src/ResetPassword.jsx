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
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("access_token")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (access_token && refresh_token) {
        supabase.auth.setSession({
          access_token,
          refresh_token,
        });
      }
    }
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
      window.location.href = "/";
    }, 2500);
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
          Redefinir senha
        </h1>

        <p style={{ color: T.muted, marginBottom: "2rem" }}>
          Digite sua nova senha.
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
            Senha alterada com sucesso.
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
              style={{
                width: "100%",
                height: 48,
                paddingLeft: 40,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: "#0f0f15",
                color: T.text,
                outline: "none",
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
              style={{
                width: "100%",
                height: 48,
                paddingLeft: 40,
                borderRadius: 10,
                border: `1px solid ${T.border}`,
                background: "#0f0f15",
                color: T.text,
                outline: "none",
              }}
            />
          </div>
        </div>

        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            width: "100%",
            height: 48,
            border: "none",
            borderRadius: 10,
            background: T.accent,
            color: "#000",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {loading ? "Salvando..." : "Salvar nova senha"}
        </button>
      </div>
    </div>
  );
}