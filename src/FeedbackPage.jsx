import { useState, useEffect } from "react";

const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co";
const SUPABASE_ANON = "sb_publishable_cTk8su9HL7LcXoPQE-bqVQ_5Idjyf1a";
const FONT_URL      = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap";

const anonHdr = () => ({
  apikey:         SUPABASE_ANON,
  Authorization:  `Bearer ${SUPABASE_ANON}`,
  "Content-Type": "application/json",
  Prefer:         "return=representation",
});

const LABELS = ["", "Muito ruim 😞", "Ruim 😕", "Regular 😐", "Bom 😊", "Excelente! 🤩"];

export default function FeedbackPage() {
  const params    = new URLSearchParams(window.location.search);
  const token     = params.get("token") || "";
  const preRating = parseInt(params.get("rating") || "0");

  const [fb,         setFb]         = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [rating,     setRating]     = useState(preRating || 0);
  const [hovered,    setHovered]    = useState(0);
  const [comment,    setComment]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done,       setDone]       = useState(false);
  const [err,        setErr]        = useState("");

  // Define background do body sem usar <style> dentro do JSX
  useEffect(() => {
    document.body.style.margin     = "0";
    document.body.style.padding    = "0";
    document.body.style.background = "#0a0a0a";
    // Injeta fonte via link tag no <head>
    if (!document.getElementById("fb-font")) {
      const link = document.createElement("link");
      link.id   = "fb-font";
      link.rel  = "stylesheet";
      link.href = FONT_URL;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    if (!token) { setErr("Link inválido."); setLoading(false); return; }
    fetch(`${SUPABASE_URL}/rest/v1/feedback_requests?token=eq.${encodeURIComponent(token)}&select=*`, {
      headers: anonHdr(),
    })
      .then(r => r.json())
      .then(rows => {
        const row = rows[0];
        if (!row)              setErr("Link inválido ou expirado.");
        else if (row.submitted_at) { setFb(row); setDone(true); }
        else                   setFb(row);
      })
      .catch(() => setErr("Erro ao carregar. Tente novamente."))
      .finally(() => setLoading(false));
  }, [token]);

  const submit = async () => {
    if (!rating) { setErr("Selecione pelo menos uma estrela."); return; }
    setSubmitting(true); setErr("");
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/feedback_requests?token=eq.${encodeURIComponent(token)}`,
        {
          method:  "PATCH",
          headers: anonHdr(),
          body:    JSON.stringify({
            rating,
            comment:      comment.trim() || null,
            submitted_at: new Date().toISOString(),
          }),
        },
      );
      if (!res.ok) throw new Error("Erro ao enviar avaliação.");
      setDone(true);
    } catch (e) { setErr(e.message); }
    setSubmitting(false);
  };

  const accent = fb?.accent_color || "#4db8ff";
  const BG     = "#0a0a0a";
  const CARD   = "#161616";
  const BORDER = "#2a2a2a";

  const pageStyle = {
    minHeight: "100vh", width: "100%", background: BG,
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "40px 20px", boxSizing: "border-box",
    fontFamily: "'DM Sans', Helvetica, Arial, sans-serif",
  };

  const cardStyle = {
    background: CARD, borderRadius: 18, padding: "28px 22px",
    maxWidth: 420, width: "100%", boxSizing: "border-box",
    border: `1px solid ${BORDER}`, textAlign: "center",
  };

  const Header = (
    <div style={{ textAlign: "center", marginBottom: 24, width: "100%", maxWidth: 420 }}>
      {fb?.logo_url && (
        <img src={fb.logo_url} alt={fb.barbershop_name || "Logo"}
          style={{ height: 76, width: 76, objectFit: "contain", display: "block", margin: "0 auto 14px" }}
        />
      )}
      <h1 style={{ color: "#fff", fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 3, margin: "0 0 4px" }}>
        {fb?.barbershop_name || "Avaliação"}
      </h1>
      <p style={{ color: "#666", fontSize: 11, margin: 0, letterSpacing: 1.5 }}>
        AVALIAÇÃO DE ATENDIMENTO
      </p>
    </div>
  );

  const Footer = <p style={{ color: "#333", fontSize: 11, marginTop: 24 }}>Powered by <strong style={{ color: "#555" }}>Oz.Barber</strong></p>;

  // ── Loading ──
  if (loading) return <div style={pageStyle}><p style={{ color: "#555" }}>Carregando…</p></div>;

  // ── Erro sem dados ──
  if (err && !fb) return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <p style={{ color: "#aaa" }}>{err}</p>
      </div>
    </div>
  );

  // ── Confirmação (Obrigado) ──
  if (done) return (
    <div style={pageStyle}>
      {Header}
      <div style={cardStyle}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          border: `3px solid ${accent}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <h2 style={{ color: accent, fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 2, margin: "0 0 10px" }}>
          Obrigado!
        </h2>
        <p style={{ color: "#aaa", fontSize: 15, margin: "0 0 16px", lineHeight: 1.5 }}>
          Sua avaliação foi registrada com sucesso!
        </p>
        {fb?.barber_name && <p style={{ color: "#555", fontSize: 12 }}>Atendimento com {fb.barber_name}</p>}
      </div>
      {Footer}
    </div>
  );

  // ── Formulário de avaliação ──
  const displayRating = hovered || rating;

  return (
    <div style={pageStyle}>
      {Header}
      <div style={cardStyle}>
        {fb?.barber_name && (
          <p style={{ color: "#666", fontSize: 13, margin: "0 0 16px" }}>
            Atendimento com <strong style={{ color: "#fff" }}>{fb.barber_name}</strong>
          </p>
        )}
        <p style={{ color: "#aaa", fontSize: 15, margin: "0 0 18px", lineHeight: 1.5 }}>
          {fb?.client_name ? `Olá, ${fb.client_name}! Como foi` : "Como foi"} seu atendimento?
        </p>

        {/* Estrelas */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 8 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 38, padding: 4, lineHeight: 1,
                transform: displayRating >= n ? "scale(1.15)" : "scale(1)",
                transition: "transform .1s",
              }}
            >
              {displayRating >= n ? "⭐" : <span style={{ color: accent, opacity: 0.35, fontSize: 36 }}>★</span>}
            </button>
          ))}
        </div>

        <p style={{ textAlign: "center", fontSize: 13, fontWeight: 600, margin: "0 0 18px", color: rating ? accent : "transparent", minHeight: 20 }}>
          {rating ? LABELS[rating] : "‎"}
        </p>

        <textarea
          placeholder="Deixe um comentário (opcional)…"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#0f0f0f", border: `1px solid ${BORDER}`,
            borderRadius: 10, padding: "12px 14px",
            color: "#fff", fontSize: 16, fontFamily: "'DM Sans', sans-serif",
            resize: "none", outline: "none", marginBottom: 16,
          }}
        />

        {err && <p style={{ color: "#f87171", fontSize: 12, textAlign: "center", margin: "0 0 12px" }}>{err}</p>}

        <button onClick={submit} disabled={submitting || !rating}
          style={{
            width: "100%", padding: 14, borderRadius: 10, border: "none",
            background: rating ? accent : "#1e1e1e",
            color:      rating ? "#000" : "#444",
            fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 15,
            cursor: rating ? "pointer" : "not-allowed", transition: "all .2s",
          }}
        >
          {submitting ? "Enviando…" : "Enviar Avaliação"}
        </button>
      </div>
      {Footer}
    </div>
  );
}
