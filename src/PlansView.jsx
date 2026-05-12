import { useState } from "react";
import { RefreshCw, Check, ChevronRight, ArrowLeft, Gift, CreditCard } from "lucide-react";

const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxanpvbnR4Zndsd212YmRkYm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTU5NjIsImV4cCI6MjA5Mzc3MTk2Mn0.SiH3q7fQRoVDern1SnroZolD0rc_wttj5G-Me4wffVw";

const T = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#4db8ff", text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", successBg: "#43d18a18", danger: "#f07070", dangerBg: "#f0707018",
};

const PLANS = [
  {
    id: "monthly",
    label: "Plano Mensal",
    price: 79.90,
    priceLabel: "R$ 79,90",
    period: "/mês",
    sub: "Renovação automática a cada 30 dias",
    highlight: false,
    features: ["Acesso completo ao sistema", "Suporte via e-mail", "Atualizações incluídas"],
  },
  {
    id: "semestral",
    label: "Plano Semestral",
    price: 399.90,
    priceLabel: "R$ 399,90",
    period: "/6 meses",
    sub: "Equivale a apenas R$ 66/mês",
    economy: "Economize R$ 79,50",
    highlight: false,
    features: ["Acesso completo ao sistema", "Suporte via e-mail", "Atualizações incluídas"],
  },
  {
    id: "annual",
    label: "Plano Anual",
    price: 699.90,
    priceLabel: "R$ 699,90",
    period: "/ano",
    sub: "Equivale a apenas R$ 58/mês",
    economy: "Economize R$ 258,90",
    highlight: true,
    features: ["Acesso completo ao sistema", "Suporte prioritário", "Atualizações incluídas"],
  },
];

const inputSt = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "0.65rem 0.875rem", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
};

const ErrMsg = ({ msg }) => msg ? (
  <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.6rem 1rem", color: T.danger, fontSize: 13, marginBottom: "1rem" }}>
    {msg}
  </div>
) : null;

const SuccessMsg = ({ msg }) => msg ? (
  <div style={{ background: T.successBg, border: `1px solid ${T.success}44`, borderRadius: 8, padding: "0.6rem 1rem", color: T.success, fontSize: 13, marginBottom: "1rem", display: "flex", alignItems: "center", gap: 8 }}>
    <Check size={14} /> {msg}
  </div>
) : null;

// ══════════════════════════════════════════════════════════════
export default function PlansView({
  onBack,
  onCourtesyValidated,
  expiredMessage,
  token,
  profile,
  user,
  authData,
  session,
}) {
  const [tab,         setTab]         = useState("plans");   // "plans" | "courtesy"
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [courtEmail,  setCourtEmail]  = useState("");
  const [courtLoading,setCourtLoading]= useState(false);
  const [err,         setErr]         = useState("");
  const [successMsg,  setSuccessMsg]  = useState("");

  const getSavedAuth = () => {
    try {
      const raw =
        localStorage.getItem("ozbarber_auth") ||
        localStorage.getItem("authData") ||
        localStorage.getItem("auth") ||
        localStorage.getItem("session");

      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const getAccessToken = () => {
    const saved = getSavedAuth();

    return (
      token ||
      authData?.token ||
      authData?.access_token ||
      session?.access_token ||
      saved?.token ||
      saved?.access_token ||
      saved?.session?.access_token ||
      null
    );
  };

  const getUserId = () => {
    const saved = getSavedAuth();

    return (
      user?.id ||
      authData?.user?.id ||
      session?.user?.id ||
      profile?.id ||
      saved?.user?.id ||
      saved?.session?.user?.id ||
      saved?.profile?.id ||
      null
    );
  };

  const getBarbershopId = () => {
    const saved = getSavedAuth();

    return (
      profile?.barbershop_id ||
      authData?.profile?.barbershop_id ||
      session?.profile?.barbershop_id ||
      saved?.profile?.barbershop_id ||
      saved?.barbershop_id ||
      null
    );
  };

  // ── Inicia pagamento Mercado Pago ─────────────────────────────
  const handlePlanSelect = async (plan) => {
    setLoadingPlan(plan.id);
    setErr("");
    setSuccessMsg("");

    try {
      const accessToken = getAccessToken();

      const payload = {
        plan_id: plan.id,
        plan_label: plan.label,
        product_name: "Oz.Barber",
        price: Number(plan.price),
        currency: "BRL",
        return_url: window.location.origin,
        success_url: `${window.location.origin}/?payment=success&plan=${plan.id}`,
        failure_url: `${window.location.origin}/?payment=failure&plan=${plan.id}`,
        pending_url: `${window.location.origin}/?payment=pending&plan=${plan.id}`,

        // Metadata direta para o webhook identificar corretamente o tenant
        user_id: getUserId(),
        barbershop_id: getBarbershopId(),
      };

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-mp-preference`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      const checkoutUrl =
        data.init_point ||
        data.sandbox_init_point ||
        data.checkout_url ||
        data.url;

      if (!res.ok) {
        const detail = data.error || data.message || data.raw || `HTTP ${res.status}`;
        throw new Error(`Erro ao criar pagamento: ${detail}`);
      }

      if (!checkoutUrl) {
        throw new Error("Erro ao criar pagamento: a função não retornou o link do Mercado Pago.");
      }

      window.location.assign(checkoutUrl);
    } catch (e) {
      console.error("Erro Mercado Pago:", e);
      setErr(e.message || "Erro ao criar pagamento.");
      setLoadingPlan(null);
    }
  };

  // ── Valida e-mail de cortesia ─────────────────────────────────
  const handleCourtesy = async () => {
    if (!courtEmail.trim()) return setErr("Informe seu e-mail.");
    setCourtLoading(true); setErr(""); setSuccessMsg("");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_courtesy_email`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_email: courtEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!data.valid) {
        setErr(data.reason || "E-mail não encontrado ou acesso expirado.");
      } else {
        setSuccessMsg("Acesso validado! Avançando para o cadastro…");
        setTimeout(() => onCourtesyValidated(courtEmail.trim().toLowerCase(), data), 1200);
      }
    } catch {
      setErr("Erro de conexão. Tente novamente.");
    }
    setCourtLoading(false);//teste
  };

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'DM Sans', sans-serif", padding: "2rem 1rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <style>{`*{box-sizing:border-box} input::placeholder{color:${T.muted}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 4, background: T.accent }} />

      <div style={{ width: "100%", maxWidth: 520 }}>

        {/* Voltar */}
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: "1.5rem", fontFamily: "'DM Sans', sans-serif" }}>
          <ArrowLeft size={14} /> Voltar ao login
        </button>

        {/* Cabeçalho */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, letterSpacing: 3, color: T.accent }}>OZ.BARBER</div>
          {expiredMessage
            ? <div style={{ fontSize: 13, color: T.danger, marginTop: 6, background: T.dangerBg, borderRadius: 8, padding: "0.5rem 1rem", display: "inline-block" }}>{expiredMessage}</div>
            : <div style={{ fontSize: 14, color: T.muted, marginTop: 4 }}>Escolha seu plano e comece agora</div>}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: T.surface, borderRadius: 10, padding: 4, marginBottom: "1.75rem", border: `1px solid ${T.border}` }}>
          {[
            { id: "plans",    icon: <CreditCard size={14} />, label: "Assinar Plano" },
            { id: "courtesy", icon: <Gift size={14} />,       label: "Resgatar Acesso" },
          ].map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setErr(""); setSuccessMsg(""); }}
              style={{ flex: 1, padding: "0.6rem", borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s",
                background: tab === t.id ? T.card : "transparent",
                color:      tab === t.id ? T.text  : T.muted,
                boxShadow:  tab === t.id ? `0 0 0 1px ${T.border}` : "none",
              }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── ABA: PLANOS ── */}
        {tab === "plans" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <ErrMsg msg={err} />
            {PLANS.map(plan => (
              <div key={plan.id} onClick={() => !loadingPlan && handlePlanSelect(plan)}
                style={{
                  background: T.card, border: `2px solid ${plan.highlight ? T.accent : T.border}`,
                  borderRadius: 14, padding: "1.25rem 1.5rem", cursor: loadingPlan ? "wait" : "pointer",
                  position: "relative", transition: "border-color 0.2s",
                }}>
                {/* Badge Melhor Oferta */}
                {plan.highlight && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: T.accent, color: "#0a0808", borderRadius: 20, padding: "3px 14px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, whiteSpace: "nowrap" }}>
                    MELHOR OFERTA
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 16, color: T.text, marginBottom: 4 }}>{plan.label}</div>
                    <div style={{ fontSize: 12, color: T.muted }}>{plan.sub}</div>
                    {plan.economy && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, background: T.successBg, color: T.success, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>
                        <Check size={10} /> {plan.economy}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", marginLeft: 16 }}>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 1, color: plan.highlight ? T.accent : T.text, lineHeight: 1 }}>
                      {plan.priceLabel}
                    </div>
                    <div style={{ fontSize: 11, color: T.muted }}>{plan.period}</div>
                  </div>
                </div>

                {/* Botão */}
                <div style={{ marginTop: "1rem", background: plan.highlight ? T.accent : T.surface, border: `1px solid ${plan.highlight ? T.accent : T.border}`, borderRadius: 8, padding: "0.6rem", textAlign: "center", fontSize: 13, fontWeight: 600, color: plan.highlight ? "#0a0808" : T.text, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  {loadingPlan === plan.id
                    ? <><RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> Aguarde…</>
                    : <><CreditCard size={13} /> Assinar agora <ChevronRight size={13} /></>}
                </div>
              </div>
            ))}

            <div style={{ textAlign: "center", fontSize: 12, color: T.muted, marginTop: 4 }}>
              Pagamento seguro via Mercado Pago · Pix, cartão e boleto
            </div>
          </div>
        )}

        {/* ── ABA: RESGATAR ACESSO ── */}
        {tab === "courtesy" && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "1.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Gift size={20} color={T.accent} />
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 2, color: T.text }}>RESGATAR ACESSO</div>
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Recebeu um acesso liberado pelo administrador? Informe o e-mail cadastrado para validar.
            </div>

            <ErrMsg msg={err} />
            <SuccessMsg msg={successMsg} />

            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Seu e-mail</div>
              <input style={inputSt} type="email" placeholder="seu@email.com" value={courtEmail}
                onChange={e => setCourtEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCourtesy()} />
            </div>

            <button onClick={handleCourtesy} disabled={courtLoading}
              style={{ width: "100%", background: T.accent, color: "#0a0808", border: "none", borderRadius: 8, padding: "0.7rem", fontSize: 14, fontWeight: 600, cursor: courtLoading ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: "'DM Sans', sans-serif", opacity: courtLoading ? 0.7 : 1 }}>
              {courtLoading
                ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Validando…</>
                : <><Gift size={14} /> Validar acesso</>}
            </button>
          </div>
        )}

        {/* Rodapé */}
        <div style={{ textAlign: "center", marginTop: "2rem", fontSize: 12, color: T.muted }}>
          Desenvolvido por <span style={{ color: T.accent }}>OzTech SmartControl</span>
        </div>
      </div>
    </div>
  );
}
