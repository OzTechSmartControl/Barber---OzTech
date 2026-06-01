import { useState, useEffect } from "react";

const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co";
const SUPABASE_ANON = "sb_publishable_cTk8su9HL7LcXoPQE-bqVQ_5Idjyf1a";

const anonHdr = () => ({
  apikey:        SUPABASE_ANON,
  Authorization: `Bearer ${SUPABASE_ANON}`,
  "Content-Type": "application/json",
  Prefer:        "return=representation",
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

  useEffect(() => {
    if (!token) { setErr("Link inválido."); setLoading(false); return; }
    fetch(`${SUPABASE_URL}/rest/v1/feedback_requests?token=eq.${encodeURIComponent(token)}&select=*`, {
      headers: anonHdr(),
    })
      .then(r => r.json())
      .then(rows => {
        const row = rows[0];
        if (!row)            setErr("Link inválido ou expirado.");
        else if (row.submitted_at) setDone(true);
        else                 setFb(row);
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
    } catch (e) {
      setErr(e.message);
    }
    setSubmitting(false);
  };

  const accent = "#4db8ff";

  const centeredWrap = {
    minHeight: "100vh", background: "#0f0f0f",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 20, fontFamily: "'DM Sans',sans-serif",
  };
  const card = {
    background: "#1a1a1a", borderRadius: 16, padding: "36px 28px",
    maxWidth: 440, width: "100%", border: "1px solid #2a2a2a",
  };

  if (loading) return (
    <div style={centeredWrap}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
      <p style={{ color: "#aaa" }}>Carregando…</p>
    </div>
  );

  if (done) return (
    <div style={centeredWrap}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
      <div style={{ ...card, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>⭐</div>
        <h2 style={{ color:"#fff", fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, margin:"0 0 10px" }}>
          Obrigado!
        </h2>
        <p style={{ color:"#aaa", fontSize:15, margin:"0 0 20px" }}>
          Sua avaliação foi registrada com sucesso!
        </p>
        {fb?.barbershop_name && (
          <p style={{ color:"#555", fontSize:12 }}>{fb.barbershop_name}</p>
        )}
      </div>
    </div>
  );

  if (err && !fb) return (
    <div style={centeredWrap}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
      <div style={{ ...card, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:16 }}>😕</div>
        <p style={{ color:"#aaa" }}>{err}</p>
      </div>
    </div>
  );

  const displayRating = hovered || rating;

  return (
    <div style={centeredWrap}>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
      <div style={card}>
        {/* Cabeçalho */}
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <h1 style={{ color:"#fff", fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, margin:"0 0 4px" }}>
            {fb?.barbershop_name || "Avaliação"}
          </h1>
          {fb?.barber_name && (
            <p style={{ color:"#aaa", fontSize:13, margin:0 }}>
              Atendimento com <strong style={{ color:"#fff" }}>{fb.barber_name}</strong>
            </p>
          )}
        </div>

        <p style={{ color:"#aaa", fontSize:15, textAlign:"center", margin:"0 0 20px" }}>
          {fb?.client_name ? `Olá, ${fb.client_name}! Como foi` : "Como foi"} seu atendimento?
        </p>

        {/* Estrelas */}
        <div style={{ display:"flex", justifyContent:"center", gap:6, marginBottom:12 }}>
          {[1,2,3,4,5].map(n => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: 40, padding: 4, lineHeight: 1,
                transform: displayRating >= n ? "scale(1.15)" : "scale(1)",
                transition: "transform .1s",
              }}
            >
              {displayRating >= n ? "⭐" : "☆"}
            </button>
          ))}
        </div>

        {/* Label de rating */}
        <p style={{
          textAlign:"center", fontSize:13, fontWeight:600, margin:"0 0 20px",
          color: rating ? accent : "#555", minHeight:20,
        }}>
          {rating ? LABELS[rating] : ""}
        </p>

        {/* Comentário */}
        <textarea
          placeholder="Deixe um comentário (opcional)…"
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          style={{
            width:"100%", boxSizing:"border-box", background:"#0f0f0f",
            border:"1px solid #2a2a2a", borderRadius:10, padding:"12px 14px",
            color:"#fff", fontSize:14, fontFamily:"'DM Sans',sans-serif",
            resize:"none", outline:"none", marginBottom:16,
          }}
        />

        {err && <p style={{ color:"#f87171", fontSize:12, textAlign:"center", margin:"0 0 12px" }}>{err}</p>}

        <button
          onClick={submit}
          disabled={submitting || !rating}
          style={{
            width:"100%", padding:14, borderRadius:10, border:"none",
            background: rating ? accent : "#2a2a2a",
            color:      rating ? "#000" : "#555",
            fontFamily: "'DM Sans',sans-serif", fontWeight:700, fontSize:15,
            cursor: rating ? "pointer" : "not-allowed", transition:"all .2s",
          }}
        >
          {submitting ? "Enviando…" : "Enviar Avaliação"}
        </button>

        <p style={{ textAlign:"center", color:"#333", fontSize:11, marginTop:16 }}>
          Powered by Oz.Barber
        </p>
      </div>
    </div>
  );
}
