import { useState, useMemo, useEffect, useCallback } from "react";
import Onboarding from "./Onboarding";
import PlansView   from "./PlansView";
import SuperAdminView from "./SuperAdminView";
import ozBarberLogo from "./assets/ozbarber-logo.png.png";
import {
  LayoutDashboard, Scissors, Users, Award, Tag, DollarSign,
  Menu, X, Plus, Search, Edit2, Trash2, Check, TrendingUp,
  Phone, LogOut, Lock, Mail, CreditCard, Banknote, Smartphone,
  BadgePercent, AlertCircle, RefreshCw, FileText, Download, Calendar
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
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxanpvbnR4Zndsd212YmRkYm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTU5NjIsImV4cCI6MjA5Mzc3MTk2Mn0.SiH3q7fQRoVDern1SnroZolD0rc_wttj5G-Me4wffVw";
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

// ── TRANSFORMS ────────────────────────────────────────────────
const toAtt  = a => ({ id: a.id, clientId: a.client_id, barberId: a.barber_id, serviceId: a.service_id, price: +a.price, payment: a.payment, date: a.date, time: a.time || "", notes: a.notes || "" });
const fromAtt = a => ({ client_id: +a.clientId, barber_id: +a.barberId, service_id: +a.serviceId, price: +a.price, payment: a.payment, date: a.date, time: a.time, notes: a.notes });
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
const today = () => new Date().toISOString().slice(0, 10);
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
    setLoading(true); setErr("");
    try {
      const res = await api.login(email, pass);
      if (!res.access_token) { setErr("E-mail ou senha incorretos."); setLoading(false); return; }
      const [user, profile] = await Promise.all([
        api.getUser(res.access_token),
        api.getProfile(res.user?.id || "", res.access_token),
      ]);
      if (!profile) { setErr("Perfil não encontrado. Contate o administrador."); setLoading(false); return; }
      onLogin({ token: res.access_token, user, profile });
    } catch (e) {
      setErr("Erro de conexão. Verifique a URL e chave do Supabase.");
    }
    setLoading(false);
  };

  const onKey = e => e.key === "Enter" && submit();

  return (
    <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`*{box-sizing:border-box} input::placeholder{color:${T.muted}}`}</style>

      {/* Decorative vertical stripe */}
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 4, background: T.accent }} />

      <div style={{ width: 400, padding: "0 1rem" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <img src="data:image/png;base64,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ferq3lcrsBK5ru+OH1I+PI8T4rw1ntf0Fpt88c12kvtyZ69PbSJd08svmcdxoBwDgk+C4Jrrb/qy+CWmtEo07QPG72Fvfmdw5enUEZzkZ9ANBBwk61ta/M86XHHOQs3KeU9EVmQfV934dBJ3XetNOaVBm1dqCOKqIHZ0bXdtVP7g2JvFoPLJwFHfaH5Qd1r4paDSkTrJRvBa6cObJWStP4fqQ5B+TvOBHNcOrK+pqpJZJJDvSuLpDklzySCd5xy53EZ4k8Vaqqucr1aizYfCi4svZy3oPPq/G+fV2euJdV9fV11RLUVM8ksszi+V73lzpHHm5zjkuJPHieatURVLbbxZ0KSSwQREWDIREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQHvBVTRPY4OJ7MgtyTluDngRxHHuIXVtDbe9dWAxU9dcmXyibhvY3cOmLR1LZm/GtPQA7wGeS5Ei3Uq9Sk8YPAj3FpRuY5tWKaJfaX8ofRN1a0Xy2XHT8pGXSxEVlOwcsuLcSNye9pXWrXc7Tq2xvjoK206rtBA7SH4usibno6N4JYfAgL86WPfG8PY5zXDiCDghX1uu9db6kVVJUS09QBhs8EjopW8cnDmkEk+OVaUssTwSqrEoK/s1SxzreTi+3795M/UuxbZve5JJ4LZW6bqn5Jks827E4+MEmW48G7q5nqTydtTU2/LpnUdmv8YGWwVWaCqd+CA7MZ9u8FqmkfKF1taXRRXSelv8ASsO7u3SLemawdBPHh5ce9wcuqab8onRdya1l6s13ssx4ukpnNroGN+c7G7I0fklToXFnW1PNZBdLK9n/AK49v3OIan0RrPTAe/UGkr1b4Yxl9QaUy04/wrMtI8crXo5I5eEUkcng1wJU3tJa103ed0aW1rbKp8nq08VcIpT/AIGTdJ+hU1RozSd7DxqbRFlrJJDl1QaLzad3sli3StvurfySx8TMcvZjza9Np8byEhGPBMKTt42BbPareda6zUlikx6DIqllVA0/iyAOP5y1G7+TjeGEfAeubFcOPFtypJaJw97d9pWqVCpHXHsJ1LK9pU/Xh08M4gqLoVx2J7UaLtHM0w25wsH3y218NRn2M3g/6lqV403qazh7rvpfUFuYzm+qtsrG/nYwtbROhXpT+WSfWjFp1Xj51S5LfOGNI6Oy0/WF9tlhd6s0R9jwV5UlvN2DR9J1X0ATyGfYqbrvmn6F6wMYlEVd09x+hVDXHofoTAYlExxVcO7j9Cbp+afoTAxiURUc5rfWc1v4xAXw6opm+tUQjH98B+xYbS1mT06phXNrt9yurt202q6XJ3zaOiklP1BbRadlm0y6jNFoC/gYzvVcIpW/TKQs4GuVWEPmkl0tI05McV1W2bANe1PpXCt0xZ25Ac2ouBnkHsbCHD61ttr8nSzxvab5rm51jcelFbLcyAD2SSOPD8lbFRqPVEiVMqWlPXNEfccMngO88lSF7JqhlNBmed5wyKFpke49wDclSztGyTZfanMf9yzrrOzlNdq6SoJ9rG7rPqK3qz0/wbSOhsVro7RRgZIoKSOlib3kuAH1lblZVNuCK6r7Q0F+XFvu9SJWmtkm0m/sbNSaQraKlc4A1N2c2ijbnriQhzh7AV0fTvk507HNfqvWjn8PTpbJTY/7eX9DCui6n2laAsMj23TVtFVVfEeb28urZi75p3MtB9rguY6l8pSywAxab0tUVLuLRPdqgRhrvGGLLiPyl5l7tS/MmaleZUu9FGnguNr8jp+lNm+z/TkjH2bR9LU1jcfru5k1sxd84B43Gn8VoWxaqv8AbLHTsn1XqGhtMG6TGyrnbGSBz3IhxPTg1qiHqrbxr28xuhhuwtMD2lr4LTD5s32iQl0hz7QuY1NfU1FQ+okkcZnuD3SOJc8u7945d9ajTyvRpaKMTbT9nrq4eddVPP08yVutPKH0pa2uh0xbam91HDdqq8GmphkcHBn314yOWGjxXBdfbVtX6y34btdZTRO5UMHxFKzPTs2H0yDxBeSVoSKqr5Rr1tDZfWeRrS00wji970v7dR6TTSy8Hu4AkhoGGjPPAHAe5eaIoLeJahERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAe3nMxaWucHggDL2hxAH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S1VdtrtVOlpaynkp54xbqZu/G9pa4ZawEZBIyOK5xO9rn+hvbjQGt3uf++ePvXmi1zqzqfM8TfRtqVBYU4qPQkvA9aeQRy7xzgtc047iCP0roNt207SLdbKO20eq54aSjp2U9PEKKBwZGwbrRxbxwO9c5RKdadP5HgYrW1KvoqRUulJ+J039XXaiTk6wn91BTfzFgNba81FrKGkbqS9TXI0YkNO00sUPZl+N7iwDPqt593TmtRRe5XNWazZSbXSzXTsbanJThTSa2pJeQREWglhERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAEREAREQBERAf/Z" alt="Oz.Barber" style={{ width:"100%", maxWidth:300, objectFit:"contain", display:"block", margin:"0 auto", mixBlendMode:"screen" }}/>
        </div>

        <div style={{ textAlign:"center", fontSize:11, color:"#4db8ff66", letterSpacing:1, marginBottom:"0.4rem", marginTop:"-0.5rem", textTransform:"uppercase" }}>
          Desenvolvido por <span style={{ color:"#4db8ff", fontWeight:600 }}>OzTech SmartControl</span>
        </div>
        <Card style={{ padding: "2rem" }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: "1.5rem", textAlign: "center" }}>Acesse sua conta</div>

          <FG label="E-mail">
            <div style={{ position: "relative" }}>
              <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKey}
                placeholder="seu@email.com" style={{ ...inputSt, paddingLeft: "2.25rem" }} />
            </div>
          </FG>

          <FG label="Senha">
            <div style={{ position: "relative" }}>
              <Lock size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
              <input type={showPass ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)} onKeyDown={onKey}
                placeholder="••••••••" style={{ ...inputSt, paddingLeft: "2.25rem", paddingRight: "2.5rem" }} />
              <button onClick={() => setShowPass(s => !s)} type="button"
                style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:T.muted, cursor:"pointer", display:"flex", padding:4 }}>
                {showPass
                  ? <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </FG>

          <ErrorBar msg={err} />

          <Btn onClick={submit} disabled={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
            {loading ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Entrando…</> : "Entrar"}
          </Btn>
        </Card>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: 12, color: T.muted }}>
          Acesso restrito a usuários cadastrados
        </div>
        <button onClick={onShowPlans} style={{ width: "100%", marginTop: "0.75rem", background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.6rem", fontSize: 13, fontWeight: 600, color: T.accent, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          Ainda não tem conta? Assinar Plano
        </button>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
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
function AttendancesView({ attendances, setAttendances, clients, services, barbers, token, isAdmin, myBarberId, barbershopId }) {
  const [filterDate, setFilterDate]   = useState(today());
  const [filterBarber, setFilterBarber] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");
  const [form, setForm] = useState({ clientId:"", barberId: isAdmin?"":String(myBarberId||""), serviceId:"", price:"", payment:"PIX", date:today(), time:"", notes:"" });

  const setF = k => e => {
    const v = e.target.value;
    if (k==="serviceId") {
      const svc = services.find(s=>s.id===+v);
      setForm(f=>({...f, serviceId:v, price: svc?svc.price:""}));
    } else {
      setForm(f=>({...f,[k]:v}));
    }
  };

  const filtered = useMemo(()=>
    attendances
      .filter(a=>(!filterDate||a.date===filterDate)&&(!filterBarber||a.barberId===+filterBarber))
      .sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time)),
    [attendances,filterDate,filterBarber]
  );

  const save = async () => {
    if (!form.clientId||!form.barberId||!form.serviceId) return setErr("Preencha cliente, barbeiro e serviço.");
    setSaving(true); setErr("");
    try {
      const rows = await api.insert("attendances", { ...fromAtt(form), barbershop_id: barbershopId }, token);
      setAttendances(prev=>[toAtt(rows[0]),...prev]);
      setShowModal(false);
      setForm({ clientId:"", barberId:isAdmin?"":String(myBarberId||""), serviceId:"", price:"", payment:"PIX", date:today(), time:"", notes:"" });
    } catch(e){ setErr(e.message); }
    setSaving(false);
  };

  const del = async id => {
    await api.remove("attendances", id, token);
    setAttendances(prev=>prev.filter(a=>a.id!==id));
  };

  const payColor = {"PIX":T.info,"Dinheiro":T.success,"Cartão Débito":T.accent,"Cartão Crédito":T.accent};

  return (
    <div>
      <PageHeader
        title="Atendimentos"
        sub={`${filtered.length} atendimento${filtered.length!==1?"s":""} · ${R$(filtered.reduce((s,a)=>s+a.price,0))}`}
        right={<Btn onClick={()=>setShowModal(true)}><Plus size={15}/>Novo Atendimento</Btn>}
      />

      <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1rem" }}>
        <input type="date" value={filterDate} onChange={e=>setFilterDate(e.target.value)} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:"0.5rem 0.875rem", color:T.text, fontSize:13, outline:"none", fontFamily:"'DM Sans', sans-serif" }} />
        {isAdmin && (
          <select value={filterBarber} onChange={e=>setFilterBarber(e.target.value)} style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:"0.5rem 0.875rem", color:filterBarber?T.text:T.muted, fontSize:13, outline:"none", fontFamily:"'DM Sans', sans-serif" }}>
            <option value="">Todos os barbeiros</option>
            {barbers.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {(filterDate||filterBarber)&&<Btn variant="ghost" sm onClick={()=>{setFilterDate("");setFilterBarber("");}}>Limpar</Btn>}
      </div>

      <Card style={{ padding:0 }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <THead cols={["Horário","Cliente","Barbeiro","Serviço","Valor","Pagamento","Data",""]} />
          <tbody>
            {filtered.length===0 ? (
              <tr><td colSpan={8} style={{ textAlign:"center", padding:"3rem", color:T.muted }}>Nenhum atendimento encontrado</td></tr>
            ) : filtered.map(a=>{
              const cl=clients.find(c=>c.id===a.clientId), br=barbers.find(b=>b.id===a.barberId), sv=services.find(s=>s.id===a.serviceId);
              return (
                <tr key={a.id} style={{ borderTop:`1px solid ${T.borderLight}` }}>
                  <td style={{ padding:"9px 0.75rem", color:T.muted, fontVariantNumeric:"tabular-nums" }}>{a.time}</td>
                  <td style={{ padding:"9px 0.75rem", color:T.text, fontWeight:500 }}>{cl?.name||"—"}</td>
                  <td style={{ padding:"9px 0.75rem", color:T.muted }}>{br?.name||"—"}</td>
                  <td style={{ padding:"9px 0.75rem", color:T.text }}>{sv?.name||"—"}</td>
                  <td style={{ padding:"9px 0.75rem", color:T.success, fontWeight:600 }}>{R$(a.price)}</td>
                  <td style={{ padding:"9px 0.75rem" }}>
                    <span style={{ background:(payColor[a.payment]||T.accent)+"18", color:payColor[a.payment]||T.accent, borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{a.payment}</span>
                  </td>
                  <td style={{ padding:"9px 0.75rem", color:T.muted, fontSize:12 }}>{fDate(a.date)}</td>
                  <td style={{ padding:"9px 0.75rem", textAlign:"right" }}>
                    <button onClick={()=>del(a.id)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Trash2 size={14}/></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {showModal&&(
        <Modal title="Novo Atendimento" onClose={()=>setShowModal(false)}>
          <ErrorBar msg={err}/>
          <FSelect label="Cliente" value={form.clientId} onChange={setF("clientId")}>
            <option value="">Selecione o cliente</option>
            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </FSelect>
          {isAdmin&&(
            <FSelect label="Barbeiro" value={form.barberId} onChange={setF("barberId")}>
              <option value="">Selecione o barbeiro</option>
              {barbers.filter(b=>b.status==="active").map(b=><option key={b.id} value={b.id}>{b.name} ({b.commission}%)</option>)}
            </FSelect>
          )}
          <FSelect label="Serviço" value={form.serviceId} onChange={setF("serviceId")}>
            <option value="">Selecione o serviço</option>
            {services.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name} — {R$(s.price)}</option>)}
          </FSelect>
          <Row>
            <FG label="Valor cobrado (R$)" half><input style={inputSt} type="number" value={form.price} onChange={setF("price")}/></FG>
            <FSelect label="Pagamento" value={form.payment} onChange={setF("payment")}>{PAYMENT_OPTS.map(p=><option key={p}>{p}</option>)}</FSelect>
          </Row>
          <Row>
            <FG label="Data" half><input style={inputSt} type="date" value={form.date} onChange={setF("date")}/></FG>
            <FG label="Horário" half><input style={inputSt} type="time" value={form.time} onChange={setF("time")}/></FG>
          </Row>
          <FArea label="Observações (opcional)" value={form.notes} onChange={setF("notes")}/>
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Check size={13}/>} Registrar</Btn>
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
function FinancialView({ attendances, expenses, setExpenses, token, barbershopId }) {
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState("");
  const [form, setForm]         = useState({ desc:"", amount:"", date:today(), category:"Aluguel" });
  const setF = k => e => setForm(f=>({...f,[k]:e.target.value}));

  const mStr   = month(), tStr = today();
  const mAtts  = attendances.filter(a=>a.date.startsWith(mStr));
  const mRev   = mAtts.reduce((s,a)=>s+a.price,0);
  const mExp   = expenses.filter(e=>e.date.startsWith(mStr)).reduce((s,e)=>s+e.amount,0);
  const tAtts  = attendances.filter(a=>a.date===tStr);
  const profit = mRev - mExp;

  const byPay = {};
  mAtts.forEach(a=>{byPay[a.payment]=(byPay[a.payment]||0)+a.price;});

  const save = async () => {
    if (!form.desc||!form.amount) return setErr("Preencha descrição e valor.");
    setSaving(true); setErr("");
    try {
      const rows = await api.insert("expenses", { description:form.desc, amount:+form.amount, date:form.date, category:form.category, barbershop_id: barbershopId }, token);
      setExpenses(es=>[toExpense(rows[0]),...es]);
      setShowModal(false);
      setForm({ desc:"", amount:"", date:today(), category:"Aluguel" });
    } catch(e){ setErr(e.message); }
    setSaving(false);
  };

  const del = async id => {
    await api.remove("expenses", id, token);
    setExpenses(es=>es.filter(e=>e.id!==id));
  };

  return (
    <div>
      <PageHeader title="Financeiro" sub="Mês atual"
        right={<Btn onClick={()=>setShowModal(true)}><Plus size={15}/>Registrar Despesa</Btn>}
      />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:"1rem", marginBottom:"1.5rem" }}>
        <StatCard label="Receita do Dia"   value={R$(tAtts.reduce((s,a)=>s+a.price,0))} color={T.success} icon={DollarSign} sub={`${tAtts.length} atendimentos`}/>
        <StatCard label="Receita do Mês"   value={R$(mRev)} color={T.accent}  icon={TrendingUp} sub={`${mAtts.length} atendimentos`}/>
        <StatCard label="Despesas do Mês"  value={R$(mExp)} color={T.danger}  icon={Tag} sub={`${expenses.filter(e=>e.date.startsWith(mStr)).length} lançamentos`}/>
        <StatCard label="Lucro do Mês"     value={R$(profit)} color={profit>=0?T.success:T.danger} icon={BadgePercent} sub={`Margem: ${mRev>0?((profit/mRev)*100).toFixed(1):0}%`}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"1.5rem" }}>
        <Card>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:1.5, color:T.text, marginBottom:"1rem" }}>Formas de Pagamento — Mês</div>
          {Object.entries(byPay).map(([m,t])=>(
            <div key={m} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderTop:`1px solid ${T.borderLight}`, fontSize:13 }}>
              <span style={{ color:T.text }}>{m}</span>
              <div style={{ textAlign:"right" }}>
                <div style={{ color:T.success, fontWeight:600 }}>{R$(t)}</div>
                <div style={{ fontSize:11, color:T.muted }}>{mRev>0?((t/mRev)*100).toFixed(1):0}%</div>
              </div>
            </div>
          ))}
          {Object.keys(byPay).length===0&&<div style={{ textAlign:"center", padding:"1.5rem", color:T.muted }}>Sem dados</div>}
        </Card>

        <Card>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:1.5, color:T.text, marginBottom:"1rem" }}>Despesas</div>
          <div style={{ maxHeight:300, overflowY:"auto" }}>
            {expenses.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>(
              <div key={e.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderTop:`1px solid ${T.borderLight}`, fontSize:13 }}>
                <div>
                  <div style={{ color:T.text }}>{e.desc}</div>
                  <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>{fDate(e.date)} · <Badge color={T.muted}>{e.category}</Badge></div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:T.danger, fontWeight:600 }}>{R$(e.amount)}</span>
                  <button onClick={()=>del(e.id)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Trash2 size={12}/></button>
                </div>
              </div>
            ))}
            {expenses.length===0&&<div style={{ textAlign:"center", padding:"2rem", color:T.muted }}>Sem despesas cadastradas</div>}
          </div>
        </Card>
      </div>

      {showModal&&(
        <Modal title="Registrar Despesa" onClose={()=>setShowModal(false)}>
          <ErrorBar msg={err}/>
          <FInput label="Descrição" value={form.desc} onChange={setF("desc")} placeholder="Ex: Aluguel, energia…"/>
          <Row>
            <FG label="Valor (R$)" half><input style={inputSt} type="number" value={form.amount} onChange={setF("amount")}/></FG>
            <FSelect label="Categoria" value={form.category} onChange={setF("category")}>{EXPENSE_CATS.map(c=><option key={c}>{c}</option>)}</FSelect>
          </Row>
          <FG label="Data"><input style={inputSt} type="date" value={form.date} onChange={setF("date")}/></FG>
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={()=>setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={save} disabled={saving}>{saving?<RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/>:<Check size={13}/>} Salvar</Btn>
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
  const reportLogo = shop?.logo_url || null;

  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", borderBottom:`2px solid ${reportAccent}`, paddingBottom:12, marginBottom:20 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, minWidth:0 }}>
        {reportLogo && (
          <img
            src={reportLogo}
            alt={reportName}
            style={{ maxWidth:90, maxHeight:46, objectFit:"contain", display:"block" }}
          />
        )}
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

function RevenueReportContent({ attendances, expenses, selMonth, shop }) {
  const todayStr = new Date().toISOString().slice(0,10);
  const mStr  = selMonth;
  const tAtts = attendances.filter(a => a.date === todayStr);
  const mAtts = attendances.filter(a => a.date.startsWith(mStr));
  const mExp  = expenses.filter(e => e.date.startsWith(mStr));
  const tRev  = tAtts.reduce((s,a)=>s+a.price,0);
  const mRev  = mAtts.reduce((s,a)=>s+a.price,0);
  const mExpT = mExp.reduce((s,e)=>s+e.amount,0);
  const profit= mRev - mExpT;
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

  const mAtts = attendances.filter(a => a.date.startsWith(selMonth));
  const mExp  = expenses.filter(e => e.date.startsWith(selMonth));
  const mRev  = mAtts.reduce((s,a)=>s+a.price,0);
  const mExpT = mExp.reduce((s,e)=>s+e.amount,0);

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
    revenue:  <RevenueReportContent  attendances={attendances} expenses={expenses}  selMonth={selMonth} shop={shop} />,
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
                {id==="revenue" && [["Receita",R$(mRev)],["Despesas",R$(mExpT)],["Lucro",R$(mRev-mExpT)],["Atend.",mAtts.length]].map(([l,v])=>(
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


// ── SIDEBAR ──────────────────────────────────────────────────
function Sidebar({ view, setView, collapsed, setCollapsed, isAdmin, isSuperAdmin, userName, onLogout, shop }) {
  const nav = [
    { id:"dashboard",   label:"Dashboard",    Icon:LayoutDashboard },
    { id:"attendances", label:"Atendimentos",  Icon:Scissors },
    { id:"clients",     label:"Clientes",      Icon:Users },
    ...(isAdmin ? [
      { id:"barbers",   label:"Barbeiros",     Icon:Award },
      { id:"services",  label:"Serviços",      Icon:Tag },
      { id:"financial", label:"Financeiro",    Icon:DollarSign },
      { id:"reports",   label:"Relatórios",    Icon:FileText },
    ] : []),
    ...(isSuperAdmin ? [
      { id:"superadmin", label:"Painel Admin", Icon:Lock },
    ] : []),
  ];

  const shopName = shop?.name || "Oz.Barber";

  const isOzBarber =
    !shop?.logo_url ||
    shop?.logo_url === "" ||
    shop?.logo_url === "null";

  const logoUrl = isOzBarber
    ? ozBarberLogo
    : shop.logo_url;

  return (
    <div style={{ width:collapsed?66:230, background:T.sidebar, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", flexShrink:0, transition:"width 0.2s ease" }}>
      <div style={{ padding:collapsed?"1.25rem 0":"1.2rem 1.1rem", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:collapsed?"center":"space-between" }}>
        {!collapsed && (
          <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0 }}>
            <div style={{ width:64, height:64, minWidth:64, borderRadius:14, background:"transparent", border:"none", display:"flex", alignItems:"center", justifyContent:"center", overflow:"visible", flexShrink:0, padding:0 }}>
              <img src={logoUrl} alt={shopName} style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, letterSpacing:1.4, color:T.text, lineHeight:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:118 }}>
                {shopName}
              </div>
              <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", letterSpacing:1, marginTop:3 }}>
                Ambiente privado
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ width:50, height:50, minWidth:50, borderRadius:12, background:"transparent", border:"none", display:"flex", alignItems:"center", justifyContent:"center", overflow:"visible", padding:0 }}>
            <img src={logoUrl} alt={shopName} style={{ width:"100%", height:"100%", objectFit:"contain", display:"block" }} />
          </div>
        )}
        {!collapsed && <button onClick={()=>setCollapsed(true)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"flex" }}><Menu size={18}/></button>}
      </div>

      {collapsed && (
        <button onClick={()=>setCollapsed(false)} style={{ margin:"0.8rem auto 0", background:T.surface, border:`1px solid ${T.border}`, color:T.muted, width:34, height:30, borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Menu size={16}/>
        </button>
      )}

      <nav style={{ flex:1, padding:"1rem 0.65rem", overflowY:"auto" }}>
        {nav.map(({id,label,Icon}) => {
          const active = view === id;
          return (
            <button
              key={id}
              onClick={()=>setView(id)}
              title={collapsed ? label : undefined}
              style={{
                width:"100%",
                display:"flex",
                alignItems:"center",
                justifyContent:collapsed?"center":"flex-start",
                gap:10,
                padding:collapsed?"0.75rem 0":"0.75rem 0.8rem",
                marginBottom:4,
                borderRadius:9,
                border:"none",
                background: active ? T.accentGlow : "transparent",
                color: active ? T.accent : T.mutedLight,
                cursor:"pointer",
                fontFamily:"'DM Sans', sans-serif",
                fontSize:13,
                fontWeight: active ? 700 : 500,
                textAlign:"left"
              }}
            >
              <Icon size={17}/>
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      <div style={{ padding:collapsed?"0.8rem 0.65rem":"1rem", borderTop:`1px solid ${T.border}` }}>
        {!collapsed && (
          <div style={{ marginBottom:"0.75rem", minWidth:0 }}>
            <div style={{ fontSize:11, color:T.muted, marginBottom:3 }}>Logado como</div>
            <div style={{ fontSize:12, color:T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{userName}</div>
          </div>
        )}
        <button
          onClick={onLogout}
          title="Sair"
          style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:collapsed?"center":"flex-start", gap:8, padding:"0.65rem 0.7rem", borderRadius:8, border:`1px solid ${T.border}`, background:T.surface, color:T.mutedLight, cursor:"pointer", fontSize:12, fontFamily:"'DM Sans', sans-serif" }}
        >
          <LogOut size={15}/>
          {!collapsed && "Sair"}
        </button>
      </div>
    </div>
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

export default function App() {
  const [auth,         setAuth]         = useState(null);
  const [dataLoaded,   setDataLoaded]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [view,         setView]         = useState("dashboard");
  const [collapsed,    setCollapsed]    = useState(false);
  const [showPlans,    setShowPlans]    = useState(false);
  const [expiredMsg,   setExpiredMsg]   = useState("");
  const [courtesyEmail,setCourtesyEmail]= useState(null); // e-mail validado como cortesia
  const [shop,         setShop]         = useState(null);

  const [clients,     setClients]     = useState([]);
  const [services,    setServices]    = useState([]);
  const [barbers,     setBarbers]     = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [expenses,    setExpenses]    = useState([]);

  // Detecta retorno do Mercado Pago (?payment=success&plan=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const plan    = params.get("plan");
    if (payment === "success" && plan) {
      window.history.replaceState(null, "", window.location.pathname);
      // Assinatura criada pelo webhook; usuário já pode prosseguir
      setShowPlans(false);
    } else if (payment === "failure") {
      window.history.replaceState(null, "", window.location.pathname);
      setShowPlans(true);
    }
  }, []);

  const loadData = useCallback(async (tok, profile) => {
    setLoading(true);
    try {
      const isAdm = profile.role === "admin";
      const shopId = profile.barbershop_id;

      if (!shopId && !profile.is_super_admin) {
        throw new Error("Perfil sem barbershop_id. Finalize o cadastro da barbearia.");
      }

      const shopFilter = shopId ? `barbershop_id=eq.${shopId}` : "";
      const withShop = (qs) => shopFilter ? `${qs}&${shopFilter}` : qs;

      const attQuery = isAdm
        ? withShop("select=*&order=date.desc,time.desc")
        : withShop(`select=*&barber_id=eq.${profile.barber_id}&order=date.desc,time.desc`);

      const [shopRows, brs, cls, svcs, atts, exps] = await Promise.all([
        shopId ? api.list("barbershops", `id=eq.${shopId}&select=*`, tok) : Promise.resolve([]),
        api.list("barbers",     withShop("select=*&order=name"), tok),
        api.list("clients",     withShop("select=*&order=name"), tok),
        api.list("services",    withShop("select=*&order=name"), tok),
        api.list("attendances", attQuery, tok),
        isAdm ? api.list("expenses", withShop("select=*&order=date.desc"), tok) : Promise.resolve([]),
      ]);

      const currentShop = (shopRows || [])[0] || null;
      setShop(currentShop);
      applyTenantTheme(currentShop);

      setBarbers((brs || []).map(toBarber));
      setClients((cls || []).map(toClient));
      setServices((svcs || []).map(toService));
      setAttendances((atts || []).map(toAtt));
      setExpenses((exps || []).map(toExpense));
      setDataLoaded(true);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  const onLogin = useCallback(async (authData) => {
    setAuth(authData);
    // Verifica acesso ativo (super admin sempre passa)
    const shopId = authData.profile?.barbershop_id;
    if (shopId && !authData.profile?.is_super_admin) {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/has_active_access`, {
          method: "POST",
          headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${authData.token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ p_barbershop_id: shopId }),
        });
        const hasAccess = await res.json();
        if (!hasAccess) {
          setExpiredMsg("Sua assinatura expirou. Renove para continuar usando o sistema.");
          setShowPlans(true);
          setLoading(false);
          return;
        }
      } catch { /* se falhar, deixa entrar */ }
    }
    await loadData(authData.token, authData.profile);
  }, [loadData]);

  const onLogout = () => {
    setAuth(null);
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

  // Tela de planos (antes do login ou assinatura expirada)
  if (showPlans) return (
    <PlansView
      onBack={() => { setShowPlans(false); setExpiredMsg(""); }}
      expiredMessage={expiredMsg}
      onCourtesyValidated={(email) => {
        setCourtesyEmail(email);
        setShowPlans(false);
      }}
    />
  );

  // E-mail de cortesia validado mas usuário ainda não autenticado → vai direto para o cadastro
  if (!auth && courtesyEmail) return (
    <><style>{CSS}</style>
      <Onboarding onComplete={onLogin} courtesyEmail={courtesyEmail} />
    </>
  );

  if (!auth) return <><style>{CSS}</style><LoginView onLogin={onLogin} onShowPlans={() => setShowPlans(true)} /></>;

  // Usuário logado mas sem barbearia → onboarding
  // Passa o e-mail de cortesia se vier desse fluxo
  if (!auth.profile?.barbershop_id) return <Onboarding onComplete={onLogin} courtesyEmail={courtesyEmail} />;

  if (loading||!dataLoaded) return <><style>{CSS}</style><LoadingScreen/></>;

  const isAdmin      = auth.profile.role === "admin";
  const isSuperAdmin = auth.profile.is_super_admin === true;
  const myBarberId   = auth.profile.barber_id;
  const userName     = barbers.find(b=>b.userId===auth.user?.id)?.name || auth.user?.email || "Usuário";
  const tok          = auth.token;
  const barbershopId = auth.profile.barbershop_id;

  const views = {
    dashboard:   <Dashboard   attendances={attendances} clients={clients}   services={services}  barbers={barbers}    isAdmin={isAdmin} myBarberId={myBarberId} onGoReports={isAdmin?()=>setView('reports'):undefined}/>,
    attendances: <AttendancesView attendances={attendances} setAttendances={setAttendances} clients={clients} services={services} barbers={barbers} token={tok} isAdmin={isAdmin} myBarberId={myBarberId} barbershopId={barbershopId}/>,
    clients:     <ClientsView clients={clients} setClients={setClients} attendances={attendances} services={services} token={tok} isAdmin={isAdmin} barbershopId={barbershopId}/>,
    barbers:     <BarbersView  barbers={barbers} setBarbers={setBarbers} attendances={attendances} token={tok} barbershopId={barbershopId}/>,
    services:    <ServicesView services={services} setServices={setServices} token={tok} barbershopId={barbershopId}/>,
    financial:   <FinancialView attendances={attendances} expenses={expenses} setExpenses={setExpenses} token={tok} barbershopId={barbershopId}/>,
    reports:     <ReportsView attendances={attendances} clients={clients} services={services} barbers={barbers} expenses={expenses} shop={shop}/>,
    superadmin:  <SuperAdminView token={tok} />,
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, color:T.text, fontFamily:"'DM Sans', sans-serif", overflow:"hidden" }}>
      <style>{CSS}</style>
      <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} userName={userName} onLogout={onLogout} shop={shop}/>
      <main style={{ flex:1, overflow:"auto", padding:"2rem 2.25rem" }}>
        {views[view] || views.dashboard}
      </main>
    </div>
  );
}
