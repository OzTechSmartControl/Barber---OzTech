import { useState } from "react";
import { RefreshCw, User, Mail, Lock, Scissors, Phone, ChevronLeft, AlertCircle, Check, ExternalLink } from "lucide-react";

const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxanpvbnR4Zndsd212YmRkYm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTU5NjIsImV4cCI6MjA5Mzc3MTk2Mn0.SiH3q7fQRoVDern1SnroZolD0rc_wttj5G-Me4wffVw";
const EDGE_BASE     = `${SUPABASE_URL}/functions/v1`;

const T = {
  bg:         "#0b0b0e",
  surface:    "#13131a",
  card:       "#1a1a24",
  border:     "#2a2a3a",
  accent:     "#4db8ff",
  text:       "#ece8e0",
  muted:      "#706b63",
  mutedLight: "#9a9590",
  success:    "#43d18a",
  successBg:  "#43d18a18",
  danger:     "#f07070",
  dangerBg:   "#f0707018",
};

const SOURCE_OPTIONS = [
  { value: "Instagram / TikTok",  label: "📱 Instagram / TikTok"  },
  { value: "Indicação de amigo",  label: "👥 Indicação de amigo"  },
  { value: "Google / Pesquisa",   label: "🔍 Google / Pesquisa"   },
  { value: "YouTube",             label: "▶️ YouTube"             },
  { value: "Outro",               label: "✦ Outro"                },
];

const inputSt = {
  width:       "100%",
  height:      44,
  background:  "#0d0e14",
  border:      `1px solid ${T.border}`,
  borderRadius: 10,
  color:       T.text,
  outline:     "none",
  padding:     "0 1rem 0 2.65rem",
  fontSize:    13,
  fontFamily:  "'DM Sans', sans-serif",
  boxSizing:   "border-box",
  boxShadow:   "inset 0 1px 0 rgba(255,255,255,.035)",
  WebkitAppearance: "none",
};

const iconSt = {
  position:  "absolute",
  left:      13,
  top:       "50%",
  transform: "translateY(-50%)",
  color:     T.mutedLight,
  pointerEvents: "none",
};

const FieldIcon = ({ icon: Icon }) => (
  <span style={iconSt}><Icon size={15} /></span>
);

const FieldWrap = ({ label, children }) => (
  <div style={{ marginBottom: ".65rem" }}>
    <div style={{ fontSize: 11, fontWeight: 800, color: T.mutedLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.2 }}>
      {label}
    </div>
    <div style={{ position: "relative" }}>{children}</div>
  </div>
);

export default function TrialSignup({ onComplete, onBack }) {
  const [ownerName,      setOwnerName]      = useState("");
  const [email,          setEmail]          = useState("");
  const [password,       setPassword]       = useState("");
  const [showPass,       setShowPass]       = useState(false);
  const [barbershopName, setBarbershopName] = useState("");
  const [phone,          setPhone]          = useState("");
  const [source,         setSource]         = useState("");
  const [loading,        setLoading]        = useState(false);
  const [err,            setErr]            = useState("");
  const [done,           setDone]           = useState(false);
  const [agreedToTerms,  setAgreedToTerms]  = useState(false);

  const validate = () => {
    if (!ownerName.trim())      return "Informe seu nome completo.";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
                                return "Informe um e-mail válido.";
    if (password.length < 6)    return "A senha deve ter no mínimo 6 caracteres.";
    if (!barbershopName.trim()) return "Informe o nome da sua barbearia.";
    if (!phone.trim())          return "Informe seu WhatsApp para contato.";
    if (!agreedToTerms)         return "Você precisa aceitar os Termos de Uso para continuar.";
    return null;
  };

  const submit = async () => {
    const validationErr = validate();
    if (validationErr) { setErr(validationErr); return; }

    setErr("");
    setLoading(true);

    try {
      const res = await fetch(`${EDGE_BASE}/create-trial-account`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          apikey:         SUPABASE_ANON,
        },
        body: JSON.stringify({
          owner_name:      ownerName.trim(),
          email:           email.trim().toLowerCase(),
          password,
          barbershop_name: barbershopName.trim(),
          phone:           phone.trim(),
          source,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setErr(data.error || "Erro ao criar conta. Tente novamente.");
        setLoading(false);
        return;
      }

      if (data.auto_login && data.access_token && data.profile) {
        // Auto-login: passa sessão completa de volta ao App
        onComplete({
          token:         data.access_token,
          access_token:  data.access_token,
          refresh_token: data.refresh_token,
          user:          data.user,
          profile:       data.profile,
        });
      } else {
        // Caso raro onde sign-in falhou mas conta foi criada
        setDone(true);
      }
    } catch (e) {
      console.error("[TrialSignup] Erro:", e);
      setErr("Erro de conexão. Verifique sua internet e tente novamente.");
    }

    setLoading(false);
  };

  const onKey = (e) => { if (e.key === "Enter" && !loading) submit(); };

  // ── Tela de sucesso (auto_login=false) ──────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: "100vh", width: "100vw", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(circle at 50% 10%, rgba(67,209,138,.08), transparent 28%), #08090c", fontFamily: "'DM Sans', sans-serif", padding: "2rem 1rem" }}>
        <style>{`html,body,#root{margin:0;min-height:100%;width:100%;background:#08090c}*{box-sizing:border-box}`}</style>
        <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.successBg, border: `2px solid ${T.success}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Check size={28} color={T.success} />
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1.5, color: T.text, marginBottom: 8 }}>
            CONTA CRIADA!
          </div>
          <p style={{ color: T.mutedLight, fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>
            Sua barbearia foi configurada. Faça login com o e-mail e senha que você acabou de cadastrar.
          </p>
          <button
            onClick={onBack}
            style={{ width: "100%", minHeight: 44, background: `linear-gradient(135deg, ${T.accent}, #7dd3fc)`, color: "#061018", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 900, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
          >
            Ir para o Login
          </button>
        </div>
      </div>
    );
  }

  // ── Formulário principal ─────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 50% 8%, rgba(77,184,255,.10), transparent 26%), radial-gradient(circle at 80% 80%, rgba(77,184,255,.04), transparent 30%), #08090c",
        fontFamily: "'DM Sans', sans-serif",
        padding: "clamp(.5rem, 2vh, 1rem) 1rem",
        overflowX: "hidden",
      }}
    >
      <style>{`
        html,body,#root{margin:0;min-height:100%;width:100%;background:#08090c}
        *{box-sizing:border-box}
        input::placeholder,select::placeholder{color:${T.muted}}
        select option{background:#13141a;color:${T.text}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: ".5rem" }}>
          <img
            src="/ozbarber-logo.png"
            alt="Oz.Barber"
            style={{ width: "clamp(110px, 36vw, 165px)", maxWidth: "70vw", height: "auto", display: "block", margin: "0 auto", filter: "drop-shadow(0 0 22px rgba(77,184,255,.22))" }}
          />
        </div>

        {/* Card principal */}
        <div
          style={{
            background:    "linear-gradient(180deg, rgba(26,26,36,.96), rgba(14,16,24,.97))",
            border:        `1px solid ${T.accent}55`,
            borderRadius:  16,
            padding:       "1rem 1.35rem",
            boxShadow:     "0 28px 90px rgba(0,0,0,.5), 0 0 42px rgba(77,184,255,.07)",
            backdropFilter:"blur(8px)",
          }}
        >
          {/* Trial badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: ".5rem" }}>
            <div style={{ background: `${T.accent}18`, border: `1px solid ${T.accent}44`, borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 800, color: T.accent, letterSpacing: 0.5 }}>
              7 DIAS GRÁTIS
            </div>
            <div style={{ fontSize: 12, color: T.muted }}>Sem cartão de crédito</div>
          </div>

          <h1 style={{ margin: "0 0 4px", color: T.text, fontSize: 22, fontWeight: 900, letterSpacing: -.3 }}>
            Criar conta de teste
          </h1>
          <p style={{ margin: "0 0 .75rem", color: T.mutedLight, fontSize: 13, lineHeight: 1.45 }}>
            Configure sua barbearia em minutos e explore tudo por 7 dias.
          </p>

          {/* Erro */}
          {err && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 10, padding: "0.75rem 0.95rem", marginBottom: "1rem", color: T.danger, fontSize: 13, fontWeight: 700 }}>
              <AlertCircle size={15} />
              {err}
            </div>
          )}

          {/* Campos */}
          <FieldWrap label="Seu nome completo">
            <FieldIcon icon={User} />
            <input
              style={inputSt}
              type="text"
              placeholder="ex: João Silva"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
              onKeyDown={onKey}
              autoComplete="name"
            />
          </FieldWrap>

          <FieldWrap label="Seu e-mail">
            <FieldIcon icon={Mail} />
            <input
              style={{
                ...inputSt,
                borderColor: err && !email.trim() ? T.danger : T.border,
              }}
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={onKey}
              autoComplete="email"
            />
          </FieldWrap>

          <FieldWrap label="Senha">
            <FieldIcon icon={Lock} />
            <input
              style={{ ...inputSt, paddingRight: "5rem" }}
              type={showPass ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={onKey}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPass(v => !v)}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: T.mutedLight, cursor: "pointer", fontSize: 12, fontWeight: 800, fontFamily: "'DM Sans', sans-serif", padding: "0.25rem" }}
            >
              {showPass ? "Ocultar" : "Mostrar"}
            </button>
          </FieldWrap>

          <FieldWrap label="Nome da sua barbearia">
            <FieldIcon icon={Scissors} />
            <input
              style={inputSt}
              type="text"
              placeholder="ex: Barbearia do Zé"
              value={barbershopName}
              onChange={e => setBarbershopName(e.target.value)}
              onKeyDown={onKey}
              autoComplete="organization"
            />
          </FieldWrap>

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <FieldWrap label="WhatsApp">
                <FieldIcon icon={Phone} />
                <input
                  style={inputSt}
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={onKey}
                />
              </FieldWrap>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: T.mutedLight, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1.2 }}>
                  Como nos encontrou?
                </div>
                <select
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  style={{ ...inputSt, paddingLeft: "0.85rem", cursor: "pointer" }}
                >
                  <option value="">Selecionar...</option>
                  {SOURCE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Aceite dos Termos de Uso */}
          <div style={{ marginTop: 2, marginBottom: ".65rem" }}>
            <div
              onClick={() => setAgreedToTerms(v => !v)}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}
            >
              <div style={{
                width:          18,
                height:         18,
                borderRadius:   5,
                border:         `2px solid ${agreedToTerms ? T.accent : T.border}`,
                background:     agreedToTerms ? T.accent : "transparent",
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                flexShrink:     0,
                marginTop:      2,
                transition:     "all .15s",
              }}>
                {agreedToTerms && <Check size={11} color="#061018" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 12, color: T.mutedLight, lineHeight: 1.6, userSelect: "none" }}>
                Li e concordo com os{" "}
                <a
                  href="/termos"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ color: T.text, textDecoration: "underline", textUnderlineOffset: 2, whiteSpace: "nowrap" }}
                >
                  Termos de Uso
                </a>
                {" "}e a{" "}
                <a
                  href="/privacidade"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ color: T.text, textDecoration: "underline", textUnderlineOffset: 2, whiteSpace: "nowrap" }}
                >
                  Política de Privacidade
                </a>
                .
              </span>
            </div>

            {/* Garantia sem cobrança */}
            <div style={{
              display:      "flex",
              alignItems:   "center",
              gap:          6,
              marginTop:    8,
              marginLeft:   28,
              fontSize:     12,
              color:        T.success,
              fontWeight:   600,
            }}>
              ✅ Sem cobrança automática após os 7 dias de teste.
            </div>
          </div>

          {/* Botão de envio */}
          <button
            onClick={submit}
            disabled={loading}
            style={{
              width:          "100%",
              minHeight:      46,
              background:     loading ? `${T.accent}88` : `linear-gradient(135deg, ${T.accent}, #7dd3fc)`,
              color:          "#061018",
              border:         "none",
              borderRadius:   10,
              fontSize:       14,
              fontWeight:     900,
              cursor:         loading ? "wait" : "pointer",
              display:        "inline-flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            8,
              fontFamily:     "'DM Sans', sans-serif",
              boxShadow:      `0 0 28px ${T.accent}28`,
              transition:     "all .2s",
            }}
          >
            {loading ? (
              <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Criando conta…</>
            ) : (
              "Começar teste grátis"
            )}
          </button>
        </div>

        {/* Voltar ao login */}
        <div style={{ textAlign: "center", marginTop: "1.1rem" }}>
          <button
            onClick={onBack}
            style={{ background: "transparent", border: "none", color: T.mutedLight, cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <ChevronLeft size={14} />
            Voltar para o login
          </button>
        </div>

      </div>
    </div>
  );
}
