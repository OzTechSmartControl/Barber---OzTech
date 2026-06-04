import { useState } from "react";
import { RefreshCw, Check, ChevronRight, ArrowLeft, Gift, CreditCard, Mail, AlertCircle, Zap } from "lucide-react";
import ozTechLogo from "./assets/ozbarber-logo.png.png";

const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co";
const SUPABASE_ANON = "sb_publishable_cTk8su9HL7LcXoPQE-bqVQ_5Idjyf1a";

const T = {
  bg: "#0b0b0e",
  surface: "#13131a",
  card: "#1a1a24",
  border: "#2a2a3a",
  accent: "#4db8ff",
  accentGlow: "#4db8ff22",
  text: "#ece8e0",
  muted: "#706b63",
  mutedLight: "#9a9590",
  success: "#43d18a",
  successBg: "#43d18a18",
  danger: "#f07070",
  dangerBg: "#f0707018",
};

const PLANS = [
  {
    id: "monthly",
    label: "Plano Mensal",
    price: 79.9,
    priceLabel: "R$ 79,90",
    period: "/mês",
    sub: "Renovação automática a cada 30 dias",
    highlight: false,
  },
  {
    id: "semestral",
    label: "Plano Semestral",
    price: 399.9,
    priceLabel: "R$ 399,90",
    period: "/6 meses",
    sub: "Equivale a apenas R$ 66/mês",
    economy: "Economize R$ 79,50",
    highlight: false,
  },
  {
    id: "annual",
    label: "Plano Anual",
    price: 699.9,
    priceLabel: "R$ 699,90",
    period: "/ano",
    sub: "Equivale a apenas R$ 58/mês",
    economy: "Economize R$ 258,90",
    highlight: true,
  },
];

const inputSt = {
  width: "100%",
  background: "#0d0e14",
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "0.72rem 0.95rem",
  color: T.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.035)",
};

const ErrMsg = ({ msg }) =>
  msg ? (
    <div
      style={{
        background: T.dangerBg,
        border: `1px solid ${T.danger}44`,
        borderRadius: 10,
        padding: "0.75rem 0.95rem",
        color: T.danger,
        fontSize: 13,
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontWeight: 700,
      }}
    >
      <AlertCircle size={15} />
      {msg}
    </div>
  ) : null;

const SuccessMsg = ({ msg }) =>
  msg ? (
    <div
      style={{
        background: T.successBg,
        border: `1px solid ${T.success}44`,
        borderRadius: 10,
        padding: "0.75rem 0.95rem",
        color: T.success,
        fontSize: 13,
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontWeight: 700,
      }}
    >
      <Check size={14} />
      {msg}
    </div>
  ) : null;

export default function PlansView({
  onBack,
  expiredMessage,
  token,
  profile,
  user,
  authData,
  session,
}) {
  const [loadingPlan, setLoadingPlan] = useState(null); // "planId-pix" | "planId-subscription"
  const [payerEmail, setPayerEmail] = useState("");
  const [courtEmail, setCourtEmail] = useState("");
  const [courtLoading, setCourtLoading] = useState(false);
  const [showCourtesyHelp, setShowCourtesyHelp] = useState(false);
  const [err, setErr] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

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

  const handlePlanSelect = async (plan, paymentType = "subscription") => {
    const email = payerEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErr("Informe um e-mail válido antes de assinar. Você usará esse mesmo e-mail para criar sua conta.");
      return;
    }

    setLoadingPlan(`${plan.id}-${paymentType}`);
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
        payer_email: email,
        payment_type: paymentType,
        return_url: window.location.origin,
        success_url: `${window.location.origin}/?payment=success&plan=${plan.id}`,
        failure_url: `${window.location.origin}/?payment=failure&plan=${plan.id}`,
        pending_url: `${window.location.origin}/?payment=pending&plan=${plan.id}`,
        user_id: getUserId(),
        barbershop_id: getBarbershopId(),
      };

      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-mp-preference`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON,
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
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

  const handleCourtesyLookup = async () => {
    const email = courtEmail.trim().toLowerCase();
    if (!email) return setErr("Informe seu e-mail.");

    setCourtLoading(true);
    setErr("");
    setSuccessMsg("");

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/validate_courtesy_email`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_email: email }),
      });

      const data = await res.json();

      if (!data.valid) {
        setErr(data.reason || "Não encontramos uma cortesia ativa para este e-mail.");
      } else {
        setSuccessMsg(
          "Encontramos uma cortesia ativa para este e-mail. Use o link enviado para criar seu acesso. Se não localizar o e-mail, peça ao administrador para reenviar o convite."
        );
      }
    } catch {
      setErr("Erro de conexão. Tente novamente.");
    } finally {
      setCourtLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 50% 10%, rgba(77,184,255,.10), transparent 27%), radial-gradient(circle at 50% 55%, rgba(77,184,255,.05), transparent 34%), #08090c",
        fontFamily: "'DM Sans', sans-serif",
        padding: "2rem 1rem",
        overflowX: "hidden",
      }}
    >
      <style>{`
        html, body, #root { margin:0; min-height:100%; width:100%; background:#08090c; }
        *{box-sizing:border-box}
        input::placeholder{color:${T.muted}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      <div
        style={{
          width: "100%",
          maxWidth: 430,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", marginBottom: "1rem" }}>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              color: T.mutedLight,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              fontFamily: "'DM Sans', sans-serif",
              padding: 0,
            }}
          >
            <ArrowLeft size={14} />
            Voltar ao login
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img
            src={ozTechLogo}
            alt="OzTech SmartControl"
            style={{
              width: 210,
              maxWidth: "70vw",
              height: "auto",
              display: "block",
              margin: "0 auto",
              filter: "drop-shadow(0 0 24px rgba(77,184,255,.20))",
            }}
          />

          {expiredMessage ? (
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                color: T.danger,
                background: T.dangerBg,
                border: `1px solid ${T.danger}44`,
                borderRadius: 10,
                padding: "0.55rem 0.9rem",
                display: "inline-block",
                lineHeight: 1.45,
              }}
            >
              {expiredMessage}
            </div>
          ) : (
            <div style={{ fontSize: 14, color: T.mutedLight, marginTop: 6 }}>
              Escolha seu plano e comece agora
            </div>
          )}
        </div>

        <div style={{ width: "100%" }}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontSize: 12, color: T.mutedLight, marginBottom: 6, fontWeight: 600 }}>
              <Mail size={12} style={{ marginRight: 5, verticalAlign: "middle" }} />
              Seu e-mail (use o mesmo para criar sua conta)
            </label>
            <input
              type="email"
              placeholder="seuemail@exemplo.com"
              value={payerEmail}
              onChange={(e) => setPayerEmail(e.target.value)}
              style={{ ...inputSt, borderColor: payerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail.trim()) ? T.danger : T.border }}
            />
          </div>

          <ErrMsg msg={err} />
          <SuccessMsg msg={successMsg} />

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                style={{
                  width: "100%",
                  background: "linear-gradient(180deg, rgba(26,26,36,.94), rgba(14,16,24,.96))",
                  border: `1px solid ${plan.highlight ? `${T.accent}aa` : T.border}`,
                  borderRadius: 16,
                  padding: "1rem 1.15rem",
                  position: "relative",
                  boxShadow: plan.highlight
                    ? "0 18px 42px rgba(0,0,0,.34), 0 0 24px rgba(77,184,255,.08)"
                    : "0 16px 34px rgba(0,0,0,.22)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {plan.highlight && (
                  <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:T.accent, color:"#0a0c10", borderRadius:999, padding:"3px 13px", fontSize:10, fontWeight:800, letterSpacing:0.4, whiteSpace:"nowrap" }}>
                    MELHOR OFERTA
                  </div>
                )}

                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:15, color:T.text, marginBottom:4 }}>{plan.label}</div>
                    <div style={{ fontSize:12, color:T.mutedLight, lineHeight:1.45 }}>{plan.sub}</div>
                    {plan.economy && (
                      <div style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:8, background:T.successBg, color:T.success, borderRadius:999, padding:"3px 8px", fontSize:10.5, fontWeight:700 }}>
                        <Check size={10} />{plan.economy}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign:"right", flexShrink:0 }}>
                    <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, letterSpacing:0.8, color:plan.highlight?T.accent:T.text, lineHeight:1 }}>{plan.priceLabel}</div>
                    <div style={{ fontSize:10.5, color:T.mutedLight, marginTop:2 }}>{plan.period}</div>
                  </div>
                </div>

                {/* Dois botões: PIX e Cartão */}
                <div style={{ display:"flex", gap:8, marginTop:"0.9rem" }}>
                  {/* Botão PIX */}
                  <button
                    disabled={!!loadingPlan}
                    onClick={() => !loadingPlan && handlePlanSelect(plan, "pix")}
                    style={{ flex:1, background:"#00b37422", border:`1px solid #00b37466`, borderRadius:10, padding:"0.65rem 0.5rem", textAlign:"center", fontSize:12, fontWeight:700, color:"#00b374", display:"flex", alignItems:"center", justifyContent:"center", gap:5, cursor:loadingPlan?"wait":"pointer", opacity:loadingPlan&&loadingPlan!==`${plan.id}-pix`?0.5:1, fontFamily:"'DM Sans',sans-serif" }}
                  >
                    {loadingPlan === `${plan.id}-pix` ? (
                      <><RefreshCw size={12} style={{ animation:"spin 1s linear infinite" }} /> Aguarde…</>
                    ) : (
                      <>Assinar com pagamento único<br/><span style={{fontSize:10, fontWeight:400, opacity:0.8}}>(sem renovação automática)</span></>
                    )}
                  </button>

                  {/* Botão Cartão */}
                  <button
                    disabled={!!loadingPlan}
                    onClick={() => !loadingPlan && handlePlanSelect(plan, "subscription")}
                    style={{ flex:2, background:plan.highlight?T.accent:"#0d0e14", border:`1px solid ${plan.highlight?T.accent:T.border}`, borderRadius:10, padding:"0.65rem 0.8rem", textAlign:"center", fontSize:12, fontWeight:700, color:plan.highlight?"#0a0c10":T.text, display:"flex", alignItems:"center", justifyContent:"center", gap:5, cursor:loadingPlan?"wait":"pointer", opacity:loadingPlan&&loadingPlan!==`${plan.id}-subscription`?0.5:1, fontFamily:"'DM Sans',sans-serif", boxShadow:plan.highlight?"0 10px 24px rgba(77,184,255,.18)":"none" }}
                  >
                    {loadingPlan === `${plan.id}-subscription` ? (
                      <><RefreshCw size={12} style={{ animation:"spin 1s linear infinite" }} /> Aguarde…</>
                    ) : (
                      <><CreditCard size={12} /> Assinar com cartão de crédito<br/><span style={{fontSize:10, fontWeight:400, opacity:0.8}}>(renovação automática)</span><ChevronRight size={12} /></>
                    )}
                  </button>
                </div>

                <div style={{ fontSize:10.5, color:T.muted, marginTop:6, textAlign:"center" }}>
                  {plan.id === "monthly"
                    ? "Pagamento Único sem renovação automática · Renovação Automática com cartão de crédito"
                    : "Pagamento único sem renovação automática"}
                </div>
              </div>
            ))}

            <div style={{ textAlign: "center", fontSize: 12, color: T.mutedLight, marginTop: 2 }}>
              Pagamento seguro via Mercado Pago · Pix, cartão e boleto
            </div>

            <div
              style={{
                marginTop: "0.65rem",
                background: "linear-gradient(180deg, rgba(26,26,36,.94), rgba(14,16,24,.96))",
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "0.9rem 1rem",
                boxShadow: "0 16px 34px rgba(0,0,0,.22)",
              }}
            >
              <button
                onClick={() => {
                  setShowCourtesyHelp((v) => !v);
                  setErr("");
                  setSuccessMsg("");
                }}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "none",
                  color: T.accent,
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  fontWeight: 800,
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: 0,
                }}
              >
                <Mail size={14} />
                Recebi um acesso cortesia
              </button>

              {showCourtesyHelp && (
                <div style={{ marginTop: "1rem", borderTop: `1px solid ${T.border}`, paddingTop: "1rem" }}>
                  <div style={{ color: T.mutedLight, fontSize: 13, lineHeight: 1.6, marginBottom: "1rem" }}>
                    O acesso cortesia é ativado pelo link enviado ao seu e-mail. Use esta área apenas para conferir se existe uma cortesia ativa para o e-mail informado.
                  </div>

                  <div style={{ marginBottom: "0.9rem" }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: T.muted,
                        marginBottom: 6,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      E-mail da cortesia
                    </div>
                    <input
                      style={inputSt}
                      type="email"
                      placeholder="seu@email.com"
                      value={courtEmail}
                      onChange={(e) => setCourtEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCourtesyLookup()}
                    />
                  </div>

                  <button
                    onClick={handleCourtesyLookup}
                    disabled={courtLoading}
                    style={{
                      width: "100%",
                      background: "#0d0e14",
                      color: T.text,
                      border: `1px solid ${T.border}`,
                      borderRadius: 10,
                      padding: "0.72rem",
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: courtLoading ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontFamily: "'DM Sans', sans-serif",
                      opacity: courtLoading ? 0.75 : 1,
                    }}
                  >
                    {courtLoading ? (
                      <>
                        <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                        Verificando…
                      </>
                    ) : (
                      <>
                        <Gift size={14} />
                        Verificar cortesia
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "1.75rem", fontSize: 12, color: T.mutedLight }}>
          Desenvolvido por <span style={{ color: T.accent, fontWeight: 700 }}>OzTech SmartControl</span>
        </div>
      </div>
    </div>
  );
}
