import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import Onboarding from "./Onboarding";
import PlansView   from "./PlansView";
import SuperAdminView from "./SuperAdminView";
import ResetPassword from "./ResetPassword";
import ozBarberLogo from "./assets/ozbarber-logo.png.png";
import {
  LayoutDashboard, Scissors, Users, Award, Tag, DollarSign,
  Menu, X, Plus, Search, Edit2, Trash2, Check, TrendingUp,
  Phone, LogOut, Lock, Mail, CreditCard, Banknote, Smartphone,
  BadgePercent, AlertCircle, RefreshCw, FileText, Download, Calendar, Bell, Gift,
  Settings, Upload, Palette, Image, Shield, Clock, Layers,
} from "lucide-react";

(() => {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap";
  document.head.appendChild(l);
})();

// ══════════════════════════════════════════════════════════════
//  ⚙️  CONFIGURAÇÃO SUPABASE
// ══════════════════════════════════════════════════════════════
const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co";
const SUPABASE_ANON = "sb_publishable_cTk8su9HL7LcXoPQE-bqVQ_5Idjyf1a";
// ══════════════════════════════════════════════════════════════

// ── API SUPABASE (REST + Auth) ─────────────────────────────────
const hdr = (tok, extra = {}) => ({
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${tok || SUPABASE_ANON}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
  ...extra,
});

const checkErr = async (res) => {
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || e.error_description || "Erro Supabase"); }
  return res;
};

const api = {
  login: (email, password) =>
    fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()),

  getUser: (tok) =>
    fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: hdr(tok) }).then(r => r.json()),

  getProfile: (uid, tok) =>
    fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=*`, { headers: hdr(tok) })
      .then(r => r.json()).then(d => d[0]),

  list: (table, qs, tok) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}?${qs}`, { headers: hdr(tok) }).then(r => r.json()),

  insert: async (table, body, tok) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: hdr(tok), body: JSON.stringify(body) });
    await checkErr(r); return r.json();
  },

  update: async (table, id, body, tok) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: hdr(tok), body: JSON.stringify(body) });
    await checkErr(r); return r.json();
  },

  remove: (table, id, tok) =>
    fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: hdr(tok) }),
};

const checkCurrentUserAccess = async (tok, profile) => {
  const isSuperAdmin =
    profile?.is_super_admin === true ||
    profile?.role === "super_admin";

  if (isSuperAdmin) {
    return { has_access: true, reason: "super_admin" };
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/current_user_access_status`, {
      method: "POST",
      headers: hdr(tok),
      body: JSON.stringify({}),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === "object") return data;
    }
  } catch (e) {
    console.warn("Falha ao validar current_user_access_status:", e);
  }

  // Fallback antigo, caso a função nova ainda não exista.
  if (profile?.barbershop_id) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/has_active_access`, {
        method: "POST",
        headers: hdr(tok),
        body: JSON.stringify({ p_barbershop_id: profile.barbershop_id }),
      });
      const hasAccess = await res.json();
      return {
        has_access: !!hasAccess,
        reason: hasAccess ? "legacy_has_active_access" : "no_active_access",
      };
    } catch (e) {
      console.warn("Falha ao validar has_active_access:", e);
    }
  }

  return { has_access: false, reason: "access_check_failed" };
};

const accessDeniedMessage = (reason) => {
  if (reason === "courtesy_revoked") {
    return "Seu acesso cortesia foi revogado. Entre em contato com o suporte ou assine um plano para continuar usando o sistema.";
  }
  if (reason === "no_barbershop") {
    return "Finalize o cadastro da sua barbearia para continuar.";
  }
  return "Sua assinatura ou acesso cortesia não está ativo. Renove ou solicite uma nova liberação para continuar.";
};


// ── TRANSFORMS ────────────────────────────────────────────────
const toAtt  = a => ({ id: a.id, clientId: a.client_id, barberId: a.barber_id, serviceId: a.service_id, price: +a.price, payment: a.payment, date: a.date, time: a.time || "", notes: a.notes || "", extraServices: Array.isArray(a.extra_services) ? a.extra_services : [] });
const fromAtt = a => ({ client_id: +a.clientId||0, barber_id: +a.barberId||0, service_id: +a.serviceId||0, price: +a.price, payment: a.payment, date: a.date, time: a.time, notes: a.notes, extra_services: a.extraServices||[] });
const toClient = c => ({ id: c.id, name: c.name, phone: c.phone || "", whatsapp: c.whatsapp || "", birthdate: c.birthdate || "", notes: c.notes || "", points: +c.points });
const toBarber = b => ({ id: b.id, name: b.name, phone: b.phone || "", commission: +b.commission, status: b.status, userId: b.user_id });
const toService = s => ({ id: s.id, name: s.name, price: +s.price, duration: +s.duration, active: s.active });
const toExpense = e => ({ id: e.id, desc: e.description, amount: +e.amount, date: e.date, category: e.category || "" });

// ── THEME ─────────────────────────────────────────────────────
const T = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  borderLight: "#222230", accent: "#4db8ff", accentGlow: "#4db8ff22",
  text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", successBg: "#43d18a18", danger: "#f07070", dangerBg: "#f0707018",
  info: "#60a5fa", infoBg: "#60a5fa18", sidebar: "#0e0e14",
};

const DEFAULT_T = { ...T };

const normalizeHex = (value, fallback = DEFAULT_T.accent) => {
  if (!value || typeof value !== "string") return fallback;
  const hex = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : fallback;
};

const applyTenantTheme = (shop) => {
  const accent = normalizeHex(shop?.accent_color);
  T.accent = accent;
  T.accentGlow = `${accent}22`;
  if (shop?.name) document.title = `${shop.name} | Oz.Barber`;
};

const resetTenantTheme = () => {
  Object.assign(T, DEFAULT_T);
  document.title = "Oz.Barber";
};

// ── HELPERS ───────────────────────────────────────────────────
const R$   = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(+v || 0);
const fDate = s => s ? new Date(s + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const today   = () => new Date().toISOString().slice(0, 10);
const nowTime = () => { const n = new Date(); return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`; };
const month = () => today().slice(0, 7);
const nextId = arr => Math.max(0, ...arr.map(x => x.id)) + 1;

const PAYMENT_OPTS = ["Dinheiro", "PIX", "Cartão Débito", "Cartão Crédito"];
const EXPENSE_CATS = ["Aluguel", "Insumos", "Energia", "Internet", "Manutenção", "Marketing", "Outros"];

// ── SHARED UI ─────────────────────────────────────────────────
const inputSt = { width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.6rem 0.875rem", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" };

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}>
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${T.border}` }}>
        <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: 21, letterSpacing: 1.5, color: T.text }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex" }}><X size={18} /></button>
      </div>
      <div style={{ padding: "1.5rem" }}>{children}</div>
    </div>
  </div>
);

const FLabel = ({ c }) => <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</div>;
const FG = ({ label, children, half }) => <div style={{ marginBottom: "1rem", flex: half ? 1 : undefined }}>{label && <FLabel c={label} />}{children}</div>;
const FInput  = ({ label, ...p }) => <FG label={label}><input style={inputSt} {...p} /></FG>;
const FSelect = ({ label, children, ...p }) => <FG label={label}><select style={{ ...inputSt, appearance: "none" }} {...p}>{children}</select></FG>;
const FArea   = ({ label, ...p }) => <FG label={label}><textarea style={{ ...inputSt, resize: "vertical", minHeight: 72, fontFamily: "'DM Sans', sans-serif" }} {...p} /></FG>;
const Row     = ({ children, g = "1rem", style }) => <div style={{ display: "flex", gap: g, ...style }}>{children}</div>;

const Btn = ({ children, variant = "primary", sm, style, ...p }) => {
  const v = { primary: { background: T.accent, color: "#0a0808", border: "none" }, ghost: { background: T.surface, color: T.text, border: `1px solid ${T.border}` }, danger: { background: T.dangerBg, color: T.danger, border: `1px solid ${T.danger}44` } };
  return <button style={{ ...v[variant], borderRadius: 8, padding: sm ? "0.4rem 0.875rem" : "0.6rem 1.25rem", fontSize: sm ? 12 : 14, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", ...style }} {...p}>{children}</button>;
};

const Card = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1.25rem", cursor: onClick ? "pointer" : undefined, ...style }}>{children}</div>
);

const Badge = ({ children, color = T.accent }) => (
  <span style={{ background: color + "22", color, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.3 }}>{children}</span>
);

const StatCard = ({ label, value, sub, color, icon: Icon }) => (
  <Card>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{label}</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 1, color: color || T.text, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 6 }}>{sub}</div>}
      </div>
      {Icon && <div style={{ background: (color || T.accent) + "18", borderRadius: 10, padding: 10 }}><Icon size={19} color={color || T.accent} /></div>}
    </div>
  </Card>
);

const THead = ({ cols }) => (
  <thead><tr>{cols.map(c => <th key={c} style={{ textAlign: "left", padding: "0 0.75rem 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</th>)}</tr></thead>
);

const PageHeader = ({ title, sub, right }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
    <div>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, letterSpacing: 2.5, margin: "0 0 4px", color: T.text }}>{title}</h1>
      {sub && <div style={{ color: T.muted, fontSize: 13 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

const ErrorBar = ({ msg }) => msg ? (
  <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.danger, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
    <AlertCircle size={15} />{msg}
  </div>
) : null;

// ── LOGIN VIEW ────────────────────────────────────────────────
const LoginView = ({ onLogin, onShowPlans }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!email || !pass) return setErr("Preencha e-mail e senha.");

    setLoading(true);
    setErr("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: pass,
      });

      if (error || !data?.session?.access_token || !data?.user?.id) {
        setErr("E-mail ou senha incorretos.");
        setLoading(false);
        return;
      }

      const existingProfile = await api.getProfile(data.user.id, data.session.access_token);

      // Usuário criado pelo link de cortesia pode existir no Auth e ainda não ter profile/barbearia.
      // Nesse caso, deixa o App continuar para o onboarding.
      const profile = existingProfile || {
        id: data.user.id,
        role: "admin",
        barbershop_id: null,
        is_onboarding_pending: true,
      };

      onLogin({
        token: data.session.access_token,
        access_token: data.session.access_token,
        user: data.user,
        profile,
      });
    } catch (e) {
      console.error(e);
      setErr("Erro de conexão. Verifique a URL e chave do Supabase.");
    }

    setLoading(false);
  };

  const onKey = e => e.key === "Enter" && submit();

  const loginInputWrap = {
    position: "relative",
    width: "100%",
  };

  const loginInput = {
    width: "100%",
    height: 42,
    background: "#0d0e14",
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: T.text,
    outline: "none",
    padding: "0 2.75rem 0 2.65rem",
    fontSize: 13,
    fontFamily: "'DM Sans', sans-serif",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.035)",
  };

  const iconSt = {
    position: "absolute",
    left: 13,
    top: "50%",
    transform: "translateY(-50%)",
    color: T.mutedLight,
    opacity: .85,
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
          "radial-gradient(circle at 50% 10%, rgba(77,184,255,.10), transparent 27%), radial-gradient(circle at 50% 55%, rgba(77,184,255,.055), transparent 34%), #08090c",
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
          maxWidth: 400,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img
            src="/ozbarber-logo.png"
            alt="Oz.Barber"
            style={{
              width: 230,
              maxWidth: "72vw",
              height: "auto",
              display: "block",
              margin: "0 auto",
              filter: "drop-shadow(0 0 24px rgba(77,184,255,.22))",
            }}
          />
        </div>

        <div
          style={{
            width: "100%",
            background: "linear-gradient(180deg, rgba(26,26,36,.94), rgba(14,16,24,.96))",
            border: `1px solid ${T.accent}66`,
            borderRadius: 16,
            padding: "1.75rem 1.8rem",
            boxShadow: "0 28px 90px rgba(0,0,0,.48), 0 0 42px rgba(77,184,255,.08)",
            backdropFilter: "blur(8px)",
          }}
        >
          <h1
            style={{
              margin: 0,
              color: T.text,
              fontSize: 24,
              lineHeight: 1,
              letterSpacing: -.4,
              fontWeight: 800,
            }}
          >
            Entrar
          </h1>

          <p
            style={{
              margin: ".75rem 0 1.55rem",
              color: T.mutedLight,
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            Acesse sua conta para continuar.
          </p>

          {err && (
            <div
              style={{
                background: T.dangerBg,
                color: T.danger,
                border: `1px solid ${T.danger}44`,
                borderRadius: 10,
                padding: ".75rem .9rem",
                marginBottom: "1rem",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertCircle size={16} />
              {err}
            </div>
          )}

          <div style={{ marginBottom: ".85rem" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: T.mutedLight,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 1.4,
              }}
            >
              E-mail
            </div>

            <div style={loginInputWrap}>
              <Mail size={18} style={iconSt} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={onKey}
                placeholder="Digite seu e-mail"
                autoComplete="email"
                style={loginInput}
              />
            </div>
          </div>

          <div style={{ marginBottom: ".55rem" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: T.mutedLight,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: 1.4,
              }}
            >
              Senha
            </div>

            <div style={loginInputWrap}>
              <Lock size={18} style={iconSt} />
              <input
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={e => setPass(e.target.value)}
                onKeyDown={onKey}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                style={loginInput}
              />

              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: T.mutedLight,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 800,
                  fontFamily: "'DM Sans', sans-serif",
                  padding: "0.35rem",
                }}
              >
                {showPass ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <div style={{ textAlign: "right", margin: ".15rem 0 1.05rem" }}>
            <button
              type="button"
              onClick={() => alert("Em breve: recuperação de senha pelo e-mail.")}
              style={{
                background: "transparent",
                border: "none",
                color: T.accent,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 800,
                fontFamily: "'DM Sans', sans-serif",
                padding: 0,
              }}
            >
              Esqueceu sua senha?
            </button>
          </div>

          <button
            onClick={submit}
            disabled={loading}
            style={{
              width: "100%",
              minHeight: 42,
              background: `linear-gradient(135deg, ${T.accent}, #7dd3fc)`,
              color: "#061018",
              border: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 900,
              cursor: loading ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontFamily: "'DM Sans', sans-serif",
              opacity: loading ? .75 : 1,
              boxShadow: `0 0 26px ${T.accent}24`,
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              margin: "1.25rem 0 .9rem",
              color: T.muted,
              fontSize: 12,
            }}
          >
            <div style={{ height: 1, flex: 1, background: T.border }} />
            <span>ou</span>
            <div style={{ height: 1, flex: 1, background: T.border }} />
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: 14,
              color: T.mutedLight,
            }}
          >
            Não tem uma conta?{" "}
            <button
              onClick={onShowPlans}
              style={{
                background: "transparent",
                border: "none",
                color: T.accent,
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 900,
                fontFamily: "'DM Sans', sans-serif",
                padding: 0,
              }}
            >
              Assinar Plano
            </button>
          </div>
        </div>

        <div
          style={{
            marginTop: "1.05rem",
            textAlign: "center",
            color: T.mutedLight,
            fontSize: 12,
            letterSpacing: ".2px",
          }}
        >
          Desenvolvido por OzTech SmartControl
        </div>
      </div>
    </div>
  );
};

// ── LOADING SCREEN ────────────────────────────────────────────
const LoadingScreen = () => (
  <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: T.bg, flexDirection: "column", gap: 16 }}>
    <RefreshCw size={28} color={T.accent} style={{ animation: "spin 1s linear infinite" }} />
    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 3, color: T.muted }}>CARREGANDO</div>
    <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ── DASHBOARD ─────────────────────────────────────────────────
function Dashboard({ attendances, clients, services, barbers, isAdmin, myBarberId, onGoReports }) {
  const todayStr   = today();
  const monthStr   = month();
  const myAtts     = isAdmin ? attendances : attendances.filter(a => a.barberId === myBarberId);
  const todayAtts  = myAtts.filter(a => a.date === todayStr);
  const monthAtts  = myAtts.filter(a => a.date.startsWith(monthStr));
  const todayRev   = todayAtts.reduce((s, a) => s + a.price, 0);
  const monthRev   = monthAtts.reduce((s, a) => s + a.price, 0);

  // Barbeiro: painel próprio
  if (!isAdmin) {
    const me = barbers.find(b => b.id === myBarberId);
    const commission = monthRev * (me?.commission || 0) / 100;
    return (
      <div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, letterSpacing: 2.5, margin: "0 0 4px", color: T.text }}>Olá, {me?.name?.split(" ")[0] || "Barbeiro"}</h1>
          <div style={{ color: T.muted, fontSize: 13 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatCard label="Atendimentos hoje"  value={todayAtts.length}  icon={Scissors} />
          <StatCard label="Faturamento hoje"    value={R$(todayRev)}     color={T.accent}  icon={DollarSign} />
          <StatCard label="Faturamento do mês"  value={R$(monthRev)}     color={T.success} icon={TrendingUp} />
          <StatCard label="Comissão do mês"     value={R$(commission)}   color={T.accent}  icon={BadgePercent} sub={`${me?.commission || 0}% sobre ${R$(monthRev)}`} />
        </div>
        <Card>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1rem" }}>Últimos atendimentos</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <THead cols={["Data", "Cliente", "Serviço", "Valor", "Pagamento"]} />
            <tbody>
              {myAtts.slice(0, 10).map(a => {
                const cl = clients.find(c => c.id === a.clientId);
                const sv = services.find(s => s.id === a.serviceId);
                return (
                  <tr key={a.id} style={{ borderTop: `1px solid ${T.borderLight}` }}>
                    <td style={{ padding: "9px 0.75rem", color: T.muted }}>{fDate(a.date)} {a.time}</td>
                    <td style={{ padding: "9px 0.75rem", color: T.text, fontWeight: 500 }}>{cl?.name || "—"}</td>
                    <td style={{ padding: "9px 0.75rem", color: T.text }}>{sv?.name || "—"}</td>
                    <td style={{ padding: "9px 0.75rem", color: T.success, fontWeight: 600 }}>{R$(a.price)}</td>
                    <td style={{ padding: "9px 0.75rem" }}><Badge>{a.payment}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    );
  }

  // Admin: visão completa
  const allToday  = attendances.filter(a => a.date === todayStr);
  const allMonth  = attendances.filter(a => a.date.startsWith(monthStr));
  const allMonthR = allMonth.reduce((s, a) => s + a.price, 0);

  const svcCount = {};
  allMonth.forEach(a => { svcCount[a.serviceId] = (svcCount[a.serviceId] || 0) + 1; });
  const topSvcs = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([id, n]) => ({ svc: services.find(s => s.id === +id), n }));
  const maxN = topSvcs[0]?.n || 1;

  const bStats = barbers.filter(b => b.status === "active").map(b => {
    const bA = allMonth.filter(a => a.barberId === b.id);
    const total = bA.reduce((s, a) => s + a.price, 0);
    return { b, count: bA.length, total, commission: total * b.commission / 100, ticket: bA.length ? total / bA.length : 0 };
  }).sort((a, b) => b.total - a.total);

  const bToday = barbers.filter(b => b.status === "active").map(b => {
    const bA = allToday.filter(a => a.barberId === b.id);
    return { b, count: bA.length, total: bA.reduce((s, a) => s + a.price, 0) };
  });

  return (
    <div>
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, letterSpacing: 2.5, margin: "0 0 4px", color: T.text }}>Dashboard</h1>
        <div style={{ color: T.muted, fontSize: 13 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Atendimentos hoje"  value={allToday.length}                      icon={Scissors} />
        <StatCard label="Faturamento hoje"    value={R$(allToday.reduce((s,a)=>s+a.price,0))} color={T.accent}  icon={DollarSign} />
        <StatCard label="Faturamento do mês"  value={R$(allMonthR)}                        color={T.success} icon={TrendingUp} />
        <StatCard label="Clientes únicos hoje" value={new Set(allToday.map(a=>a.clientId)).size} icon={Users} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <Card>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1rem" }}>Ranking Barbeiros — Mês</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <THead cols={["#", "Barbeiro", "Aten.", "Total", "Comissão", "Ticket Méd."]} />
            <tbody>
              {bStats.map(({ b, count, total, commission, ticket }, i) => (
                <tr key={b.id} style={{ borderTop: `1px solid ${T.borderLight}` }}>
                  <td style={{ padding: "9px 0.75rem" }}>
                    <span style={{ background: i===0?T.accentGlow:T.surface, color: i===0?T.accent:T.muted, borderRadius:"50%", width:22, height:22, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>{i+1}</span>
                  </td>
                  <td style={{ padding:"9px 0.75rem", color:T.text, fontWeight:500 }}>{b.name}</td>
                  <td style={{ padding:"9px 0.75rem", color:T.muted }}>{count}</td>
                  <td style={{ padding:"9px 0.75rem", color:T.success, fontWeight:600 }}>{R$(total)}</td>
                  <td style={{ padding:"9px 0.75rem", color:T.accent }}>{R$(commission)}</td>
                  <td style={{ padding:"9px 0.75rem", color:T.text }}>{R$(ticket)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1rem" }}>Serviços Mais Realizados</div>
          {topSvcs.map(({ svc, n }) => svc && (
            <div key={svc.id} style={{ marginBottom: 13 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}>
                <span style={{ color:T.text }}>{svc.name}</span>
                <span style={{ color:T.muted, fontWeight:600 }}>{n}×</span>
              </div>
              <div style={{ background:T.surface, borderRadius:4, height:5 }}>
                <div style={{ background:T.accent, borderRadius:4, height:5, width:`${(n/maxN)*100}%` }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ marginBottom:"0.75rem", fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:1.5, color:T.text }}>Painel de Hoje — Barbeiros</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"1rem" }}>
        {bToday.map(({ b, count, total }) => (
          <Card key={b.id} style={{ borderLeft:`3px solid ${T.accent}`, borderRadius:"0 12px 12px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:T.accentGlow, border:`1px solid ${T.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color:T.accent }}>{b.name.charAt(0)}</div>
              <div style={{ fontWeight:600, color:T.text, fontSize:14 }}>{b.name}</div>
            </div>
            {[["Atendimentos", count, T.text],["Total produzido", R$(total), T.success],[`Comissão (${b.commission}%)`, R$(total*b.commission/100), T.accent]].map(([l,v,c])=>(
              <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}>
                <span style={{ color:T.muted }}>{l}</span>
                <span style={{ color:c, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── ATTENDANCES ───────────────────────────────────────────────
// ── MEU PLANO ─────────────────────────────────────────────────
function MeuPlanoView({ token, userEmail, profile, onRenew }) {
  const [sub, setSub]         = useState(null);
  const [courtesy, setCourtesy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const rpc = async (fn) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({}),
      });
      const d = await r.json();
      return (d && typeof d === "object" && !Array.isArray(d) && d.id) ? d : null;
    };

    const load = async () => {
      setLoading(true);
      try {
        const planData = await rpc("get_my_plan_info");
        if (!cancelled && planData) { setSub(planData); setLoading(false); return; }
        const courtesyData = await rpc("get_my_courtesy_info");
        if (!cancelled && courtesyData) setCourtesy(courtesyData);
      } catch(e) { console.error(e); }
      if (!cancelled) setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [token]);

  const PLAN_LABEL  = { monthly:"Plano Mensal", semestral:"Plano Semestral", annual:"Plano Anual" };
  const PLAN_PERIOD = { monthly:"30 dias", semestral:"6 meses", annual:"12 meses" };

  const calcExpiry = (row) => {
    if (!row) return null;
    if (row.expires_at) return new Date(row.expires_at);
    const base = row.paid_at || row.created_at;
    if (!base) return null;
    const d = new Date(base);
    if (row.plan === "annual") d.setFullYear(d.getFullYear() + 1);
    else if (row.plan === "semestral") d.setMonth(d.getMonth() + 6);
    else d.setMonth(d.getMonth() + 1);
    return d;
  };

  const isCourtesy     = !sub && !!courtesy;
  const isUnlimited    = isCourtesy && courtesy.type === "unlimited";
  const expiryDate     = sub ? calcExpiry(sub) : (courtesy?.expires_at ? new Date(courtesy.expires_at) : null);
  const contractDate   = sub ? (sub.paid_at || sub.created_at) : courtesy?.created_at;
  const daysLeft       = (!expiryDate || isUnlimited) ? null : Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));
  const daysColor      = daysLeft === null ? T.accent : daysLeft > 30 ? T.success : daysLeft > 10 ? T.warning : T.danger;
  const planName       = sub ? (PLAN_LABEL[sub.plan] || sub.plan || "Plano") : isCourtesy ? "Acesso Cortesia" : "Sem plano ativo";
  const planPeriod     = sub ? PLAN_PERIOD[sub.plan] : isCourtesy ? (isUnlimited ? "Indeterminado" : "Prazo determinado") : "—";
  const amountPaid     = sub ? +sub.amount : null;

  const InfoRow = ({ label, value, valueColor }) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0.75rem 0", borderBottom:`1px solid ${T.borderLight}` }}>
      <span style={{ color:T.muted, fontSize:13 }}>{label}</span>
      <span style={{ color:valueColor||T.text, fontSize:13, fontWeight:700 }}>{value}</span>
    </div>
  );

  return (
    <div>
      <PageHeader title="Meu Plano" sub="Informações do plano contratado e opções de renovação" right={
        <Btn onClick={onRenew}><RefreshCw size={14}/> Renovar / Trocar plano</Btn>
      }/>

      {loading ? (
        <Card><div style={{ textAlign:"center", color:T.muted, padding:"2rem" }}>Carregando informações do plano…</div></Card>
      ) : (sub || courtesy) ? (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.25rem" }}>
          {/* Card principal */}
          <Card>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"1.25rem" }}>
              <div style={{ background:`${T.accent}18`, borderRadius:12, padding:12 }}>
                <Shield size={22} color={T.accent}/>
              </div>
              <div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, letterSpacing:1.5, color:T.text }}>{planName}</div>
                <div style={{ color:T.muted, fontSize:12 }}>{planPeriod}</div>
              </div>
            </div>
            <InfoRow label="Contratado em"   value={contractDate ? new Date(contractDate).toLocaleDateString("pt-BR") : "—"} />
            <InfoRow label="Expira em"        value={isUnlimited ? "Indeterminado" : expiryDate ? expiryDate.toLocaleDateString("pt-BR") : "—"} />
            {amountPaid !== null && <InfoRow label="Valor pago"  value={R$(amountPaid)} valueColor={T.success} />}
            <InfoRow label="Tipo de acesso"  value={isCourtesy ? "Cortesia" : "Assinatura"} />
          </Card>

          {/* Card dias restantes */}
          <Card style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center" }}>
            {isUnlimited ? (
              <>
                <div style={{ background:`${T.accent}18`, borderRadius:999, padding:18, marginBottom:16 }}>
                  <Layers size={32} color={T.accent}/>
                </div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, letterSpacing:1.5, color:T.accent }}>Acesso Vitalício</div>
                <div style={{ color:T.muted, fontSize:13, marginTop:6 }}>Sem data de expiração</div>
              </>
            ) : daysLeft !== null ? (
              <>
                <div style={{ background:`${daysColor}18`, borderRadius:999, padding:18, marginBottom:16 }}>
                  <Clock size={32} color={daysColor}/>
                </div>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:56, letterSpacing:2, color:daysColor, lineHeight:1 }}>{daysLeft}</div>
                <div style={{ color:T.muted, fontSize:13, marginTop:8 }}>dias restantes</div>
                {daysLeft <= 10 && (
                  <div style={{ background:T.dangerBg, border:`1px solid ${T.danger}44`, color:T.danger, borderRadius:8, padding:"0.5rem 1rem", fontSize:12, fontWeight:700, marginTop:16 }}>
                    ⚠️ Plano prestes a expirar
                  </div>
                )}
              </>
            ) : (
              <div style={{ color:T.muted, fontSize:13 }}>Sem data de expiração calculada</div>
            )}
          </Card>

          {/* Card renovação */}
          <Card style={{ gridColumn:"1 / -1" }}>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, letterSpacing:1.5, color:T.text, marginBottom:"0.75rem" }}>Renovar ou Trocar Plano</div>
            <div style={{ color:T.muted, fontSize:13, marginBottom:"1.25rem", lineHeight:1.5 }}>
              Renove seu plano atual ou troque para um plano com melhor custo-benefício. Pagamento seguro via Mercado Pago — Pix, cartão e boleto.
            </div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
              <Btn onClick={onRenew}><CreditCard size={14}/> Ver planos disponíveis</Btn>
              <Btn variant="ghost" onClick={onRenew}><RefreshCw size={14}/> Renovar plano atual</Btn>
            </div>
          </Card>
        </div>
      ) : (
        <Card style={{ textAlign:"center", padding:"3rem" }}>
          <Shield size={40} color={T.muted} style={{ margin:"0 auto 1rem" }}/>
          <div style={{ color:T.text, fontWeight:700, fontSize:16, marginBottom:8 }}>Nenhum plano encontrado</div>
          <div style={{ color:T.muted, fontSize:13, marginBottom:"1.5rem" }}>Assine um plano para continuar usando a plataforma.</div>
          <Btn onClick={onRenew}><CreditCard size={14}/> Ver planos</Btn>
        </Card>
      )}
    </div>
  );
}

// ── ATENDIMENTOS ──────────────────────────────────────────────
function AttendancesView({ attendances, setAttendances, clients, services, barbers, token, isAdmin, myBarberId, barbershopId }) {
  const emptyForm = () => ({
    clientId: "", barberId: isAdmin ? "" : String(myBarberId||""),
    selectedServices: [], payment: "PIX",
    date: today(), time: nowTime(), notes: "",
  });

  const [filterDate,   setFilterDate]   = useState(today());
  const [filterBarber, setFilterBarber] = useState("");
  const [showModal,    setShowModal]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState("");
  const [addSvcId,     setAddSvcId]     = useState("");
  const [form,         setForm]         = useState(emptyForm);

  const totalPrice = form.selectedServices.reduce((s, sv) => s + sv.price, 0);

  const addService = (svcId) => {
    if (!svcId) return;
    const svc = services.find(s => s.id === +svcId);
    if (!svc || form.selectedServices.find(s => s.serviceId === svc.id)) { setAddSvcId(""); return; }
    setForm(f => ({ ...f, selectedServices: [...f.selectedServices, { serviceId: svc.id, name: svc.name, price: svc.price }] }));
    setAddSvcId("");
  };

  const removeService = (svcId) => setForm(f => ({ ...f, selectedServices: f.selectedServices.filter(s => s.serviceId !== svcId) }));

  const getServiceDisplay = (a) => {
    const primary = services.find(s => s.id === a.serviceId);
    const extras  = (a.extraServices || []).map(es => es.name || services.find(s => s.id === es.serviceId)?.name || "").filter(Boolean);
    return [primary?.name, ...extras].filter(Boolean).join(" + ") || "—";
  };

  const filtered = useMemo(() =>
    attendances
      .filter(a => (!filterDate || a.date === filterDate) && (!filterBarber || a.barberId === +filterBarber))
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
    [attendances, filterDate, filterBarber]
  );

  const save = async () => {
    if (!form.clientId || !form.barberId || form.selectedServices.length === 0)
      return setErr("Preencha cliente, barbeiro e pelo menos um serviço.");
    setSaving(true); setErr("");
    try {
      const [primary, ...extras] = form.selectedServices;
      const rows = await api.insert("attendances", {
        client_id: +form.clientId, barber_id: +form.barberId,
        service_id: primary.serviceId, price: totalPrice,
        payment: form.payment, date: form.date, time: form.time,
        notes: form.notes, extra_services: extras, barbershop_id: barbershopId,
      }, token);
      setAttendances(prev => [toAtt(rows[0]), ...prev]);
      setShowModal(false); setForm(emptyForm());
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  const del = async id => {
    await api.remove("attendances", id, token);
    setAttendances(prev => prev.filter(a => a.id !== id));
  };

  const payColor = { "PIX": T.info, "Dinheiro": T.success, "Cartão Débito": T.accent, "Cartão Crédito": T.accent };
  const stCell   = { padding: "9px 0.75rem" };

  return (
    <div>
      <PageHeader
        title="Atendimentos"
        sub={`${filtered.length} atendimento${filtered.length !== 1 ? "s" : ""} · ${R$(filtered.reduce((s, a) => s + a.price, 0))}`}
        right={<Btn onClick={() => { setForm(emptyForm()); setShowModal(true); }}><Plus size={15}/>Novo Atendimento</Btn>}
      />

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
        <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 0.875rem", color: T.text, fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif" }} />
        {isAdmin && (
          <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 0.875rem", color: filterBarber ? T.text : T.muted, fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif" }}>
            <option value="">Todos os barbeiros</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {(filterDate || filterBarber) && <Btn variant="ghost" sm onClick={() => { setFilterDate(""); setFilterBarber(""); }}>Limpar</Btn>}
      </div>

      <Card style={{ padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <THead cols={["Horário", "Cliente", "Barbeiro", "Serviço(s)", "Valor", "Pagamento", "Data", ""]} />
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "3rem", color: T.muted }}>Nenhum atendimento encontrado</td></tr>
            ) : filtered.map(a => {
              const cl = clients.find(c => c.id === a.clientId), br = barbers.find(b => b.id === a.barberId);
              return (
                <tr key={a.id} style={{ borderTop: `1px solid ${T.borderLight}` }}>
                  <td style={{ ...stCell, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{a.time}</td>
                  <td style={{ ...stCell, color: T.text, fontWeight: 500 }}>{cl?.name || "—"}</td>
                  <td style={{ ...stCell, color: T.muted }}>{br?.name || "—"}</td>
                  <td style={{ ...stCell, color: T.text }}>{getServiceDisplay(a)}</td>
                  <td style={{ ...stCell, color: T.success, fontWeight: 600 }}>{R$(a.price)}</td>
                  <td style={stCell}>
                    <span style={{ background: (payColor[a.payment] || T.accent) + "18", color: payColor[a.payment] || T.accent, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{a.payment}</span>
                  </td>
                  <td style={{ ...stCell, color: T.muted, fontSize: 12 }}>{fDate(a.date)}</td>
                  <td style={{ ...stCell, textAlign: "right" }}>
                    <button onClick={() => del(a.id)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "inline-flex" }}><Trash2 size={14}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {showModal && (
        <Modal title="Novo Atendimento" onClose={() => setShowModal(false)}>
          <ErrorBar msg={err}/>

          <FSelect label="Cliente" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}>
            <option value="">Selecione o cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FSelect>

          {isAdmin && (
            <FSelect label="Barbeiro" value={form.barberId} onChange={e => setForm(f => ({ ...f, barberId: e.target.value }))}>
              <option value="">Selecione o barbeiro</option>
              {barbers.filter(b => b.status === "active").map(b => <option key={b.id} value={b.id}>{b.name} ({b.commission}%)</option>)}
            </FSelect>
          )}

          {/* ── Multi-serviço ── */}
          <FG label="Adicionar Serviço">
            <select style={{ ...inputSt, appearance: "none" }} value={addSvcId}
              onChange={e => { setAddSvcId(e.target.value); addService(e.target.value); }}>
              <option value="">Selecione para adicionar…</option>
              {services.filter(s => s.active).map(s => <option key={s.id} value={s.id}>{s.name} — {R$(s.price)}</option>)}
            </select>
          </FG>

          {form.selectedServices.length > 0 && (
            <div style={{ marginBottom: "1rem", border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
              {form.selectedServices.map(sv => (
                <div key={sv.serviceId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: `1px solid ${T.borderLight}`, background: T.surface }}>
                  <span style={{ color: T.text, fontSize: 13 }}>{sv.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: T.success, fontSize: 13, fontWeight: 700 }}>{R$(sv.price)}</span>
                    <button onClick={() => removeService(sv.serviceId)} style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", display: "inline-flex", padding: 2 }}><X size={14}/></button>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: T.card }}>
                <span style={{ color: T.mutedLight, fontSize: 13, fontWeight: 700 }}>Total</span>
                <span style={{ color: T.success, fontSize: 14, fontWeight: 800 }}>{R$(totalPrice)}</span>
              </div>
            </div>
          )}

          <FSelect label="Pagamento" value={form.payment} onChange={e => setForm(f => ({ ...f, payment: e.target.value }))}>
            {PAYMENT_OPTS.map(p => <option key={p}>{p}</option>)}
          </FSelect>

          <Row>
            <FG label="Data" half>
              <input style={{ ...inputSt, opacity: isAdmin ? 1 : 0.5, cursor: isAdmin ? "text" : "not-allowed" }}
                type="date" value={form.date}
                onChange={isAdmin ? e => setForm(f => ({ ...f, date: e.target.value })) : undefined}
                readOnly={!isAdmin}/>
            </FG>
            <FG label="Horário" half>
              <input style={{ ...inputSt, opacity: isAdmin ? 1 : 0.5, cursor: isAdmin ? "text" : "not-allowed" }}
                type="time" value={form.time}
                onChange={isAdmin ? e => setForm(f => ({ ...f, time: e.target.value })) : undefined}
                readOnly={!isAdmin}/>
            </FG>
          </Row>
          {!isAdmin && (
            <div style={{ color: T.muted, fontSize: 11, marginTop: -10, marginBottom: 12 }}>
              Data e horário definidos automaticamente — somente o admin pode alterar.
            </div>
          )}

          <FArea label="Observações (opcional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}/>

          <Row g="0.5rem" style={{ justifyContent: "flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>
              {saving ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }}/> : <Check size={13}/>} Registrar
            </Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── CLIENTS ───────────────────────────────────────────────────
function ClientsView({ clients, setClients, attendances, services, token, isAdmin, barbershopId }) {
  const [search, setSearch]     = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");
  const [form, setForm]         = useState({ name:"", phone:"", whatsapp:"", birthdate:"", notes:"", points:0 });
  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const filtered = clients.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.phone.includes(search));
  const birthMonth = new Date().getMonth()+1;
  const bdays = clients.filter(c=>c.birthdate&&+c.birthdate.slice(5,7)===birthMonth);
  const getHist = id => attendances.filter(a=>a.clientId===id).sort((a,b)=>b.date.localeCompare(a.date));

  const openAdd = () => { setEditing(null); setForm({ name:"", phone:"", whatsapp:"", birthdate:"", notes:"", points:0 }); setShowModal(true); };
  const openEdit = (c,e) => { e?.stopPropagation(); setEditing(c.id); setForm({...c}); setShowModal(true); };

  const save = async () => {
    if (!form.name) return setErr("Nome é obrigatório.");
    setSaving(true); setErr("");
    try {
      if (editing) {
        await api.update("clients", editing, { name:form.name, phone:form.phone, whatsapp:form.whatsapp, birthdate:form.birthdate||null, notes:form.notes, points:+form.points }, token);
        setClients(cs=>cs.map(c=>c.id===editing?{...form,id:editing,points:+form.points}:c));
      } else {
        const rows = await api.insert("clients", { name:form.name, phone:form.phone, whatsapp:form.whatsapp, birthdate:form.birthdate||null, notes:form.notes, points:+form.points||0, barbershop_id: barbershopId }, token);
        setClients(cs=>[toClient(rows[0]),...cs]);
      }
      setShowModal(false);
    } catch(e){ setErr(e.message); }
    setSaving(false);
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        sub={`${clients.length} clientes${bdays.length>0?` · 🎂 ${bdays.length} aniversariante${bdays.length>1?"s":""} este mês`:""}`}
        right={<Btn onClick={openAdd}><Plus size={15}/>Novo Cliente</Btn>}
      />
      <div style={{ position:"relative", marginBottom:"1rem" }}>
        <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.muted }}/>
        <input placeholder="Buscar por nome ou telefone…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, paddingLeft:"2.5rem" }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:selected?"1fr 360px":"1fr", gap:"1.5rem" }}>
        <Card style={{ padding:0 }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <THead cols={["Nome","Telefone","Pontos","Total Gasto","Visitas",""]}/>
            <tbody>
              {filtered.map(c=>{
                const hist=getHist(c.id), spent=hist.reduce((s,a)=>s+a.price,0), sel=selected?.id===c.id;
                return (
                  <tr key={c.id} onClick={()=>setSelected(sel?null:c)} style={{ borderTop:`1px solid ${T.borderLight}`, cursor:"pointer", background:sel?T.accentGlow:"transparent" }}>
                    <td style={{ padding:"10px 0.75rem", color:T.text, fontWeight:500 }}>{c.name}{bdays.find(b=>b.id===c.id)?" 🎂":""}</td>
                    <td style={{ padding:"10px 0.75rem", color:T.muted }}>{c.phone}</td>
                    <td style={{ padding:"10px 0.75rem" }}><Badge color={T.accent}>{c.points} pts</Badge></td>
                    <td style={{ padding:"10px 0.75rem", color:T.success, fontWeight:600 }}>{R$(spent)}</td>
                    <td style={{ padding:"10px 0.75rem", color:T.muted }}>{hist.length}×</td>
                    <td style={{ padding:"10px 0.75rem", textAlign:"right" }}>
                      {isAdmin && <button onClick={e=>openEdit(c,e)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Edit2 size={13}/></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {selected&&(()=>{
          const hist=getHist(selected.id), spent=hist.reduce((s,a)=>s+a.price,0);
          return (
            <Card>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"1rem" }}>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:T.text }}>{selected.name}</div>
                <div style={{ display:"flex", gap:6 }}>
                  {isAdmin && <button onClick={e=>openEdit(selected,e)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Edit2 size={15}/></button>}
                  <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><X size={16}/></button>
                </div>
              </div>
              <div style={{ fontSize:13, marginBottom:"1rem" }}>
                {selected.phone&&<div style={{ color:T.muted, marginBottom:5, display:"flex", alignItems:"center", gap:6 }}><Phone size={13}/>{selected.phone}</div>}
                {selected.birthdate&&<div style={{ color:T.muted, marginBottom:5 }}>🎂 {fDate(selected.birthdate)}</div>}
                {selected.notes&&<div style={{ color:T.muted, background:T.surface, borderRadius:6, padding:"8px 10px", fontSize:12, marginTop:8 }}>📝 {selected.notes}</div>}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:"1rem" }}>
                {[["PONTOS",selected.points,T.accent],["TOTAL GASTO",R$(spent),T.success],["VISITAS",hist.length+"×",T.text],["TICKET MÉD.",R$(hist.length?spent/hist.length:0),T.info]].map(([l,v,c])=>(
                  <div key={l} style={{ background:T.surface, borderRadius:8, padding:"10px", textAlign:"center" }}>
                    <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, color:c }}>{v}</div>
                    <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>Histórico</div>
              <div style={{ maxHeight:220, overflowY:"auto" }}>
                {hist.slice(0,15).map(a=>{
                  const sv=services.find(s=>s.id===a.serviceId);
                  return <div key={a.id} style={{ borderTop:`1px solid ${T.borderLight}`, padding:"7px 0", display:"flex", justifyContent:"space-between", fontSize:12 }}>
                    <div><div style={{ color:T.text }}>{sv?.name||"—"}</div><div style={{ color:T.muted, fontSize:11 }}>{fDate(a.date)} · {a.time}</div></div>
                    <div style={{ color:T.success, fontWeight:600 }}>{R$(a.price)}</div>
                  </div>;
                })}
              </div>
            </Card>
          );
        })()}
      </div>

      {showModal&&(
        <Modal title={editing?"Editar Cliente":"Novo Cliente"} onClose={()=>setShowModal(false)}>
          <ErrorBar msg={err}/>
          <FInput label="Nome completo" value={form.name} onChange={setF("name")} placeholder="Nome do cliente"/>
          <Row>
            <FG label="Telefone" half><input style={inputSt} value={form.phone} onChange={setF("phone")} placeholder="11999999999"/></FG>
            <FG label="WhatsApp" half><input style={inputSt} value={form.whatsapp} onChange={setF("whatsapp")} placeholder="11999999999"/></FG>
          </Row>
          <Row>
            <FG label="Data de Nascimento" half><input style={inputSt} type="date" value={form.birthdate} onChange={setF("birthdate")}/></FG>
            <FG label="Pontos de fidelidade" half><input style={inputSt} type="number" value={form.points} onChange={setF("points")}/></FG>
          </Row>
          <FArea label="Observações" value={form.notes} onChange={setF("notes")}/>
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Check size={13}/>} {editing?"Atualizar":"Cadastrar"}</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── BARBERS ───────────────────────────────────────────────────
function BarbersView({ barbers, setBarbers, attendances, token, barbershopId }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");
  const [form, setForm]         = useState({ name:"", phone:"", commission:40, status:"active", email:"", password:"" });
  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const save = async () => {
    if (!form.name) return setErr("Nome é obrigatório.");
    if (!editing && form.email && !form.password) return setErr("Preencha a senha para criar o login.");
    if (!editing && form.password && form.password.length < 6) return setErr("Senha deve ter no mínimo 6 caracteres.");
    setSaving(true); setErr("");
    try {
      let userId = editing ? (barbers.find(b=>b.id===editing)?.userId || null) : null;

      if (!editing && form.email && form.password) {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: "POST",
          headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const data = await res.json();
        if (data.error || data.msg) throw new Error(data.error?.message || data.msg || "Erro ao criar login");
        userId = data.user?.id;
      }

      const body = { name:form.name, phone:form.phone, commission:+form.commission, status:form.status, user_id: userId, barbershop_id: barbershopId };

      if (editing) {
        await api.update("barbers", editing, body, token);
        setBarbers(bs=>bs.map(b=>b.id===editing?{...b,...toBarber({...body,id:editing,user_id:userId})}:b));
      } else {
        const rows = await api.insert("barbers", body, token);
        const newBarber = toBarber(rows[0]);
        setBarbers(bs=>[...bs, newBarber]);

        // Vincular perfil via UPSERT — funciona mesmo se o trigger ainda não criou o perfil
        if (userId) {
          // Aguarda o trigger criar o perfil
          await new Promise(r => setTimeout(r, 800));
          // Tenta PATCH primeiro (perfil já existe via trigger)
          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: hdr(token),
            body: JSON.stringify({ barber_id: newBarber.id, role: "barber", barbershop_id: barbershopId }),
          });
          // Se PATCH falhar ou não atualizar nada, faz UPSERT
          if (!patchRes.ok) {
            await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
              method: "POST",
              headers: { ...hdr(token), Prefer: "resolution=merge-duplicates,return=representation" },
              body: JSON.stringify({ id: userId, barber_id: newBarber.id, role: "barber", barbershop_id: barbershopId }),
            });
          }
        }
      }
      setShowModal(false);
    } catch(e){ setErr(e.message); }
    setSaving(false);
  };

  const monthStr = month();
  const monthAtts = attendances.filter(a=>a.date.startsWith(monthStr));

  return (
    <div>
      <PageHeader title="Barbeiros" sub={`${barbers.filter(b=>b.status==="active").length} ativos`}
        right={<Btn onClick={()=>{setEditing(null);setForm({name:"",phone:"",commission:40,status:"active",email:"",password:""});setShowModal(true);}}><Plus size={15}/>Novo Barbeiro</Btn>}
      />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"1rem" }}>
        {barbers.map(b=>{
          const bA=monthAtts.filter(a=>a.barberId===b.id), total=bA.reduce((s,a)=>s+a.price,0);
          return (
            <Card key={b.id} style={{ opacity:b.status==="inactive"?0.55:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:T.accentGlow, border:`1px solid ${T.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:T.accent }}>{b.name.charAt(0)}</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <Badge color={b.status==="active"?T.success:T.muted}>{b.status==="active"?"Ativo":"Inativo"}</Badge>
                  <button onClick={()=>{setEditing(b.id);setForm({...b});setShowModal(true);}} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Edit2 size={14}/></button>
                </div>
              </div>
              <div style={{ fontWeight:600, color:T.text, marginBottom:3 }}>{b.name}</div>
              {b.phone&&<div style={{ fontSize:12, color:T.muted, marginBottom:"1rem", display:"flex", alignItems:"center", gap:5 }}><Phone size={11}/>{b.phone}</div>}
              {b.userId&&<div style={{ fontSize:11, color:T.success+"aa", marginBottom:"0.75rem", display:"flex", alignItems:"center", gap:4 }}><Check size={11}/>Login configurado</div>}
              {!b.userId&&<div style={{ fontSize:11, color:T.muted, marginBottom:"0.75rem" }}>⚠ Sem login configurado</div>}
              <div style={{ borderTop:`1px solid ${T.borderLight}`, paddingTop:"1rem", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                {[["Comissão",b.commission+"%",T.accent,"big"],["Aten. Mês",bA.length,T.text,"big"],["Total Mês",R$(total),T.success,"sm"],["A receber",R$(total*b.commission/100),T.accent,"sm"]].map(([l,v,c,sz])=>(
                  <div key={l}>
                    <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:0.5 }}>{l}</div>
                    <div style={sz==="big"?{fontFamily:"'Bebas Neue', sans-serif",fontSize:26,color:c}:{fontSize:14,fontWeight:600,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {showModal&&(
        <Modal title={editing?"Editar Barbeiro":"Novo Barbeiro"} onClose={()=>setShowModal(false)}>
          <ErrorBar msg={err}/>
          <FInput label="Nome" value={form.name} onChange={setF("name")}/>
          <FInput label="Telefone" value={form.phone} onChange={setF("phone")}/>
          <Row>
            <FG label="Comissão (%)" half><input style={inputSt} type="number" min="0" max="100" value={form.commission} onChange={setF("commission")}/></FG>
            <FSelect label="Status" value={form.status} onChange={setF("status")}><option value="active">Ativo</option><option value="inactive">Inativo</option></FSelect>
          </Row>
          {!editing && (
            <div style={{ borderTop:`1px solid ${T.borderLight}`, paddingTop:"1rem", marginTop:"0.5rem", marginBottom:"1rem" }}>
              <div style={{ fontSize:11, fontWeight:700, color:T.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:"0.75rem" }}>Login de Acesso (opcional)</div>
              <FInput label="E-mail" type="email" value={form.email} onChange={setF("email")} placeholder="barbeiro@email.com"/>
              <FInput label="Senha" type="password" value={form.password} onChange={setF("password")} placeholder="Mínimo 6 caracteres"/>
              <div style={{ background:T.accentGlow, border:`1px solid ${T.accent}33`, borderRadius:8, padding:"0.75rem", fontSize:12, color:T.mutedLight }}>
                💡 Preencha para criar o acesso do barbeiro ao sistema. Deixe em branco para cadastrar só o perfil agora.
              </div>
            </div>
          )}
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Check size={13}/>} {editing?"Atualizar":"Cadastrar"}</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── SERVICES ─────────────────────────────────────────────────
function ServicesView({ services, setServices, token, barbershopId }) {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");
  const [form, setForm]         = useState({ name:"", price:"", duration:30, active:true });
  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const save = async () => {
    if (!form.name||!form.price) return setErr("Nome e preço são obrigatórios.");
    setSaving(true); setErr("");
    try {
      const body = { name:form.name, price:+form.price, duration:+form.duration, active:form.active, barbershop_id: barbershopId };
      if (editing) {
        await api.update("services", editing, body, token);
        setServices(ss=>ss.map(s=>s.id===editing?{...body,id:editing}:s));
      } else {
        const rows = await api.insert("services", body, token);
        setServices(ss=>[...ss, toService(rows[0])]);
      }
      setShowModal(false);
    } catch(e){ setErr(e.message); }
    setSaving(false);
  };

  const toggle = async svc => {
    await api.update("services", svc.id, { active:!svc.active }, token);
    setServices(ss=>ss.map(s=>s.id===svc.id?{...s,active:!s.active}:s));
  };

  const del = async id => {
    await api.remove("services", id, token);
    setServices(ss=>ss.filter(s=>s.id!==id));
  };

  return (
    <div>
      <PageHeader title="Serviços" sub={`${services.filter(s=>s.active).length} serviços ativos`}
        right={<Btn onClick={()=>{setEditing(null);setForm({name:"",price:"",duration:30,active:true});setShowModal(true);}}><Plus size={15}/>Novo Serviço</Btn>}
      />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"1rem" }}>
        {services.map(svc=>(
          <Card key={svc.id} style={{ opacity:svc.active?1:0.5 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.75rem" }}>
              <div style={{ fontSize:16, fontWeight:600, color:T.text }}>{svc.name}</div>
              <div style={{ display:"flex", gap:2 }}>
                <button onClick={()=>{setEditing(svc.id);setForm({...svc});setShowModal(true);}} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Edit2 size={13}/></button>
                <button onClick={()=>del(svc.id)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Trash2 size={13}/></button>
              </div>
            </div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:34, color:T.accent, letterSpacing:1, marginBottom:10, lineHeight:1 }}>{R$(svc.price)}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:12, color:T.muted }}>⏱ {svc.duration} min</span>
              <button onClick={()=>toggle(svc)} style={{ background:svc.active?T.successBg:T.surface, border:`1px solid ${svc.active?T.success+"44":T.border}`, borderRadius:5, padding:"3px 10px", color:svc.active?T.success:T.muted, fontSize:11, fontWeight:700, cursor:"pointer" }}>
                {svc.active?"ATIVO":"INATIVO"}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {showModal&&(
        <Modal title={editing?"Editar Serviço":"Novo Serviço"} onClose={()=>setShowModal(false)}>
          <ErrorBar msg={err}/>
          <FInput label="Nome do Serviço" value={form.name} onChange={setF("name")}/>
          <Row>
            <FG label="Preço (R$)" half><input style={inputSt} type="number" value={form.price} onChange={setF("price")}/></FG>
            <FG label="Duração (min)" half><input style={inputSt} type="number" value={form.duration} onChange={setF("duration")}/></FG>
          </Row>
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Check size={13}/>} {editing?"Atualizar":"Cadastrar"}</Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── FINANCIAL ────────────────────────────────────────────────
function FinancialView({ attendances, expenses, setExpenses, token, barbershopId, barbers = [] }) {
  const todayStr   = today();
  const monthStart = todayStr.substring(0, 7) + "-01";

  const [filterFrom, setFilterFrom] = useState(monthStart);
  const [filterTo,   setFilterTo]   = useState(todayStr);
  const [showModal,  setShowModal]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState("");
  const [form, setForm] = useState({ desc:"", amount:"", date:todayStr, category:"Aluguel" });
  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));

  // Filter by selected date range
  const rangeAtts = attendances.filter(a => a.date >= filterFrom && a.date <= filterTo);
  const rangeExp  = expenses.filter(e => e.date >= filterFrom && e.date <= filterTo);

  const totalRev         = rangeAtts.reduce((s,a) => s + a.price, 0);
  const totalExp         = rangeExp.reduce((s,e) => s + e.amount, 0);
  const totalCommissions = rangeAtts.reduce((s,a) => {
    const b = barbers.find(x => x.id === a.barberId);
    return s + (a.price * (b?.commission || 0) / 100);
  }, 0);
  const profit = totalRev - totalExp - totalCommissions;

  const byPay = {};
  rangeAtts.forEach(a => { byPay[a.payment] = (byPay[a.payment] || 0) + a.price; });

  const handleRefresh = () => {
    const t = today();
    setFilterFrom(t.substring(0, 7) + "-01");
    setFilterTo(t);
  };

  const periodLabel = filterFrom === filterTo
    ? fDate(filterFrom)
    : `${fDate(filterFrom)} → ${fDate(filterTo)}`;

  const save = async () => {
    if (!form.desc || !form.amount) return setErr("Preencha descrição e valor.");
    setSaving(true); setErr("");
    try {
      const rows = await api.insert("expenses", { description:form.desc, amount:+form.amount, date:form.date, category:form.category, barbershop_id: barbershopId }, token);
      setExpenses(es => [toExpense(rows[0]), ...es]);
      setShowModal(false);
      setForm({ desc:"", amount:"", date:today(), category:"Aluguel" });
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  const del = async id => {
    await api.remove("expenses", id, token);
    setExpenses(es => es.filter(e => e.id !== id));
  };

  return (
    <div>
      <PageHeader title="Financeiro" sub={periodLabel}
        right={<Btn onClick={() => setShowModal(true)}><Plus size={15}/>Registrar Despesa</Btn>}
      />

      {/* ── Filtro de período + Atualizar ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.5rem", flexWrap:"wrap" }}>
        <div style={{
          display:"flex", alignItems:"center", gap:8,
          background:T.card, border:`1px solid ${T.border}`,
          borderRadius:10, padding:"8px 14px",
        }}>
          <Calendar size={14} style={{ color:T.muted, flexShrink:0 }} />
          <span style={{ fontSize:12, color:T.muted }}>De</span>
          <input
            type="date" value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            style={{ background:"transparent", border:"none", outline:"none", color:T.text, fontSize:13, cursor:"pointer" }}
          />
          <span style={{ fontSize:12, color:T.muted, margin:"0 2px" }}>até</span>
          <input
            type="date" value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            style={{ background:"transparent", border:"none", outline:"none", color:T.text, fontSize:13, cursor:"pointer" }}
          />
        </div>
        <button
          onClick={handleRefresh}
          style={{
            display:"flex", alignItems:"center", gap:6,
            background:T.accent, color:"#0a0808",
            border:"none", borderRadius:10,
            padding:"9px 16px", fontSize:13, fontWeight:700, cursor:"pointer",
          }}
        >
          <RefreshCw size={13}/>Atualizar
        </button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"1rem", marginBottom:"1.5rem" }}>
        <StatCard
          label="RECEITAS"
          value={R$(totalRev)}
          color={T.success}
          icon={DollarSign}
          sub={`${rangeAtts.length} atendimento${rangeAtts.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="COMISSÕES"
          value={R$(totalCommissions)}
          color={T.info}
          icon={BadgePercent}
          sub={`${barbers.length} barbeiro${barbers.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="DESPESAS"
          value={R$(totalExp)}
          color={T.danger}
          icon={Tag}
          sub={`${rangeExp.length} lançamento${rangeExp.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="LUCRO"
          value={R$(profit)}
          color={profit >= 0 ? T.success : T.danger}
          icon={TrendingUp}
          sub={`Margem: ${totalRev > 0 ? ((profit / totalRev) * 100).toFixed(1) : 0}%`}
        />
      </div>

      {/* ── Tabelas ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
        <Card>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:1.5, color:T.text, marginBottom:"1rem" }}>
            Formas de Pagamento
          </div>
          {Object.entries(byPay).map(([m, t]) => (
            <div key={m} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderTop:`1px solid ${T.borderLight}`, fontSize:13 }}>
              <span style={{ color:T.text }}>{m}</span>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.success, fontWeight:600 }}>{R$(t)}</div>
                <div style={{ fontSize:11, color:T.muted }}>{totalRev > 0 ? ((t / totalRev) * 100).toFixed(1) : 0}%</div>
              </div>
            </div>
          ))}
          {Object.keys(byPay).length === 0 && (
            <div style={{ textAlign:"center", padding:"1.5rem", color:T.muted }}>Sem dados no período</div>
          )}
        </Card>

        <Card>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:1.5, color:T.text, marginBottom:"1rem" }}>
            Despesas
          </div>
          <div style={{ maxHeight:300, overflowY:"auto" }}>
            {expenses.sort((a, b) => b.date.localeCompare(a.date)).map(e => (
              <div key={e.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderTop:`1px solid ${T.borderLight}`, fontSize:13 }}>
                <div>
                  <div style={{ color:T.text }}>{e.desc}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>
                    {fDate(e.date)} · <Badge color={T.muted}>{e.category}</Badge>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:T.danger, fontWeight:600 }}>{R$(e.amount)}</span>
                  <button onClick={() => del(e.id)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div style={{ textAlign:"center", padding:"2rem", color:T.muted }}>Sem despesas cadastradas</div>
            )}
          </div>
        </Card>
      </div>

      {showModal && (
        <Modal title="Registrar Despesa" onClose={() => setShowModal(false)}>
          <ErrorBar msg={err}/>
          <FInput label="Descrição" value={form.desc} onChange={setF("desc")} placeholder="Ex: Aluguel, energia…"/>
          <Row>
            <FG label="Valor (R$)" half><input style={inputSt} type="number" value={form.amount} onChange={setF("amount")}/></FG>
            <FSelect label="Categoria" value={form.category} onChange={setF("category")}>{EXPENSE_CATS.map(c => <option key={c}>{c}</option>)}</FSelect>
          </Row>
          <FG label="Data"><input style={inputSt} type="date" value={form.date} onChange={setF("date")}/></FG>
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>
              {saving ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Check size={13}/>} Salvar
            </Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}


// ── REPORTS VIEW ─────────────────────────────────────────────
function ReportTable({ cols, rows, totalRow }) {
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, marginBottom:20 }}>
      <thead>
        <tr style={{ background:"#f5f5f5" }}>
          {cols.map(c => <th key={c} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600, borderBottom:"1px solid #ddd" }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r,i) => (
          <tr key={i} style={{ background: i%2===1?"#fafafa":"white", borderBottom:"1px solid #eee" }}>
            {r.map((cell,j) => <td key={j} style={{ padding:"8px 10px", ...( cell?.style||{} ) }}>{cell?.val !== undefined ? cell.val : cell}</td>)}
          </tr>
        ))}
        {totalRow && (
          <tr style={{ background:"#f0f0f0", fontWeight:700, borderTop:"2px solid #ddd" }}>
            {totalRow.map((cell,j) => <td key={j} style={{ padding:"8px 10px" }}>{cell}</td>)}
          </tr>
        )}
      </tbody>
    </table>
  );
}

function ReportFooter() {
  return (
    <div className="report-brand-footer" style={{ textAlign:"center", color:"#666", fontSize:11, marginTop:40, paddingTop:10, borderTop:"1px solid #eee" }}>
      Desenvolvido por OzTech SmartControl
    </div>
  );
}

function ReportHeader({ title, sub, selMonth, shop }) {
  const reportAccent = shop?.accent_color || T.accent;
  const reportName = shop?.name || "Oz.Barber";
  const reportLogo =
    shop?.logo_url && shop.logo_url !== "null" && shop.logo_url !== ""
      ? shop.logo_url
      : ozBarberLogo;

  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:`2px solid ${reportAccent}`, paddingBottom:12, marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:14, minWidth:0 }}>
        <div style={{ width:96, height:54, display:"flex", alignItems:"center", justifyContent:"center", overflow:"visible", flexShrink:0 }}>
          <img
            src={reportLogo}
            alt={reportName}
            style={{ maxWidth:96, maxHeight:54, width:"auto", height:"auto", objectFit:"contain", display:"block" }}
            onError={(e) => { e.currentTarget.src = ozBarberLogo; }}
          />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontSize:22, fontWeight:700, fontFamily:"Arial, sans-serif", color:reportAccent, lineHeight:1.1, wordBreak:"break-word" }}>{reportName}</div>
          <div style={{ fontSize:13, color:"#555", marginTop:3 }}>{title}</div>
        </div>
      </div>
      <div style={{ textAlign:"right", fontSize:12, color:"#555", lineHeight:1.7, whiteSpace:"nowrap", marginLeft:16 }}>
        <div>Mês: {selMonth}</div>
        <div>Gerado em: {new Date().toLocaleDateString("pt-BR")}</div>
      </div>
    </div>
  );
}

function RevenueReportContent({ attendances, expenses, barbers = [], selMonth, shop }) {
  const todayStr = new Date().toISOString().slice(0,10);
  const mStr  = selMonth;
  const tAtts = attendances.filter(a => a.date === todayStr);
  const mAtts = attendances.filter(a => a.date.startsWith(mStr));
  const mExp  = expenses.filter(e => e.date.startsWith(mStr));
  const tRev  = tAtts.reduce((s,a)=>s+a.price,0);
  const mRev  = mAtts.reduce((s,a)=>s+a.price,0);
  const mExpT = mExp.reduce((s,e)=>s+e.amount,0);
  const mCommissions = mAtts.reduce((s,a)=>{ const b=barbers.find(x=>x.id===a.barberId); return s+(a.price*(b?.commission||0)/100); },0);
  const profit= mRev - mExpT - mCommissions;
  const byPay = {};
  mAtts.forEach(a=>{byPay[a.payment]=(byPay[a.payment]||0)+a.price;});

  return (
    <div style={{ fontFamily:"Arial, sans-serif", color:"#111", background:"white", padding:28 }}>
      <ReportHeader title="Relatório de Faturamento" selMonth={selMonth} shop={shop} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {[["Atend. Hoje", tAtts.length],["Receita Hoje", R$(tRev)],["Receita Mês", R$(mRev)],["Lucro Mês", R$(profit)]].map(([l,v])=>(
          <div key={l} style={{ border:"1px solid #ddd", borderRadius:6, padding:"10px 14px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#888", textTransform:"uppercase", marginBottom:4 }}>{l}</div>
            <div style={{ fontSize:18, fontWeight:700 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:8, borderBottom:"1px solid #eee", paddingBottom:4 }}>Formas de Pagamento</div>
      <ReportTable
        cols={["Método","Total","% Receita"]}
        rows={Object.entries(byPay).map(([m,v])=>[m, {val:R$(v), style:{fontWeight:600}}, mRev>0?((v/mRev)*100).toFixed(1)+"%" :"0%"])}
      />
      <div style={{ fontSize:14, fontWeight:700, marginBottom:8, borderBottom:"1px solid #eee", paddingBottom:4 }}>Despesas do Mês</div>
      <ReportTable
        cols={["Descrição","Categoria","Data","Valor"]}
        rows={mExp.map(e=>[e.desc, e.category, fDate(e.date), {val:R$(e.amount), style:{fontWeight:600}}])}
        totalRow={["TOTAL DESPESAS","","",R$(mExpT)]}
      />
      <ReportFooter />
    </div>
  );
}

function BarberReportContent({ attendances, services, barbers, selMonth, shop }) {
  const mAtts = attendances.filter(a => a.date.startsWith(selMonth));
  const stats = barbers.filter(b=>b.status==="active").map(b=>{
    const bA = mAtts.filter(a=>a.barberId===b.id);
    const total = bA.reduce((s,a)=>s+a.price,0);
    const sm={}; bA.forEach(a=>{const s=services.find(sv=>sv.id===a.serviceId);if(s)sm[s.name]=(sm[s.name]||0)+1;});
    const top=Object.entries(sm).sort((a,b)=>b[1]-a[1])[0];
    return {b, count:bA.length, total, commission:total*b.commission/100, ticket:bA.length?total/bA.length:0, top:top?top[0]+" ("+top[1]+"×)":"—"};
  }).sort((a,b)=>b.total-a.total);

  return (
    <div style={{ fontFamily:"Arial, sans-serif", color:"#111", background:"white", padding:28 }}>
      <ReportHeader title="Relatório por Barbeiro" selMonth={selMonth} shop={shop} />
      <ReportTable
        cols={["#","Barbeiro","Atend.","Total","Comissão","Ticket Méd.","Serviço Top"]}
        rows={stats.map(({b,count,total,commission,ticket,top},i)=>[
          {val:i+1, style:{color:shop?.accent_color || T.accent, fontWeight:700}},
          {val:b.name, style:{fontWeight:600}},
          count,
          {val:R$(total), style:{fontWeight:700}},
          {val:R$(commission)+" ("+b.commission+"%)", style:{color:shop?.accent_color || T.accent, fontWeight:600}},
          R$(ticket),
          {val:top, style:{color:"#555"}}
        ])}
        totalRow={[
          "TOTAL GERAL","",
          stats.reduce((s,x)=>s+x.count,0),
          R$(stats.reduce((s,x)=>s+x.total,0)),
          R$(stats.reduce((s,x)=>s+x.commission,0)),
          "","",
        ]}
      />
      <ReportFooter />
    </div>
  );
}

function ServiceReportContent({ attendances, services, selMonth, shop }) {
  const mAtts = attendances.filter(a => a.date.startsWith(selMonth));
  const sm={};
  mAtts.forEach(a=>{
    const s=services.find(sv=>sv.id===a.serviceId);
    if(!s) return;
    if(!sm[s.id]) sm[s.id]={name:s.name, price:s.price, count:0, total:0};
    sm[s.id].count++;
    sm[s.id].total+=a.price;
  });
  const rows=Object.values(sm).sort((a,b)=>b.total-a.total);
  const gt=rows.reduce((s,r)=>s+r.total,0);

  return (
    <div style={{ fontFamily:"Arial, sans-serif", color:"#111", background:"white", padding:28 }}>
      <ReportHeader title="Relatório por Serviço" selMonth={selMonth} shop={shop} />
      <ReportTable
        cols={["#","Serviço","Preço Tabela","Qtd.","Total Gerado","% Receita"]}
        rows={rows.map(({name,price,count,total},i)=>[
          {val:i+1, style:{color:shop?.accent_color || T.accent, fontWeight:700}},
          {val:name, style:{fontWeight:600}},
          {val:R$(price), style:{color:"#555"}},
          count+"×",
          {val:R$(total), style:{fontWeight:700}},
          {val:(gt>0?((total/gt)*100).toFixed(1):0)+"%", style:{color:"#555"}}
        ])}
        totalRow={["TOTAL","",rows.reduce((s,r)=>s+r.count,0)+"×", R$(gt),"",""]}
      />
      <ReportFooter />
    </div>
  );
}

function ReportsView({ attendances, clients, services, barbers, expenses, shop }) {
  const [selMonth, setSelMonth] = useState(month());
  const [preview, setPreview]   = useState(null);
  const [printing, setPrinting] = useState(false);

  const mAtts        = attendances.filter(a => a.date.startsWith(selMonth));
  const mExp         = expenses.filter(e => e.date.startsWith(selMonth));
  const mRev         = mAtts.reduce((s,a)=>s+a.price,0);
  const mExpT        = mExp.reduce((s,e)=>s+e.amount,0);
  const mCommissions = mAtts.reduce((s,a)=>{ const b=barbers.find(x=>x.id===a.barberId); return s+(a.price*(b?.commission||0)/100); },0);
  const mProfit      = mRev - mExpT - mCommissions;

  const REPORTS = [
    { id:"revenue",  label:"Faturamento",  desc:"Receitas, despesas, lucro e formas de pagamento", Icon:DollarSign, color:T.success },
    { id:"barbers",  label:"Por Barbeiro",  desc:"Ranking, produção, comissões e ticket médio",      Icon:Award,      color:T.accent  },
    { id:"services", label:"Por Serviço",   desc:"Serviços mais realizados e receita gerada",        Icon:Scissors,   color:T.info    },
  ];

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => { window.print(); setPrinting(false); }, 300);
  };

  const contentMap = {
    revenue:  <RevenueReportContent  attendances={attendances} expenses={expenses}  barbers={barbers}   selMonth={selMonth} shop={shop} />,
    barbers:  <BarberReportContent   attendances={attendances} services={services}  barbers={barbers}   selMonth={selMonth} shop={shop} />,
    services: <ServiceReportContent  attendances={attendances} services={services}  selMonth={selMonth} shop={shop} />,
  };

  return (
    <div>
      <style>{`
        #report-print-area {
          position: absolute;
          left: -9999px;
          top: -9999px;
          visibility: hidden;
        }
        @media print {
          body * { visibility: hidden !important; }
          #report-print-area,
          #report-print-area * { visibility: visible !important; }
          #report-print-area {
            position: fixed !important;
            inset: 0 !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 0 !important;
          }
          .report-brand-footer {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0.6cm !important;
            text-align: center !important;
            border-top: none !important;
            background: white !important;
          }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>

      {preview && (
        <div id="report-print-area">
          {contentMap[preview]}
        </div>
      )}

      <PageHeader title="Relatórios" sub={"Mês: "+selMonth} right={
        <input type="month" value={selMonth} onChange={e=>setSelMonth(e.target.value)}
          style={{ background:T.card, border:"1px solid "+T.border, borderRadius:8, padding:"0.5rem 0.875rem", color:T.text, fontSize:13, outline:"none", fontFamily:"'DM Sans', sans-serif" }}/>
      }/>

      {!preview ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem" }}>
          {REPORTS.map(({id,label,desc,Icon,color})=>(
            <Card key={id} onClick={()=>setPreview(id)} style={{ cursor:"pointer" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"1rem" }}>
                <div style={{ background:color+"18", borderRadius:10, padding:12 }}><Icon size={22} color={color}/></div>
                <div>
                  <div style={{ fontWeight:600, color:T.text, fontSize:15 }}>{label}</div>
                  <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{desc}</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:"1rem" }}>
                {id==="revenue" && [["Receita",R$(mRev)],["Despesas",R$(mExpT)],["Lucro",R$(mProfit)],["Atend.",mAtts.length]].map(([l,v])=>(
                  <div key={l} style={{ background:T.surface, borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase" }}>{l}</div>
                    <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{v}</div>
                  </div>
                ))}
                {id==="barbers" && barbers.filter(b=>b.status==="active").slice(0,4).map(b=>{
                  const bA=mAtts.filter(a=>a.barberId===b.id), total=bA.reduce((s,a)=>s+a.price,0);
                  return <div key={b.id} style={{ background:T.surface, borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.name}</div>
                    <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{R$(total)}</div>
                  </div>;
                })}
                {id==="services" && (()=>{
                  const sm={}; mAtts.forEach(a=>{sm[a.serviceId]=(sm[a.serviceId]||0)+1;});
                  return Object.entries(sm).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([sid,n])=>{
                    const s=services.find(sv=>sv.id===+sid);
                    return s?<div key={sid} style={{ background:T.surface, borderRadius:6, padding:"8px 10px" }}>
                      <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.name}</div>
                      <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{n}×</div>
                    </div>:null;
                  });
                })()}
              </div>
              <Btn style={{ width:"100%", justifyContent:"center" }}><FileText size={14}/>Visualizar e Imprimir</Btn>
            </Card>
          ))}
        </div>
      ) : (
        <div>
          <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1.25rem" }}>
            <Btn variant="ghost" onClick={()=>setPreview(null)}><X size={14}/>Voltar</Btn>
            <Btn onClick={handlePrint} disabled={printing}>
              {printing ? <RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/> : <Download size={14}/>}
              Imprimir / Salvar PDF
            </Btn>
          </div>
          <Card style={{ background:"white", color:"black" }}>
            {contentMap[preview]}
          </Card>
        </div>
      )}
    </div>
  );
}



// ── CONFIGURAÇÕES DA BARBEARIA ────────────────────────────────
const BRAND_COLOR_PRESETS = [
  { label: "Azul", hex: "#4db8ff" },
  { label: "Verde", hex: "#43d18a" },
  { label: "Laranja", hex: "#f59e0b" },
  { label: "Roxo", hex: "#a78bfa" },
  { label: "Rosa", hex: "#f472b6" },
  { label: "Vermelho", hex: "#f07070" },
  { label: "Branco", hex: "#ece8e0" },
];

const uploadBrandLogo = async (tok, file, shopId) => {
  if (!file) return null;

  const rawExt = file.name.split(".").pop() || "png";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${shopId}/logo-admin-${Date.now()}.${ext}`;

  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/logos/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${tok}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
      "cache-control": "3600",
    },
    body: file,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || "Erro no upload da logo.");
  }

  return `${SUPABASE_URL}/storage/v1/object/public/logos/${path}?v=${Date.now()}`;
};

function SettingsView({ token, shop, onShopUpdated }) {
  const [name, setName] = useState(shop?.name || "");
  const [phone, setPhone] = useState(shop?.phone || "");
  const [address, setAddress] = useState(shop?.address || "");
  const [whatsapp, setWhatsapp] = useState(shop?.whatsapp || "");
  const [accent, setAccent] = useState(() => normalizeHex(shop?.accent_color));
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    setName(shop?.name || "");
    setPhone(shop?.phone || "");
    setAddress(shop?.address || "");
    setWhatsapp(shop?.whatsapp || "");
    setAccent(normalizeHex(shop?.accent_color));
    setLogoFile(null);
    setLogoPreview("");
    setErr("");
    setOk("");
  }, [shop?.id, shop?.name, shop?.phone, shop?.address, shop?.whatsapp, shop?.accent_color]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview("");
      return;
    }

    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const currentLogo = logoPreview || shop?.logo_url || "";
  const hasLogo = currentLogo && currentLogo !== "null";

  const handleSave = async () => {
    if (!shop?.id) {
      setErr("Barbearia não encontrada. Saia e entre novamente.");
      return;
    }

    if (!name.trim()) {
      setErr("Informe o nome da barbearia.");
      return;
    }

    setSaving(true);
    setErr("");
    setOk("");

    try {
      let logoUrl = shop?.logo_url || null;

      if (logoFile) {
        logoUrl = await uploadBrandLogo(token, logoFile, shop.id);
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/oz_update_barbershop_branding`, {
        method: "POST",
        headers: hdr(token),
        body: JSON.stringify({
          p_barbershop_id: shop.id,
          p_name: name.trim(),
          p_phone: phone.trim() || null,
          p_address: address.trim() || null,
          p_whatsapp: whatsapp.trim() || null,
          p_accent_color: normalizeHex(accent),
          p_logo_url: logoUrl || null,
        }),
      });

      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.message || "Erro ao salvar configurações.");
      }

      const updatedShop = await r.json().catch(() => null);

      if (!updatedShop?.id) {
        throw new Error("Configurações enviadas, mas a barbearia não foi atualizada.");
      }

      applyTenantTheme(updatedShop);
      onShopUpdated?.(updatedShop);
      setLogoFile(null);
      setOk("Configurações salvas com sucesso.");
    } catch (e) {
      console.error(e);
      setErr(e.message || "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        sub="Gerencie os dados e a identidade visual da sua barbearia"
        right={
          <Btn onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }} /> : <Check size={14} />}
            {saving ? "Salvando..." : "Salvar alterações"}
          </Btn>
        }
      />

      <Card style={{ marginBottom:"1.25rem" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.25rem" }}>
          <div style={{ background:T.accentGlow, borderRadius:12, padding:10, display:"flex" }}>
            <Scissors size={19} color={T.accent} />
          </div>
          <div>
            <div style={{ color:T.text, fontWeight:800, fontSize:15 }}>Dados da barbearia</div>
            <div style={{ color:T.muted, fontSize:12, marginTop:2 }}>Atualize as informações principais exibidas no ambiente administrativo.</div>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:"1rem" }}>
          <FG label="Nome da barbearia">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Barbearia Mauá"
              style={inputSt}
            />
          </FG>

          <FG label="Telefone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              style={inputSt}
            />
          </FG>

          <FG label="WhatsApp">
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="(11) 99999-9999"
              style={inputSt}
            />
          </FG>

          <FG label="Endereço">
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade"
              style={inputSt}
            />
          </FG>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1.1fr) minmax(320px, .9fr)", gap:"1.25rem", alignItems:"start" }}>
        <Card>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.25rem" }}>
            <div style={{ background:T.accentGlow, borderRadius:12, padding:10, display:"flex" }}>
              <Image size={19} color={T.accent} />
            </div>
            <div>
              <div style={{ color:T.text, fontWeight:800, fontSize:15 }}>Logo da barbearia</div>
              <div style={{ color:T.muted, fontSize:12, marginTop:2 }}>Atualize a marca que aparece no menu lateral e ambiente do cliente.</div>
            </div>
          </div>

          <div
            style={{
              border:`1px dashed ${T.border}`,
              background:T.surface,
              borderRadius:14,
              padding:"1.25rem",
              display:"flex",
              alignItems:"center",
              gap:"1rem",
              flexWrap:"wrap",
            }}
          >
            <div
              style={{
                width:110,
                height:110,
                borderRadius:18,
                background:T.card,
                border:`1px solid ${T.border}`,
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                overflow:"hidden",
                flexShrink:0,
              }}
            >
              {hasLogo ? (
                <img src={currentLogo} alt="Logo da barbearia" style={{ width:"100%", height:"100%", objectFit:"contain", padding:8 }} />
              ) : (
                <Image size={28} color={T.muted} />
              )}
            </div>

            <div style={{ flex:1, minWidth:220 }}>
              <div style={{ color:T.text, fontWeight:800, marginBottom:6 }}>
                {logoFile ? logoFile.name : "Selecionar nova logo"}
              </div>
              <div style={{ color:T.muted, fontSize:12, lineHeight:1.5, marginBottom:12 }}>
                Formatos recomendados: PNG, JPG, WEBP ou SVG. Dê preferência para imagem quadrada ou horizontal com fundo transparente.
              </div>

              <label
                style={{
                  display:"inline-flex",
                  alignItems:"center",
                  gap:8,
                  background:T.card,
                  border:`1px solid ${T.border}`,
                  color:T.text,
                  borderRadius:10,
                  padding:"0.65rem 0.95rem",
                  cursor:"pointer",
                  fontSize:13,
                  fontWeight:800,
                }}
              >
                <Upload size={14} />
                Escolher arquivo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                  style={{ display:"none" }}
                />
              </label>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.25rem" }}>
            <div style={{ background:`${accent}18`, borderRadius:12, padding:10, display:"flex" }}>
              <Palette size={19} color={accent} />
            </div>
            <div>
              <div style={{ color:T.text, fontWeight:800, fontSize:15 }}>Cor principal</div>
              <div style={{ color:T.muted, fontSize:12, marginTop:2 }}>Define o destaque visual do ambiente da barbearia.</div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:10, marginBottom:"1rem" }}>
            {BRAND_COLOR_PRESETS.map((c) => {
              const active = normalizeHex(accent) === c.hex;
              return (
                <button
                  key={c.hex}
                  onClick={() => setAccent(c.hex)}
                  style={{
                    border:`1px solid ${active ? c.hex : T.border}`,
                    background: active ? `${c.hex}18` : T.surface,
                    color: active ? c.hex : T.mutedLight,
                    borderRadius:12,
                    padding:"0.75rem 0.45rem",
                    cursor:"pointer",
                    fontSize:11,
                    fontWeight:800,
                    fontFamily:"'DM Sans', sans-serif",
                    display:"flex",
                    flexDirection:"column",
                    alignItems:"center",
                    gap:7,
                  }}
                >
                  <span style={{ width:24, height:24, borderRadius:999, background:c.hex, boxShadow:`0 0 14px ${c.hex}55` }} />
                  {c.label}
                </button>
              );
            })}
          </div>

          <FG label="Cor personalizada">
            <div style={{ display:"flex", gap:10 }}>
              <input
                type="color"
                value={normalizeHex(accent)}
                onChange={(e) => setAccent(e.target.value)}
                style={{
                  width:54,
                  height:42,
                  border:"none",
                  background:"transparent",
                  cursor:"pointer",
                }}
              />
              <input
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="#4db8ff"
                style={inputSt}
              />
            </div>
          </FG>

          <div style={{ marginTop:"1rem", border:`1px solid ${T.border}`, borderRadius:14, overflow:"hidden" }}>
            <div style={{ background:`linear-gradient(90deg, ${normalizeHex(accent)}, ${normalizeHex(accent)}55)`, height:8 }} />
            <div style={{ padding:"1rem", background:T.surface }}>
              <div style={{ color:T.text, fontWeight:800, marginBottom:4 }}>Prévia</div>
              <div style={{ color:T.muted, fontSize:12 }}>Botões, destaques e alguns elementos do painel usarão esta cor.</div>
              <button
                type="button"
                style={{
                  marginTop:12,
                  background:normalizeHex(accent),
                  color:"#08090c",
                  border:"none",
                  borderRadius:10,
                  padding:"0.65rem 1rem",
                  fontWeight:900,
                  cursor:"default",
                  fontFamily:"'DM Sans', sans-serif",
                }}
              >
                Botão de exemplo
              </button>
            </div>
          </div>
        </Card>
      </div>

      {(err || ok) && (
        <div
          style={{
            marginTop:"1rem",
            background: err ? T.dangerBg : T.successBg,
            color: err ? T.danger : T.success,
            border:`1px solid ${err ? T.danger : T.success}44`,
            borderRadius:12,
            padding:"0.85rem 1rem",
            fontSize:13,
            fontWeight:700,
          }}
        >
          {err || ok}
        </div>
      )}
    </div>
  );
}



// ── SIDEBAR ──────────────────────────────────────────────────
function Sidebar({ view, setView, collapsed, setCollapsed, isAdmin, isSuperAdmin, userName, onLogout, shop }) {
  const nav = isSuperAdmin
    ? [
        { id:"superadmin_dashboard",      label:"Dashboard",     Icon:LayoutDashboard, desc:"Visão geral" },
        { id:"superadmin_clients",        label:"Clientes Ativos", Icon:Users,         desc:"Ativos" },
        { id:"superadmin_finance",        label:"Financeiro",    Icon:DollarSign,     desc:"Receita" },
        { id:"superadmin_subscriptions",  label:"Assinaturas",   Icon:CreditCard,     desc:"Cobrança" },
        { id:"superadmin_courtesy",       label:"Cortesias",     Icon:Gift,           desc:"Acessos" },
        { id:"superadmin_alerts",         label:"Alertas",       Icon:Bell,           desc:"Eventos" },
        { id:"superadmin_analytics",      label:"Analytics",     Icon:TrendingUp,     desc:"Inteligência" },
      ]
    : [
        { id:"dashboard",   label:"Dashboard",    Icon:LayoutDashboard },
        { id:"attendances", label:"Atendimentos",  Icon:Scissors },
        { id:"clients",     label:"Clientes",      Icon:Users },
        ...(isAdmin ? [
          { id:"barbers",   label:"Barbeiros",     Icon:Award },
          { id:"services",  label:"Serviços",      Icon:Tag },
          { id:"financial", label:"Financeiro",    Icon:DollarSign },
          { id:"reports",   label:"Relatórios",    Icon:FileText },
          { id:"settings",  label:"Configurações", Icon:Settings },
          { id:"meuPlano",  label:"Meu Plano",     Icon:Shield },
        ] : []),
      ];

  const shopName = isSuperAdmin ? "Oz.Barber" : (shop?.name || "Oz.Barber");

  const isOzBarber =
    isSuperAdmin ||
    !shop?.logo_url ||
    shop?.logo_url === "" ||
    shop?.logo_url === "null";

  const logoUrl = isOzBarber
    ? ozBarberLogo
    : shop.logo_url;

  return (
    <aside
      style={{
        width: collapsed ? 76 : (isSuperAdmin ? 282 : 255),
        background: isSuperAdmin
          ? "linear-gradient(180deg, #0f1018 0%, #0b0b11 100%)"
          : T.sidebar,
        borderRight: `1px solid ${T.border}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        transition: "width .22s ease",
        position: "relative",
        boxShadow: isSuperAdmin ? "18px 0 60px rgba(0,0,0,.18)" : "none",
      }}
    >
      <div
        style={{
          padding: collapsed ? "1.15rem 0.75rem" : (isSuperAdmin ? "1.25rem" : "1rem 0.85rem 1.2rem"),
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : (isSuperAdmin ? "space-between" : "center"),
          minHeight: isSuperAdmin ? 140 : 150,
          position: "relative",
        }}
      >
        {!collapsed && (
          isSuperAdmin ? (
            <div
              style={{
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                minWidth:0,
                flex:1,
                width:"100%",
                padding:"0.15rem 2.35rem 0.15rem 0.35rem",
              }}
            >
              <img
                src={ozBarberLogo}
                alt="Oz.Barber"
                style={{
                  width:"100%",
                  maxWidth:200,
                  height:"auto",
                  maxHeight:120,
                  objectFit:"contain",
                  display:"block",
                  filter:`drop-shadow(0 0 18px ${T.accent}22)`,
                }}
              />
            </div>
          ) : (
            <div
              style={{
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                flexDirection:"column",
                gap:8,
                minWidth:0,
                flex:1,
                width:"100%",
                textAlign:"center",
              }}
            >
              <div
                style={{
                  width:80,
                  height:80,
                  minWidth:80,
                  borderRadius:16,
                  background:"transparent",
                  border:"none",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  overflow:"visible",
                  flexShrink:0,
                  padding:0,
                  boxShadow:"none",
                }}
              >
                <img src={logoUrl} alt={shopName} style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
              </div>

              <div
                style={{
                  minWidth:0,
                  width:"100%",
                  display:"flex",
                  flexDirection:"column",
                  alignItems:"center",
                }}
              >
                <div
                  style={{
                    fontFamily:"'Bebas Neue', sans-serif",
                    fontSize:18,
                    letterSpacing:1.25,
                    color:T.text,
                    lineHeight:1.05,
                    whiteSpace:"normal",
                    overflow:"visible",
                    textOverflow:"clip",
                    maxWidth:205,
                    textAlign:"center",
                    wordBreak:"break-word",
                  }}
                >
                  {shopName}
                </div>
                <div
                  style={{
                    fontSize:10,
                    color:T.muted,
                    textTransform:"uppercase",
                    letterSpacing:1,
                    marginTop:5,
                    whiteSpace:"nowrap",
                    overflow:"hidden",
                    textOverflow:"ellipsis",
                    maxWidth:205,
                    textAlign:"center",
                  }}
                >
                  Ambiente privado
                </div>
              </div>
            </div>
          )
        )}

        {collapsed && (
          <div
            style={{
              width:50,
              height:50,
              minWidth:50,
              borderRadius:16,
              background:isSuperAdmin ? `${T.accent}14` : "transparent",
              border:isSuperAdmin ? `1px solid ${T.accent}24` : "none",
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              overflow:"visible",
              padding:0,
            }}
          >
            <img src={logoUrl} alt={shopName} style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
          </div>
        )}

        {!collapsed && (
          <button
            onClick={()=>setCollapsed(true)}
            style={{
              background:isSuperAdmin ? `${T.surface}` : "rgba(0,0,0,.18)",
              border:isSuperAdmin ? `1px solid ${T.border}` : `1px solid ${T.border}`,
              color:T.muted,
              cursor:"pointer",
              display:"flex",
              width:isSuperAdmin ? 34 : 32,
              height:isSuperAdmin ? 34 : 32,
              alignItems:"center",
              justifyContent:"center",
              borderRadius:10,
              position: isSuperAdmin ? "static" : "absolute",
              top: isSuperAdmin ? "auto" : 18,
              right: isSuperAdmin ? "auto" : 12,
            }}
          >
            <Menu size={18}/>
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={()=>setCollapsed(false)}
          style={{
            margin:"0.85rem auto 0",
            background:T.surface,
            border:`1px solid ${T.border}`,
            color:T.muted,
            width:36,
            height:32,
            borderRadius:10,
            cursor:"pointer",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
          }}
        >
          <Menu size={16}/>
        </button>
      )}

      {!collapsed && isSuperAdmin && (
        <div
          style={{
            margin: "1rem 1rem 0",
            padding: "0.85rem",
            borderRadius: 16,
            background: "rgba(77,184,255,.08)",
            border: `1px solid ${T.accent}22`,
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
            <Lock size={13} color={T.accent} />
            <span style={{ color:T.accent, fontSize:11, fontWeight:800, letterSpacing:.8, textTransform:"uppercase" }}>
              Super Admin
            </span>
          </div>
          <div style={{ color:T.mutedLight, fontSize:11, lineHeight:1.45 }}>
            Controle global da plataforma.
          </div>
        </div>
      )}

      <nav
        style={{
          flex:1,
          padding: isSuperAdmin ? "1rem 0.85rem" : "1rem 0.65rem",
          overflowY:"auto",
        }}
      >
        {nav.map(({id,label,Icon,desc}) => {
          const active = view === id;

          return (
            <button
              key={id}
              onClick={()=>setView(id)}
              title={collapsed ? label : undefined}
              style={{
                width:"100%",
                position:"relative",
                display:"flex",
                alignItems:"center",
                justifyContent:collapsed?"center":"flex-start",
                gap: isSuperAdmin ? 12 : 10,
                padding:collapsed ? "0.82rem 0" : (isSuperAdmin ? "0.82rem 0.9rem" : "0.75rem 0.8rem"),
                marginBottom: isSuperAdmin ? 8 : 4,
                borderRadius: isSuperAdmin ? 14 : 9,
                border: isSuperAdmin
                  ? `1px solid ${active ? `${T.accent}40` : "transparent"}`
                  : "none",
                background: active
                  ? (isSuperAdmin ? `linear-gradient(90deg, ${T.accent}18, rgba(77,184,255,.06))` : T.accentGlow)
                  : "transparent",
                color: active ? T.accent : T.mutedLight,
                cursor:"pointer",
                fontFamily:"'DM Sans', sans-serif",
                fontSize:13,
                fontWeight: active ? 800 : 600,
                textAlign:"left",
                transition:"all .18s ease",
                boxShadow: active && isSuperAdmin ? `0 10px 30px ${T.accent}08` : "none",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = isSuperAdmin ? "rgba(255,255,255,.035)" : T.surface;
                  e.currentTarget.style.color = T.text;
                  e.currentTarget.style.transform = "translateX(2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = T.mutedLight;
                  e.currentTarget.style.transform = "translateX(0)";
                }
              }}
            >
              {active && isSuperAdmin && !collapsed && (
                <span
                  style={{
                    position:"absolute",
                    left:-1,
                    top:"50%",
                    transform:"translateY(-50%)",
                    width:3,
                    height:24,
                    borderRadius:999,
                    background:T.accent,
                    boxShadow:`0 0 18px ${T.accent}`,
                  }}
                />
              )}

              <span
                style={{
                  width: isSuperAdmin ? 34 : "auto",
                  height: isSuperAdmin ? 34 : "auto",
                  borderRadius: isSuperAdmin ? 12 : 0,
                  display:"inline-flex",
                  alignItems:"center",
                  justifyContent:"center",
                  background: isSuperAdmin
                    ? (active ? `${T.accent}18` : "rgba(255,255,255,.03)")
                    : "transparent",
                  border: isSuperAdmin ? `1px solid ${active ? `${T.accent}25` : "rgba(255,255,255,.04)"}` : "none",
                  flexShrink:0,
                }}
              >
                <Icon size={17}/>
              </span>

              {!collapsed && (
                <span style={{ minWidth:0, flex:1 }}>
                  <span style={{ display:"block", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                    {label}
                  </span>
                  {isSuperAdmin && desc && (
                    <span
                      style={{
                        display:"block",
                        color: active ? `${T.accent}aa` : T.muted,
                        fontSize:10,
                        fontWeight:600,
                        marginTop:2,
                        whiteSpace:"nowrap",
                        overflow:"hidden",
                        textOverflow:"ellipsis",
                      }}
                    >
                      {desc}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div
        style={{
          padding:collapsed?"0.85rem 0.75rem":"1rem",
          borderTop:`1px solid ${T.border}`,
          background:isSuperAdmin ? "rgba(255,255,255,.01)" : "transparent",
        }}
      >
        {!collapsed && (
          <div
            style={{
              marginBottom:"0.85rem",
              minWidth:0,
              padding:isSuperAdmin ? "0.75rem" : 0,
              borderRadius:isSuperAdmin ? 14 : 0,
              background:isSuperAdmin ? "rgba(255,255,255,.025)" : "transparent",
              border:isSuperAdmin ? `1px solid rgba(255,255,255,.04)` : "none",
            }}
          >
            <div style={{ fontSize:11, color:T.muted, marginBottom:3 }}>Logado como</div>
            <div style={{ fontSize:12, color:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{userName}</div>
          </div>
        )}

        <button
          onClick={onLogout}
          title="Sair"
          style={{
            width:"100%",
            display:"flex",
            alignItems:"center",
            justifyContent:collapsed?"center":"flex-start",
            gap:8,
            padding:"0.72rem 0.75rem",
            borderRadius:12,
            border:`1px solid ${T.border}`,
            background:T.surface,
            color:T.mutedLight,
            cursor:"pointer",
            fontSize:12,
            fontWeight:700,
            fontFamily:"'DM Sans', sans-serif",
            transition:"all .18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = `${T.danger}55`;
            e.currentTarget.style.color = T.danger;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
            e.currentTarget.style.color = T.mutedLight;
          }}
        >
          <LogOut size={15}/>
          {!collapsed && "Sair"}
        </button>
      </div>
    </aside>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
const CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  ::-webkit-scrollbar{width:5px;height:5px}
  ::-webkit-scrollbar-track{background:transparent}
  ::-webkit-scrollbar-thumb{background:${T.border};border-radius:3px}
  input[type=date]::-webkit-calendar-picker-indicator,
  input[type=time]::-webkit-calendar-picker-indicator{filter:invert(0.4) sepia(1) saturate(0.5)}
  select option{background:${T.surface}}
  input::placeholder,textarea::placeholder{color:${T.muted}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
`;


const safeLoadAuth = () => {
  try {
    const raw = localStorage.getItem("ozbarber_auth");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const safeSaveAuth = (authData) => {
  try {
    if (authData) localStorage.setItem("ozbarber_auth", JSON.stringify(authData));
    else localStorage.removeItem("ozbarber_auth");
  } catch {}
};

export default function App() {

  const isResetPasswordRoute =
    window.location.pathname === "/reset-password" ||
    window.location.hash.includes("type=recovery") ||
    window.location.hash.includes("access_token") ||
    window.location.search.includes("type=recovery") ||
    window.location.search.includes("code=");

  if (isResetPasswordRoute) {
    return <ResetPassword />;
  }

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [auth,         setAuth]         = useState(() => safeLoadAuth());
  const [dataLoaded,   setDataLoaded]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [view,         setView]         = useState("dashboard");
  const [collapsed,    setCollapsed]    = useState(false);
  const [showPlans,      setShowPlans]      = useState(false);
  const [expiredMsg,     setExpiredMsg]     = useState("");
  const [postPaymentPlan, setPostPaymentPlan] = useState(null); // plano pago recentemente por usuário sem conta
  const [courtesyEmail,setCourtesyEmail]= useState(null); // e-mail validado como cortesia
  const [shop,         setShop]         = useState(null);

  const [clients,     setClients]     = useState([]);
  const [services,    setServices]    = useState([]);
  const [barbers,     setBarbers]     = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [expenses,    setExpenses]    = useState([]);

  useEffect(() => {
    let mounted = true;

    const applyAuth = async (sessionData) => {
      if (!mounted || !sessionData?.access_token || !sessionData?.user?.id) return;

      try {
        const existingProfile = await api.getProfile(sessionData.user.id, sessionData.access_token);

        // Usuário recém-criado pelo link de cortesia pode ainda não ter profile/barbearia.
        // Mesmo assim, mantemos a sessão ativa e enviamos para o Onboarding.
        const profile = existingProfile || {
          id: sessionData.user.id,
          role: "admin",
          barbershop_id: null,
          is_onboarding_pending: true,
        };

        const authData = {
          token: sessionData.access_token,
          access_token: sessionData.access_token,
          user: sessionData.user,
          profile,
        };

        safeSaveAuth(authData);
        setAuth(authData);
        setSession({ access_token: sessionData.access_token, user: sessionData.user, profile });
        setUser(sessionData.user);
      } catch (e) {
        console.error("Erro ao restaurar sessão:", e);
      }
    };

    const saved = safeLoadAuth();
    if (saved?.token || saved?.access_token) {
      const normalized = {
        ...saved,
        token: saved.token || saved.access_token,
        access_token: saved.access_token || saved.token,
      };
      setAuth(normalized);
      setSession({ access_token: normalized.access_token, user: normalized.user, profile: normalized.profile });
      setUser(normalized.user || null);
    }

    supabase.auth.getSession().then(({ data }) => {
      applyAuth(data?.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        applyAuth(newSession);
      } else {
        safeSaveAuth(null);
        setAuth(null);
        setSession(null);
        setUser(null);
      }
    });

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  // Detecta retorno do Mercado Pago (?payment=success&plan=...)
  useEffect(() => {
    const params  = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const plan    = params.get("plan");

    if (payment === "success" && plan) {
      window.history.replaceState(null, "", window.location.pathname);
      setShowPlans(false);
      setExpiredMsg("");
      // Usuário sem conta → direciona para cadastro pós-pagamento
      // Usuário com conta (renovação) → força recarga de dados
      setPostPaymentPlan(plan);
      setDataLoaded(false);
    } else if (payment === "failure") {
      window.history.replaceState(null, "", window.location.pathname);
      setShowPlans(true);
    }
  }, []);

  const loadData = useCallback(async (tok, profile) => {
    setLoading(true);
    setDataLoaded(false);

    try {
      const isSuperAdmin =
        profile?.is_super_admin === true ||
        profile?.role === "super_admin";

      // Super admin não deve carregar dados operacionais/financeiros das barbearias.
      // Isso evita loop em "CARREGANDO" quando as RLS bloqueiam essas tabelas.
      if (isSuperAdmin) {
        resetTenantTheme();
        setShop(null);
        setClients([]);
        setServices([]);
        setBarbers([]);
        setAttendances([]);
        setExpenses([]);
        setView("superadmin_dashboard");
        setDataLoaded(true);
        return;
      }

      const isAdm = profile.role === "admin";
      const shopId = profile.barbershop_id;

      if (!shopId) {
        throw new Error("Perfil sem barbershop_id. Finalize o cadastro da barbearia.");
      }

      // Bloqueio efetivo: revogação/expiração precisa ser validada também em sessão restaurada.
      const accessStatus = await checkCurrentUserAccess(tok, profile);
      if (!accessStatus?.has_access) {
        setExpiredMsg(accessDeniedMessage(accessStatus?.reason));
        setShowPlans(true);
        setDataLoaded(true);
        return;
      }

      const ensureArray = (value) => Array.isArray(value) ? value : [];

      const shopFilter = shopId ? `barbershop_id=eq.${shopId}` : "";
      const withShop = (qs) => shopFilter ? `${qs}&${shopFilter}` : qs;

      const attQuery = isAdm
        ? withShop("select=*&order=date.desc,time.desc")
        : withShop(`select=*&barber_id=eq.${profile.barber_id}&order=date.desc,time.desc`);

      const [shopRows, brs, cls, svcs, atts, exps] = await Promise.all([
        api.list("barbershops", `id=eq.${shopId}&select=*`, tok),
        api.list("barbers",     withShop("select=*&order=name"), tok),
        api.list("clients",     withShop("select=*&order=name"), tok),
        api.list("services",    withShop("select=*&order=name"), tok),
        api.list("attendances", attQuery, tok),
        isAdm ? api.list("expenses", withShop("select=*&order=date.desc"), tok) : Promise.resolve([]),
      ]);

      const currentShop = ensureArray(shopRows)[0] || null;
      setShop(currentShop);
      applyTenantTheme(currentShop);

      setBarbers(ensureArray(brs).map(toBarber));
      setClients(ensureArray(cls).map(toClient));
      setServices(ensureArray(svcs).map(toService));
      setAttendances(ensureArray(atts).map(toAtt));
      setExpenses(ensureArray(exps).map(toExpense));
      setDataLoaded(true);
    } catch(e) {
      console.error(e);
      setDataLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const onLogin = useCallback(async (authData) => {
    const normalizedAuth = {
      ...authData,
      token: authData.token || authData.access_token,
      access_token: authData.access_token || authData.token,
    };

    safeSaveAuth(normalizedAuth);
    setAuth(normalizedAuth);
    setSession({ access_token: normalizedAuth.access_token, user: normalizedAuth.user, profile: normalizedAuth.profile });
    setUser(normalizedAuth.user || null);

    // Verifica acesso ativo (super admin sempre passa). Agora considera cortesia revogada por e-mail/barbearia.
    if (!normalizedAuth.profile?.is_super_admin && normalizedAuth.profile?.role !== "super_admin") {
      const accessStatus = await checkCurrentUserAccess(normalizedAuth.token, normalizedAuth.profile);
      if (!accessStatus?.has_access) {
        setExpiredMsg(accessDeniedMessage(accessStatus?.reason));
        setShowPlans(true);
        setLoading(false);
        return;
      }
    }
    await loadData(normalizedAuth.token, normalizedAuth.profile);
  }, [loadData]);

  // Carrega dados toda vez que auth muda e dataLoaded ainda é false.
  // Isso resolve tanto o refresh da página quanto o retorno pós-pagamento.
  useEffect(() => {
    if (auth?.token && auth?.profile?.barbershop_id && !dataLoaded && !showPlans) {
      loadData(auth.token, auth.profile);
    }
  }, [auth, dataLoaded, showPlans, loadData]);

  const onLogout = async () => {
    await supabase.auth.signOut();
    safeSaveAuth(null);
    setAuth(null);
    setSession(null);
    setUser(null);
    setShop(null);
    resetTenantTheme();
    setClients([]);
    setServices([]);
    setBarbers([]);
    setAttendances([]);
    setExpenses([]);
    setDataLoaded(false);
    setView("dashboard");
    setShowPlans(false);
    setExpiredMsg("");
  };

  const checkoutAuth = auth || safeLoadAuth() || (session?.access_token ? {
    token: session.access_token,
    access_token: session.access_token,
    user: user || session.user,
    profile: session.profile,
  } : null);

  // Tela de planos (antes do login ou assinatura expirada)
  if (showPlans) return (
    <PlansView
      onBack={() => { if (expiredMsg) { onLogout(); } else { setShowPlans(false); setExpiredMsg(""); } }}
      expiredMessage={expiredMsg}
      token={checkoutAuth?.token || checkoutAuth?.access_token}
      user={checkoutAuth?.user}
      profile={checkoutAuth?.profile}
      authData={checkoutAuth}
      session={{ access_token: checkoutAuth?.token || checkoutAuth?.access_token, user: checkoutAuth?.user, profile: checkoutAuth?.profile }}
    />
  );

  // E-mail de cortesia validado mas usuário ainda não autenticado → vai direto para o cadastro
  if (!auth && courtesyEmail) return (
    <><style>{CSS}</style>
      <Onboarding onComplete={onLogin} courtesyEmail={courtesyEmail} />
    </>
  );

  // Retorno do Mercado Pago com pagamento aprovado e usuário ainda sem conta → cadastro guiado
  if (!auth && postPaymentPlan) return (
    <><style>{CSS}</style>
      <Onboarding
        onComplete={(authData) => { setPostPaymentPlan(null); onLogin(authData); }}
        postPayment={true}
        postPaymentPlan={postPaymentPlan}
      />
    </>
  );

  if (!auth) return <><style>{CSS}</style><LoginView onLogin={onLogin} onShowPlans={() => setShowPlans(true)} /></>;

  const isSuperAdmin =
    auth.profile?.is_super_admin === true ||
    auth.profile?.role === "super_admin";

  // Usuário logado mas sem barbearia → onboarding.
  // Super admin pode entrar sem barbershop_id porque acessa apenas o painel administrativo.
  if (!auth.profile?.barbershop_id && !isSuperAdmin) {
    return (
      <Onboarding
        onComplete={onLogin}
        courtesyEmail={courtesyEmail || auth.user?.email || ""}
        initialToken={auth.token || auth.access_token}
        initialUser={auth.user}
        initialEmail={auth.user?.email || courtesyEmail || ""}
      />
    );
  }

  if (loading||!dataLoaded) return <><style>{CSS}</style><LoadingScreen/></>;

  const isAdmin      = auth.profile.role === "admin";
  const myBarberId   = auth.profile.barber_id;
  const tok          = auth.token;
  const barbershopId = auth.profile.barbershop_id;

  const userName = isSuperAdmin
    ? (auth.user?.email || "Administrador Master")
    : (barbers.find(b=>b.userId===auth.user?.id)?.name || auth.user?.email || "Usuário");

  const activeView = isSuperAdmin ? view : view;

  const views = isSuperAdmin
    ? {
        superadmin_dashboard:     <SuperAdminView token={tok} section="dashboard" />,
        superadmin_clients:       <SuperAdminView token={tok} section="clients" />,
        superadmin_finance:       <SuperAdminView token={tok} section="finance" />,
        superadmin_subscriptions: <SuperAdminView token={tok} section="subscriptions" />,
        superadmin_courtesy:      <SuperAdminView token={tok} section="courtesy" />,
        superadmin_alerts:        <SuperAdminView token={tok} section="alerts" />,
        superadmin_analytics:     <SuperAdminView token={tok} section="analytics" />,
      }
    : {
        dashboard:   <Dashboard   attendances={attendances} clients={clients}   services={services}  barbers={barbers}    isAdmin={isAdmin} myBarberId={myBarberId} onGoReports={isAdmin?()=>setView('reports'):undefined}/>,
        attendances: <AttendancesView attendances={attendances} setAttendances={setAttendances} clients={clients} services={services} barbers={barbers} token={tok} isAdmin={isAdmin} myBarberId={myBarberId} barbershopId={barbershopId}/>,
        clients:     <ClientsView clients={clients} setClients={setClients} attendances={attendances} services={services} token={tok} isAdmin={isAdmin} barbershopId={barbershopId}/>,
        barbers:     <BarbersView  barbers={barbers} setBarbers={setBarbers} attendances={attendances} token={tok} barbershopId={barbershopId}/>,
        services:    <ServicesView services={services} setServices={setServices} token={tok} barbershopId={barbershopId}/>,
        financial:   <FinancialView attendances={attendances} expenses={expenses} setExpenses={setExpenses} token={tok} barbershopId={barbershopId} barbers={barbers}/>,
        reports:     <ReportsView attendances={attendances} clients={clients} services={services} barbers={barbers} expenses={expenses} shop={shop}/>,
        settings:    <SettingsView token={tok} shop={shop} onShopUpdated={(updatedShop) => { setShop(updatedShop); applyTenantTheme(updatedShop); }} />,
        meuPlano:    <MeuPlanoView token={tok} userEmail={auth.user?.email} profile={auth.profile} onRenew={() => setShowPlans(true)} />,
      };

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, color:T.text, fontFamily:"'DM Sans', sans-serif", overflow:"hidden" }}>
      <style>{CSS}</style>
      <Sidebar view={activeView} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} userName={userName} onLogout={onLogout} shop={shop}/>
      <main style={{ flex:1, overflow:"auto", padding:"2rem 2.25rem" }}>
        {views[activeView] || views.superadmin_dashboard}
      </main>
    </div>
  );
}
