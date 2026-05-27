import { useState, useMemo, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import Onboarding from "./Onboarding";
import PlansView   from "./PlansView";
import SuperAdminView from "./SuperAdminView";
import ResetPassword from "./ResetPassword";
import LandingPage from "./LandingPage";
import BookingPage from "./BookingPage";
import ozBarberLogo from "./assets/ozbarber-logo.png.png";
import sharedT from "./config/theme"; // T compartilhado com SuperAdminView
import {
  LayoutDashboard, Scissors, Users, Award, Tag, DollarSign,
  Menu, X, Plus, Search, Edit2, Trash2, Check, TrendingUp,
  Phone, LogOut, Lock, Mail, CreditCard, Banknote, Smartphone,
  BadgePercent, AlertCircle, RefreshCw, FileText, Download, Calendar, Bell, Gift,
  Settings, Upload, Palette, Image, Shield, Clock, Layers,
  ShoppingCart, Package, Sun, Moon, Zap, ChevronLeft,
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
const toAtt  = a => ({ id: a.id, clientId: a.client_id, barberId: a.barber_id, serviceId: a.service_id, price: +a.price, servicesPrice: +(a.services_price ?? a.price), payment: a.payment, date: a.date, time: a.time || "", notes: a.notes || "", extraServices: Array.isArray(a.extra_services) ? a.extra_services : [], productsSold: Array.isArray(a.products_sold) ? a.products_sold : [], appointmentId: a.appointment_id || null, source: a.source || "manual" });
const fromAtt = a => ({ client_id: +a.clientId||0, barber_id: +a.barberId||0, service_id: +a.serviceId||0, price: +a.price, payment: a.payment, date: a.date, time: a.time, notes: a.notes, extra_services: a.extraServices||[] });
const toClient = c => ({ id: c.id, name: c.name, phone: c.phone || "", whatsapp: c.whatsapp || "", birthdate: c.birthdate || "", notes: c.notes || "", points: +c.points });
const toBarber = b => ({ id: b.id, name: b.name, phone: b.phone || "", commission: +b.commission, status: b.status, userId: b.user_id, notificationEmail: b.notification_email || "" });
const toService = s => ({ id: s.id, name: s.name, price: +s.price, duration: +s.duration, active: s.active });
const toExpense     = e => ({ id: e.id, desc: e.description, amount: +e.amount, date: e.date, category: e.category || "" });
const toProduct     = p => ({ id: p.id, name: p.name, description: p.description || "", price: +(p.price||0), cost: +(p.cost||0), stockCurrent: +(p.stock_current||0), stockMinimum: +(p.stock_minimum||0), unit: p.unit || "un", active: p.active !== false });
const toProductSale = s => ({ id: s.id, productId: s.product_id, barberId: s.barber_id, quantity: +(s.quantity||1), unitPrice: +(s.unit_price||0), totalPrice: +(s.total_price||0), payment: s.payment || "PIX", date: (s.sold_at||s.created_at||"").substring(0,10) });

// ── THEME ─────────────────────────────────────────────────────
const T_DARK = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  borderLight: "#222230", accent: "#4db8ff", accentGlow: "#4db8ff22",
  text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", successBg: "#43d18a18", danger: "#f07070", dangerBg: "#f0707018",
  info: "#60a5fa", infoBg: "#60a5fa18", sidebar: "#0e0e14",
  warn: "#f0a500", warnBg: "#f0a50018",
};

const T_LIGHT = {
  bg: "#f4f4f8", surface: "#ffffff", card: "#ffffff", border: "#dde1ea",
  borderLight: "#e8eaf0", accent: "#4db8ff", accentGlow: "#4db8ff22",
  text: "#1a1a2e", muted: "#6b7280", mutedLight: "#9ca3af",
  success: "#16a34a", successBg: "#16a34a18", danger: "#dc2626", dangerBg: "#dc262618",
  info: "#2563eb", infoBg: "#2563eb18", sidebar: "#e8e8f0",
  warn: "#d97706", warnBg: "#d9770618",
};

// Mutável em runtime — inicializado com o modo salvo
const _savedMode = typeof localStorage !== "undefined" ? (localStorage.getItem("oz_theme") || "dark") : "dark";
const T = { ...(_savedMode === "light" ? T_LIGHT : T_DARK) };

const normalizeHex = (value, fallback = "#4db8ff") => {
  if (!value || typeof value !== "string") return fallback;
  const hex = value.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : fallback;
};

const applyThemeMode = (mode) => {
  const palette = mode === "light" ? T_LIGHT : T_DARK;
  Object.assign(T, palette);       // T local do App.jsx
  Object.assign(sharedT, palette); // T compartilhado com SuperAdminView e páginas
  document.body.style.background = T.bg;
};

const applyTenantTheme = (shop, mode) => {
  const accent = normalizeHex(shop?.accent_color);
  applyThemeMode(mode || localStorage.getItem("oz_theme") || "dark");
  T.accent = accent;
  T.accentGlow = `${accent}22`;
  sharedT.accent = accent;
  sharedT.accentGlow = `${accent}22`;
  if (shop?.name) document.title = `${shop.name} | Oz.Barber`;
};

const resetTenantTheme = () => {
  applyThemeMode(localStorage.getItem("oz_theme") || "dark");
  document.title = "Oz.Barber";
};

// ── HELPERS ───────────────────────────────────────────────────
const R$   = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(+v || 0);
const fDate = s => s ? new Date(s + "T12:00:00").toLocaleDateString("pt-BR") : "—";
const today   = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const nowTime = () => { const n = new Date(); return `${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`; };
const month = () => today().slice(0, 7);
const nextId = arr => Math.max(0, ...arr.map(x => x.id)) + 1;

const PAYMENT_OPTS = ["Dinheiro", "PIX", "Cartão Débito", "Cartão Crédito"];
const EXPENSE_CATS = ["Aluguel", "Insumos", "Energia", "Internet", "Manutenção", "Marketing", "Outros"];
const WARN_COLOR   = "#f59e0b";

// ── SHARED UI ─────────────────────────────────────────────────
const inputSt = { width: "100%", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.6rem 0.875rem", color: T.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif", WebkitAppearance: "none", MozAppearance: "none", appearance: "none", colorScheme: "dark" };

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}
    onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, width: "100%", maxWidth: 540, maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: 21, letterSpacing: 1.5, color: T.text }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex" }}><X size={18} /></button>
      </div>
      <div style={{ padding: "1.5rem", overflowY: "auto", WebkitOverflowScrolling: "touch", flex: 1, paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}>{children}</div>
    </div>
  </div>
);

const FLabel = ({ c }) => <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</div>;
const FG = ({ label, children, half }) => <div style={{ marginBottom: "1rem", flex: half ? "1 1 140px" : undefined, minWidth: half ? 0 : undefined }}>{label && <FLabel c={label} />}{children}</div>;
const FInput  = ({ label, ...p }) => <FG label={label}><input style={inputSt} {...p} /></FG>;
const FSelect = ({ label, children, ...p }) => <FG label={label}><select style={{ ...inputSt }} {...p}>{children}</select></FG>;
const FArea   = ({ label, ...p }) => <FG label={label}><textarea style={{ ...inputSt, resize: "vertical", minHeight: 72, fontFamily: "'DM Sans', sans-serif", WebkitAppearance: "auto", appearance: "auto" }} {...p} /></FG>;
const Row     = ({ children, g = "1rem", style }) => <div style={{ display: "flex", gap: g, flexWrap: "wrap", ...style }}>{children}</div>;

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
  <Card style={{ minWidth: 0 }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10 }}>{label}</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(20px, 5vw, 30px)", letterSpacing: 1, color: color || T.text, lineHeight: 1, wordBreak: "break-word" }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{sub}</div>}
      </div>
      {Icon && <div style={{ background: (color || T.accent) + "18", borderRadius: 10, padding: 8, flexShrink: 0 }}><Icon size={17} color={color || T.accent} /></div>}
    </div>
  </Card>
);

const THead = ({ cols }) => (
  <thead><tr>{cols.map(c => <th key={c} style={{ textAlign: "left", padding: "0 0.75rem 10px", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</th>)}</tr></thead>
);

const PageHeader = ({ title, sub, right, onRefresh }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.75rem", gap: 12, flexWrap: "wrap" }}>
    <div style={{ minWidth: 0 }}>
      <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(26px, 6vw, 38px)", letterSpacing: 2.5, margin: "0 0 4px", color: T.text }}>{title}</h1>
      {sub && <div style={{ color: T.muted, fontSize: 13 }}>{sub}</div>}
    </div>
    {(right || onRefresh) && (
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
        {onRefresh && (
          <Btn variant="ghost" onClick={onRefresh}>
            <RefreshCw size={14}/>Atualizar
          </Btn>
        )}
        {right}
      </div>
    )}
  </div>
);

const ErrorBar = ({ msg }) => msg ? (
  <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.625rem 1rem", color: T.danger, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
    <AlertCircle size={15} />{msg}
  </div>
) : null;

// ── THEME TOGGLE SWITCH ───────────────────────────────────────
function ThemeToggleSwitch({ isDark, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={isDark ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
      style={{
        position: "relative",
        width: 68,
        height: 34,
        borderRadius: 999,
        background: isDark ? "#13131a" : "#dde1ea",
        border: `1.5px solid ${isDark ? "#2a2a3a" : "#c4c8d4"}`,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        padding: 3,
        transition: "background 0.3s, border-color 0.3s",
        flexShrink: 0,
      }}
    >
      {/* Ícone de fundo (lado oposto ao thumb) */}
      <div style={{
        position: "absolute",
        left: isDark ? "auto" : 9,
        right: isDark ? 9 : "auto",
        top: "50%",
        transform: "translateY(-50%)",
        opacity: 0.55,
        display: "flex",
      }}>
        {isDark ? <Moon size={12} color="#706b63"/> : <Sun size={12} color="#6b7280"/>}
      </div>
      {/* Thumb */}
      <div style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: "white",
        boxShadow: "0 1px 6px rgba(0,0,0,0.28)",
        transform: isDark ? "translateX(34px)" : "translateX(0)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        {isDark
          ? <Moon  size={13} color="#334155"/>
          : <Sun   size={13} color="#f59e0b"/>
        }
      </div>
    </button>
  );
}

// ── DATE RANGE PICKER ─────────────────────────────────────────
const DRP_MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DRP_WDAYS  = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

function DateRangePicker({ from, to, onChange }) {
  const [open,      setOpen]      = useState(false);
  const [step,      setStep]      = useState("from");
  const [hover,     setHover]     = useState(null);
  const [tempFrom,  setTempFrom]  = useState(null);
  const [viewYear,  setViewYear]  = useState(() => { const d = from ? new Date(from + "T00:00") : new Date(); return d.getFullYear(); });
  const [viewMonth, setViewMonth] = useState(() => { const d = from ? new Date(from + "T00:00") : new Date(); return d.getMonth(); });

  const openPicker = () => {
    const d = from ? new Date(from + "T00:00") : new Date();
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
    setTempFrom(from || null);
    setStep("from");
    setHover(null);
    setOpen(true);
  };

  const toISO = (y, m, d) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (day) => {
    const iso = toISO(viewYear, viewMonth, day);
    if (step === "from") {
      setTempFrom(iso);
      setStep("to");
      setHover(null);
    } else {
      let f = tempFrom, t2 = iso;
      if (f && t2 < f) { const tmp = f; f = t2; t2 = tmp; }
      onChange({ from: f || iso, to: t2 });
      setOpen(false);
      setStep("from");
      setHover(null);
      setTempFrom(null);
    }
  };

  const firstDay    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const todayISO = today();

  // Range display with hover preview
  const dispFrom = (step === "to" && hover && tempFrom)
    ? (hover < tempFrom ? hover : tempFrom)
    : (step === "to" ? (tempFrom || from) : from);
  const dispTo = (step === "to" && hover && tempFrom)
    ? (hover < tempFrom ? tempFrom : hover)
    : (step === "to" ? null : to);

  const label = (from && to)
    ? (from === to ? fDate(from) : `${fDate(from)} → ${fDate(to)}`)
    : "Selecionar período";

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Trigger */}
      <button
        onClick={() => open ? setOpen(false) : openPicker()}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          background: T.card, border: `1px solid ${open ? T.accent : T.border}`,
          borderRadius: 10, padding: "8px 14px", cursor: "pointer",
          color: T.text, fontSize: 13, fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Calendar size={14} style={{ color: open ? T.accent : T.muted, flexShrink: 0 }} />
        <span>{label}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div style={{ position: "fixed", inset: 0, zIndex: 498 }} onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 499,
            width: 294, background: T.card, border: `1px solid ${T.border}`,
            borderRadius: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
            padding: "1rem", userSelect: "none",
          }}>
            {/* Hint */}
            <div style={{ textAlign: "center", fontSize: 11, color: T.muted, marginBottom: "0.75rem", letterSpacing: 0.4 }}>
              {step === "from" ? "Selecione a data inicial" : "Selecione a data final"}
            </div>

            {/* Month navigation */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <button onClick={prevMonth} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", fontSize: 20, padding: "0 8px", lineHeight: 1, fontFamily: "sans-serif" }}>‹</button>
              <span style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{DRP_MONTHS[viewMonth]} {viewYear}</span>
              <button onClick={nextMonth} style={{ background: "none", border: "none", color: T.text, cursor: "pointer", fontSize: 20, padding: "0 8px", lineHeight: 1, fontFamily: "sans-serif" }}>›</button>
            </div>

            {/* Week day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 2 }}>
              {DRP_WDAYS.map(w => (
                <div key={w} style={{ textAlign: "center", fontSize: 10, color: T.muted, fontWeight: 700, paddingBottom: 4 }}>{w}</div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`} />;
                const iso     = toISO(viewYear, viewMonth, day);
                const isStart = iso === dispFrom;
                const isEnd   = iso === dispTo;
                const isEndpt = isStart || isEnd;
                const inRange = dispFrom && dispTo && iso > dispFrom && iso < dispTo;
                const isToday = iso === todayISO;
                const isHov   = step === "to" && iso === hover;

                return (
                  <div
                    key={day}
                    onMouseEnter={() => step === "to" && setHover(iso)}
                    onMouseLeave={() => step === "to" && setHover(null)}
                    onClick={() => handleDay(day)}
                    style={{
                      position: "relative",
                      height: 36, display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                      background: inRange
                        ? `${T.accent}1a`
                        : (isStart && dispTo)   ? `linear-gradient(to right, transparent 50%, ${T.accent}1a 50%)`
                        : (isEnd   && dispFrom) ? `linear-gradient(to left,  transparent 50%, ${T.accent}1a 50%)`
                        : "transparent",
                    }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12,
                      fontWeight: isEndpt ? 800 : 400,
                      color: isEndpt ? "#0a0808" : (inRange ? T.accent : T.text),
                      background: isEndpt ? T.accent : (isHov ? `${T.accent}33` : "transparent"),
                      border: isToday && !isEndpt ? `1.5px solid ${T.accent}88` : "1.5px solid transparent",
                      transition: "background 0.1s",
                    }}>
                      {day}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ display: "flex", gap: 8, marginTop: "0.875rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => { onChange({ from: "", to: "" }); setOpen(false); }}
                style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                Limpar
              </button>
              <button
                onClick={() => { const t = today(); onChange({ from: t.substring(0, 7) + "-01", to: t }); setOpen(false); }}
                style={{ background: T.accent, border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 700, color: "#0a0808", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
              >
                Mês atual
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── LOGIN VIEW ────────────────────────────────────────────────
const LoginView = ({ onLogin, onShowPlans }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ── Forgot password ──
  const [showForgot, setShowForgot]     = useState(false);
  const [forgotEmail, setForgotEmail]   = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMsg, setForgotMsg]       = useState(null); // { type:"success"|"error", text }

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

  const sendReset = async () => {
    const e = forgotEmail.trim().toLowerCase();
    if (!e) { setForgotMsg({ type: "error", text: "Digite seu e-mail." }); return; }
    setForgotLoading(true);
    setForgotMsg(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: e,
          redirectTo: `${window.location.origin}/`,
        }),
      });
      // Supabase retorna 200 mesmo quando o e-mail não existe (por segurança)
      if (res.ok) {
        setForgotMsg({ type: "success", text: "E-mail enviado! Verifique sua caixa de entrada e a pasta de spam." });
      } else {
        const json = await res.json().catch(() => ({}));
        setForgotMsg({ type: "error", text: json.msg || json.error_description || "Não foi possível enviar o e-mail. Tente novamente." });
      }
    } catch {
      setForgotMsg({ type: "error", text: "Erro de conexão. Tente novamente." });
    }
    setForgotLoading(false);
  };

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
              onClick={() => {
                setShowForgot(v => !v);
                setForgotMsg(null);
                if (!showForgot) setForgotEmail(email);
              }}
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
              {showForgot ? "← Voltar ao login" : "Esqueceu sua senha?"}
            </button>
          </div>

          {showForgot && (
            <div
              style={{
                background: "rgba(77,184,255,.07)",
                border: `1px solid ${T.accent}44`,
                borderRadius: 12,
                padding: "1rem 1.1rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: ".5rem" }}>
                Recuperar senha
              </div>
              <div style={{ fontSize: 12, color: T.mutedLight, marginBottom: ".85rem", lineHeight: 1.55 }}>
                Informe o e-mail cadastrado. Você receberá um link para criar uma nova senha.
              </div>

              {forgotMsg && (
                <div
                  style={{
                    background: forgotMsg.type === "success" ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.13)",
                    color: forgotMsg.type === "success" ? T.success : T.danger,
                    border: `1px solid ${forgotMsg.type === "success" ? T.success : T.danger}44`,
                    borderRadius: 8,
                    padding: ".6rem .8rem",
                    marginBottom: ".75rem",
                    fontSize: 12,
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  {forgotMsg.text}
                </div>
              )}

              <div style={loginInputWrap}>
                <Mail size={18} style={iconSt} />
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendReset()}
                  placeholder="Seu e-mail de cadastro"
                  autoComplete="email"
                  style={loginInput}
                />
              </div>

              <button
                onClick={sendReset}
                disabled={forgotLoading || forgotMsg?.type === "success"}
                style={{
                  marginTop: ".65rem",
                  width: "100%",
                  minHeight: 38,
                  background: forgotMsg?.type === "success"
                    ? "rgba(16,185,129,.15)"
                    : "rgba(77,184,255,.15)",
                  color: forgotMsg?.type === "success" ? T.success : T.accent,
                  border: `1px solid ${forgotMsg?.type === "success" ? T.success : T.accent}55`,
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: (forgotLoading || forgotMsg?.type === "success") ? "default" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: forgotLoading ? .75 : 1,
                  transition: "all .2s",
                }}
              >
                {forgotLoading
                  ? "Enviando…"
                  : forgotMsg?.type === "success"
                  ? "✓ E-mail enviado"
                  : "Enviar link de recuperação"}
              </button>
            </div>
          )}

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
function Dashboard({ attendances, clients, services, barbers, isAdmin, myBarberId, onGoReports, isMobile, products = [], onRefresh }) {
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
    const monthServRev = monthAtts.reduce((s, a) => s + (a.servicesPrice ?? a.price), 0); // base da comissão
    const commission   = monthServRev * (me?.commission || 0) / 100;
    return (
      <div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, letterSpacing: 2.5, margin: "0 0 4px", color: T.text }}>Olá, {me?.name?.split(" ")[0] || "Barbeiro"}</h1>
          <div style={{ color: T.muted, fontSize: 13 }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatCard label="Atendimentos hoje"  value={todayAtts.length}  icon={Scissors} />
          <StatCard label="Faturamento hoje"    value={R$(todayRev)}     color={T.accent}  icon={DollarSign} />
          <StatCard label="Faturamento do mês"  value={R$(monthRev)}     color={T.success} icon={TrendingUp} />
          <StatCard label="Comissão do mês"     value={R$(commission)}   color={T.accent}  icon={BadgePercent} sub={`${me?.commission || 0}% sobre serviços (${R$(monthServRev)})`} />
        </div>
        <Card>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1rem" }}>Últimos atendimentos</div>
          <div className="mob-scroll-x">
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
          </div>
        </Card>
      </div>
    );
  }

  // Admin: visão completa
  const allToday  = attendances.filter(a => a.date === todayStr);
  const allMonth  = attendances.filter(a => a.date.startsWith(monthStr));
  const allMonthR = allMonth.reduce((s, a) => s + a.price, 0);
  const lowStockProds = products.filter(p => p.active && p.stockCurrent <= p.stockMinimum);

  const svcCount = {};
  allMonth.forEach(a => { svcCount[a.serviceId] = (svcCount[a.serviceId] || 0) + 1; });
  const topSvcs = Object.entries(svcCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([id, n]) => ({ svc: services.find(s => s.id === +id), n }));
  const maxN = topSvcs[0]?.n || 1;

  const bStats = barbers.filter(b => b.status === "active").map(b => {
    const bA = allMonth.filter(a => a.barberId === b.id);
    const total        = bA.reduce((s, a) => s + a.price, 0);                           // total pago pelo cliente
    const servicesOnly = bA.reduce((s, a) => s + (a.servicesPrice ?? a.price), 0);      // base da comissão
    return { b, count: bA.length, total, commission: servicesOnly * b.commission / 100, ticket: bA.length ? total / bA.length : 0 };
  }).sort((a, b) => b.total - a.total);

  const bToday = barbers.filter(b => b.status === "active").map(b => {
    const bA       = allToday.filter(a => a.barberId === b.id);
    const total    = bA.reduce((s, a) => s + a.price, 0);
    const servOnly = bA.reduce((s, a) => s + (a.servicesPrice ?? a.price), 0); // base da comissão
    return { b, count: bA.length, total, servOnly };
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        sub={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        onRefresh={onRefresh}
      />

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        <StatCard label="Atendimentos hoje"  value={allToday.length}                      icon={Scissors} />
        <StatCard label="Faturamento hoje"    value={R$(allToday.reduce((s,a)=>s+a.price,0))} color={T.accent}  icon={DollarSign} />
        <StatCard label="Faturamento do mês"  value={R$(allMonthR)}                        color={T.success} icon={TrendingUp} />
        <StatCard label="Clientes únicos hoje" value={new Set(allToday.map(a=>a.clientId)).size} icon={Users} />
      </div>

      {/* Low stock alert */}
      {lowStockProds.length > 0 && (
        <div style={{ background:`${WARN_COLOR}18`, border:`1px solid ${WARN_COLOR}44`, borderRadius:10, padding:"0.75rem 1rem", marginBottom:"1.5rem", display:"flex", alignItems:"center", gap:10 }}>
          <AlertCircle size={15} color={WARN_COLOR}/>
          <span style={{ color:WARN_COLOR, fontSize:13, fontWeight:700 }}>
            {lowStockProds.length} produto{lowStockProds.length>1?"s":""} com estoque baixo:{" "}
            {lowStockProds.map(p=>`${p.name} (${p.stockCurrent} ${p.unit})`).join(", ")}
          </span>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.4fr 1fr", gap: "1.5rem", marginBottom: "1.5rem", minWidth: 0 }}>
        <Card style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1rem" }}>Ranking Barbeiros — Mês</div>
          <div style={{ overflowX:"auto", margin:"0 -1.25rem", padding:"0 1.25rem" }}>
          <table style={{ width: "100%", minWidth: 400, borderCollapse: "collapse", fontSize: 13 }}>
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
          </div>
        </Card>

        <Card style={{ minWidth: 0, overflow: "hidden" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 1.5, color: T.text, marginBottom: "1rem" }}>Serviços Mais Realizados</div>
          {topSvcs.map(({ svc, n }) => svc && (
            <div key={svc.id} style={{ marginBottom: 13 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:13 }}>
                <span style={{ color:T.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginRight:8 }}>{svc.name}</span>
                <span style={{ color:T.muted, fontWeight:600, flexShrink:0 }}>{n}×</span>
              </div>
              <div style={{ background:T.surface, borderRadius:4, height:5, overflow:"hidden" }}>
                <div style={{ background:T.accent, borderRadius:4, height:5, width:`${(n/maxN)*100}%`, maxWidth:"100%" }} />
              </div>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ marginBottom:"0.75rem", fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:1.5, color:T.text }}>Painel de Hoje — Barbeiros</div>
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap:"1rem" }}>
        {bToday.map(({ b, count, total, servOnly }) => (
          <Card key={b.id} style={{ borderLeft:`3px solid ${T.accent}`, borderRadius:"0 12px 12px 0" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:40, height:40, borderRadius:"50%", background:T.accentGlow, border:`1px solid ${T.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color:T.accent }}>{b.name.charAt(0)}</div>
              <div style={{ fontWeight:600, color:T.text, fontSize:14 }}>{b.name}</div>
            </div>
            {[["Atendimentos", count, T.text],["Total produzido", R$(total), T.success],[`Comissão (${b.commission}%)`, R$(servOnly*b.commission/100), T.accent]].map(([l,v,c])=>(
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
function AttendancesView({ attendances, setAttendances, clients, setClients, services, barbers, token, isAdmin, myBarberId, barbershopId, products = [], setProducts, setProductSales, onRefresh }) {
  const emptyForm = () => ({
    clientId: "", barberId: isAdmin ? "" : String(myBarberId||""),
    selectedServices: [], selectedProducts: [], payment: "PIX",
    date: today(), time: nowTime(), notes: "",
    newClientName: "", newClientPhone: "",
  });

  const [filterFrom,   setFilterFrom]   = useState(() => { const t = today(); return t.substring(0,7) + "-01"; });
  const [filterTo,     setFilterTo]     = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10); });
  const [filterBarber, setFilterBarber] = useState("");
  const [showModal,    setShowModal]    = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState("");
  const [addSvcId,     setAddSvcId]     = useState("");
  const [addProdId,    setAddProdId]    = useState("");
  const [form,         setForm]         = useState(emptyForm);
  const [finalModal,   setFinalModal]   = useState(null); // id do atendimento a finalizar
  const [finPay,       setFinPay]       = useState("PIX");
  const [finSaving,    setFinSaving]    = useState(false);

  const totalServices = form.selectedServices.reduce((s, sv) => s + sv.price, 0);
  const totalProducts = form.selectedProducts.reduce((s, sp) => s + sp.price * sp.quantity, 0);
  const totalPrice    = totalServices + totalProducts; // total que o cliente paga

  // ── Serviços ──────────────────────────────────────────────────
  const addService = (svcId) => {
    if (!svcId) return;
    const svc = services.find(s => s.id === +svcId);
    if (!svc || form.selectedServices.find(s => s.serviceId === svc.id)) { setAddSvcId(""); return; }
    setForm(f => ({ ...f, selectedServices: [...f.selectedServices, { serviceId: svc.id, name: svc.name, price: svc.price }] }));
    setAddSvcId("");
  };
  const removeService = (svcId) => setForm(f => ({ ...f, selectedServices: f.selectedServices.filter(s => s.serviceId !== svcId) }));

  // ── Produtos ──────────────────────────────────────────────────
  const addProd = (prodId) => {
    if (!prodId) return;
    const prod = products.find(p => p.id === +prodId);
    if (!prod) { setAddProdId(""); return; }
    const exists = form.selectedProducts.find(sp => sp.productId === prod.id);
    if (exists) {
      setForm(f => ({ ...f, selectedProducts: f.selectedProducts.map(sp => sp.productId === prod.id ? { ...sp, quantity: sp.quantity + 1 } : sp) }));
    } else {
      setForm(f => ({ ...f, selectedProducts: [...f.selectedProducts, { productId: prod.id, name: prod.name, price: prod.price, unit: prod.unit, quantity: 1 }] }));
    }
    setAddProdId("");
  };
  const removeProd = (prodId) => setForm(f => ({ ...f, selectedProducts: f.selectedProducts.filter(sp => sp.productId !== prodId) }));
  const changeProdQty = (prodId, qty) => {
    if (qty <= 0) { removeProd(prodId); return; }
    const prod = products.find(p => p.id === prodId);
    const max  = prod?.stockCurrent || 99;
    setForm(f => ({ ...f, selectedProducts: f.selectedProducts.map(sp => sp.productId === prodId ? { ...sp, quantity: Math.min(qty, max) } : sp) }));
  };

  // ── Display ───────────────────────────────────────────────────
  const getServiceDisplay = (a) => {
    const primary = services.find(s => s.id === a.serviceId);
    const extras  = (a.extraServices || []).map(es => es.name || services.find(s => s.id === es.serviceId)?.name || "").filter(Boolean);
    return [primary?.name, ...extras].filter(Boolean).join(" + ") || "—";
  };

  const getProductDisplay = (a) => {
    const prods = (a.productsSold || []);
    if (!prods.length) return null;
    return prods.map(p => p.name + (p.quantity > 1 ? ` ×${p.quantity}` : "")).join(" + ");
  };

  const hasProdsSold = (a) => (a.productsSold || []).length > 0;

  const periodLabel = filterFrom === filterTo
    ? fDate(filterFrom)
    : `${fDate(filterFrom)} → ${fDate(filterTo)}`;

  const filtered = useMemo(() =>
    attendances
      .filter(a =>
        (!filterFrom || a.date >= filterFrom) &&
        (!filterTo   || a.date <= filterTo)   &&
        (!filterBarber || a.barberId === +filterBarber)
      )
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time)),
    [attendances, filterFrom, filterTo, filterBarber]
  );

  // ── Save ──────────────────────────────────────────────────────
  const save = async () => {
    const isNewClient = form.clientId === "__new__";
    if (!isNewClient && !form.clientId || !form.barberId || form.selectedServices.length === 0)
      return setErr("Preencha cliente, barbeiro e pelo menos um serviço.");
    if (isNewClient && !form.newClientName.trim())
      return setErr("Preencha o nome do novo cliente.");
    setSaving(true); setErr("");
    try {
      // Se for novo cliente, cadastra primeiro
      let finalClientId = +form.clientId;
      if (isNewClient) {
        const newClientRows = await api.insert("clients", {
          name:         form.newClientName.trim(),
          whatsapp:     form.newClientPhone.trim() || null,
          phone:        form.newClientPhone.trim() || null,
          barbershop_id: barbershopId,
          points:       0,
        }, token);
        finalClientId = newClientRows[0].id;
        if (setClients) setClients(prev => [...prev, toClient(newClientRows[0])].sort((a,b) => a.name.localeCompare(b.name)));
      }

      const [primary, ...extras] = form.selectedServices;

      // Validar estoque dos produtos selecionados
      for (const sp of form.selectedProducts) {
        const prod = products.find(p => p.id === sp.productId);
        if (prod && sp.quantity > prod.stockCurrent)
          throw new Error(`Estoque insuficiente para "${sp.name}" (disponível: ${prod.stockCurrent}).`);
      }

      // 1. Salva o atendimento (preço = serviços)
      const productsSoldPayload = form.selectedProducts.map(sp => ({
        productId: sp.productId, name: sp.name, price: sp.price, quantity: sp.quantity, unit: sp.unit,
      }));
      const rows = await api.insert("attendances", {
        client_id: finalClientId, barber_id: +form.barberId,
        service_id: primary.serviceId, price: totalPrice, services_price: totalServices,
        payment: form.payment, date: form.date, time: form.time,
        notes: form.notes, extra_services: extras,
        products_sold: productsSoldPayload,
        barbershop_id: barbershopId,
      }, token);
      setAttendances(prev => [toAtt(rows[0]), ...prev]);

      // 2. Para cada produto: cria product_sale + decrementa estoque + movimento
      for (const sp of form.selectedProducts) {
        {
          const saleRows = await api.insert("product_sales", {
            product_id:    sp.productId,
            barber_id:     +form.barberId || null,
            barbershop_id: barbershopId,
            quantity:      sp.quantity,
            unit_price:    sp.price,
            total_price:   sp.price * sp.quantity,
            payment:       form.payment,
            sold_at:       new Date().toISOString(),
          }, token);
          if (setProductSales) setProductSales(prev => [toProductSale(saleRows[0]), ...prev]);

          const newStock = Math.max(0, (products.find(p => p.id === sp.productId)?.stockCurrent || 0) - sp.quantity);
          await api.update("products", sp.productId, { stock_current: newStock }, token);
          if (setProducts) setProducts(ps => ps.map(p => p.id === sp.productId ? { ...p, stockCurrent: newStock } : p));

          await api.insert("stock_movements", {
            product_id: sp.productId, barbershop_id: barbershopId,
            type: "venda", quantity: sp.quantity, reason: "Venda via atendimento",
          }, token);
        }
      }

      setShowModal(false); setForm(emptyForm());
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  const del = async id => {
    await api.remove("attendances", id, token);
    setAttendances(prev => prev.filter(a => a.id !== id));
  };

  // Finaliza atendimento Pendente via RPC SECURITY DEFINER (bypassa RLS para admin e barbeiro)
  const finalize = async (id) => {
    setFinSaving(true);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/finalize_attendance`, {
        method: "POST",
        headers: hdr(token),
        body: JSON.stringify({ p_attendance_id: id, p_payment: finPay }),
      });
      setAttendances(prev => prev.map(a => a.id === id ? { ...a, payment: finPay } : a));
      setFinalModal(null);
      setFinPay("PIX");
    } catch(e) { console.error(e); }
    setFinSaving(false);
  };

  const payColor = { "PIX": T.info, "Dinheiro": T.success, "Cartão Débito": T.accent, "Cartão Crédito": T.accent, "Pendente": "#f59e0b" };
  const stCell   = { padding: "9px 0.75rem" };

  return (
    <div>
      <PageHeader
        title="Atendimentos"
        sub={`${filtered.length} atendimento${filtered.length !== 1 ? "s" : ""} · ${R$(filtered.reduce((s, a) => s + a.price, 0))} · ${periodLabel}`}
        onRefresh={onRefresh}
        right={<Btn onClick={() => { setForm(emptyForm()); setShowModal(true); }}><Plus size={15}/>Novo Atendimento</Btn>}
      />

      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap", alignItems: "center" }}>
        {/* Filtro de período */}
        <DateRangePicker
          from={filterFrom}
          to={filterTo}
          onChange={({ from, to }) => { setFilterFrom(from); setFilterTo(to); }}
        />

        {isAdmin && (
          <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)}
            style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.5rem 0.875rem", color: filterBarber ? T.text : T.muted, fontSize: 13, outline: "none", fontFamily: "'DM Sans', sans-serif", flex: "1 1 160px" }}>
            <option value="">Todos os barbeiros</option>
            {barbers.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        <Btn variant="ghost" sm onClick={() => { const t = today(); setFilterFrom(t.substring(0,7)+"-01"); setFilterTo(t); setFilterBarber(""); }}>
          Mês atual
        </Btn>

      </div>

      <Card style={{ padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 700, borderCollapse: "collapse", fontSize: 13 }}>
          <THead cols={["Horário", "Cliente", "Barbeiro", "Serviços", "Produtos", "Valor", "Pagamento", "Data", ""]} />
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: T.muted }}>Nenhum atendimento encontrado</td></tr>
            ) : filtered.map(a => {
              const cl = clients.find(c => c.id === a.clientId), br = barbers.find(b => b.id === a.barberId);
              const prodDisplay = getProductDisplay(a);
              return (
                <tr key={a.id} style={{ borderTop: `1px solid ${T.borderLight}` }}>
                  <td style={{ ...stCell, color: T.muted, fontVariantNumeric: "tabular-nums" }}>{a.time}</td>
                  <td style={{ ...stCell, color: T.text, fontWeight: 500 }}>
                    {cl?.name || "—"}
                    {a.source === "appointment" && (
                      <span style={{ marginLeft:6, background:`${T.accent}22`, color:T.accent, borderRadius:4, padding:"1px 5px", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}>📅 Agendado</span>
                    )}
                  </td>
                  <td style={{ ...stCell, color: T.muted }}>{br?.name || "—"}</td>

                  {/* Serviços */}
                  <td style={{ ...stCell, color: T.text }}>
                    {getServiceDisplay(a)}
                    {(a.servicesPrice ?? a.price) > 0 && (
                      <div style={{ color: T.success, fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                        {R$(a.servicesPrice ?? a.price)}
                      </div>
                    )}
                  </td>

                  {/* Produtos */}
                  <td style={{ ...stCell }}>
                    {prodDisplay ? (
                      <div>
                        <span style={{ color: T.accent, fontWeight: 500 }}>{prodDisplay}</span>
                        <div style={{ color: T.accent, fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                          {R$(a.price - (a.servicesPrice ?? a.price))}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: T.muted, fontSize: 12 }}>—</span>
                    )}
                  </td>

                  <td style={{ ...stCell, color: a.payment === "Pendente" ? T.muted : T.success, fontWeight: 700 }}>
                    {R$(a.price)}
                    {a.payment === "Pendente" && <div style={{ fontSize:10, color:T.muted, fontWeight:400 }}>Aguardando</div>}
                  </td>
                  <td style={stCell}>
                    <span style={{ background: (payColor[a.payment] || T.accent) + "18", color: payColor[a.payment] || T.accent, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{a.payment}</span>
                  </td>
                  <td style={{ ...stCell, color: T.muted, fontSize: 12 }}>{fDate(a.date)}</td>
                  <td style={{ ...stCell, textAlign: "right" }}>
                    <div style={{ display:"flex", gap:6, justifyContent:"flex-end", alignItems:"center" }}>
                      {a.payment === "Pendente" && (
                        <Btn sm onClick={() => { setFinalModal(a.id); setFinPay("PIX"); }}>
                          <Check size={12}/> Finalizar
                        </Btn>
                      )}
                      <button onClick={() => del(a.id)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "inline-flex" }}><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {finalModal && (
        <Modal title="Finalizar Atendimento" onClose={() => setFinalModal(null)}>
          <p style={{ color:T.muted, fontSize:14, marginBottom:"1rem" }}>
            Selecione a forma de pagamento para contabilizar este atendimento no financeiro.
          </p>
          <FSelect label="Forma de pagamento" value={finPay} onChange={e => setFinPay(e.target.value)}>
            {PAYMENT_OPTS.map(p => <option key={p}>{p}</option>)}
          </FSelect>
          <Row g="0.5rem" style={{ justifyContent:"flex-end", marginTop:"1rem" }}>
            <Btn variant="ghost" onClick={() => setFinalModal(null)}>Cancelar</Btn>
            <Btn onClick={() => finalize(finalModal)} disabled={finSaving}>
              {finSaving ? <RefreshCw size={13} style={{animation:"spin 1s linear infinite"}}/> : <Check size={13}/>}
              Confirmar
            </Btn>
          </Row>
        </Modal>
      )}

      {showModal && (
        <Modal title="Novo Atendimento" onClose={() => setShowModal(false)}>
          <ErrorBar msg={err}/>

          <FSelect label="Cliente" value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value, newClientName: "", newClientPhone: "" }))}>
            <option value="">Selecione o cliente</option>
            <option value="__new__">➕ Cadastrar novo cliente</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </FSelect>

          {form.clientId === "__new__" && (
            <div style={{ background:`${T.accent}0d`, border:`1px solid ${T.accent}33`, borderRadius:10, padding:"12px 14px", marginBottom:"1rem" }}>
              <div style={{ fontSize:11, color:T.accent, fontWeight:700, letterSpacing:1, marginBottom:10 }}>NOVO CLIENTE</div>
              <Row g="0.5rem">
                <FG label="Nome *" half>
                  <input style={inputSt} placeholder="Nome completo" value={form.newClientName}
                    onChange={e => setForm(f => ({ ...f, newClientName: e.target.value }))} />
                </FG>
                <FG label="WhatsApp" half>
                  <input style={inputSt} placeholder="(11) 99999-9999" value={form.newClientPhone}
                    onChange={e => setForm(f => ({ ...f, newClientPhone: e.target.value }))} />
                </FG>
              </Row>
            </div>
          )}

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
                <div>
                  <span style={{ color: T.mutedLight, fontSize: 13, fontWeight: 700 }}>Subtotal serviços</span>
                  {totalProducts > 0 && (
                    <div style={{ color: T.muted, fontSize: 10, marginTop: 1 }}>base da comissão do barbeiro</div>
                  )}
                </div>
                <span style={{ color: T.success, fontSize: 14, fontWeight: 800 }}>{R$(totalServices)}</span>
              </div>
            </div>
          )}

          {/* ── Produtos (opcional) ── */}
          {products.filter(p => p.active && p.stockCurrent > 0).length > 0 && (
            <FG label="Adicionar Produto (opcional)">
              <select style={{ ...inputSt, appearance: "none" }} value={addProdId}
                onChange={e => { setAddProdId(e.target.value); addProd(e.target.value); }}>
                <option value="">Selecione um produto…</option>
                {products.filter(p => p.active && p.stockCurrent > 0).map(p =>
                  <option key={p.id} value={p.id}>{p.name} — {R$(p.price)} (estoque: {p.stockCurrent} {p.unit})</option>
                )}
              </select>
            </FG>
          )}

          {form.selectedProducts.length > 0 && (
            <div style={{ marginBottom: "1rem", border: `1px solid ${T.accent}33`, borderRadius: 10, overflow: "hidden" }}>
              {form.selectedProducts.map(sp => (
                <div key={sp.productId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: `1px solid ${T.borderLight}`, background: T.surface }}>
                  <span style={{ color: T.text, fontSize: 13, flex: 1 }}>{sp.name}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button onClick={() => changeProdQty(sp.productId, sp.quantity - 1)}
                      style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, width: 24, height: 24, borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1 }}>−</button>
                    <span style={{ color: T.text, fontSize: 13, fontWeight: 700, minWidth: 22, textAlign: "center" }}>{sp.quantity}</span>
                    <button onClick={() => changeProdQty(sp.productId, sp.quantity + 1)}
                      style={{ background: T.card, border: `1px solid ${T.border}`, color: T.text, width: 24, height: 24, borderRadius: 5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, lineHeight: 1 }}>+</button>
                  </div>
                  <span style={{ color: T.accent, fontSize: 13, fontWeight: 700, minWidth: 64, textAlign: "right" }}>{R$(sp.price * sp.quantity)}</span>
                  <button onClick={() => removeProd(sp.productId)} style={{ background: "none", border: "none", color: T.danger, cursor: "pointer", display: "inline-flex", padding: 2 }}><X size={14}/></button>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: T.card }}>
                <span style={{ color: T.mutedLight, fontSize: 13, fontWeight: 700 }}>Subtotal produtos</span>
                <span style={{ color: T.accent, fontSize: 14, fontWeight: 800 }}>{R$(totalProducts)}</span>
              </div>
            </div>
          )}

          {/* Total geral (quando há serviços + produtos) */}
          {form.selectedServices.length > 0 && form.selectedProducts.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: T.accentGlow, border: `1px solid ${T.accent}44`, borderRadius: 8, padding: "10px 14px", marginBottom: "1rem" }}>
              <span style={{ color: T.accent, fontSize: 13, fontWeight: 800 }}>Total geral</span>
              <span style={{ color: T.accent, fontSize: 16, fontWeight: 900 }}>{R$(totalServices + totalProducts)}</span>
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
function ClientsView({ clients, setClients, attendances, services, token, isAdmin, barbershopId, onRefresh }) {
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
        onRefresh={onRefresh}
        right={<Btn onClick={openAdd}><Plus size={15}/>Novo Cliente</Btn>}
      />
      <div style={{ position:"relative", marginBottom:"1rem" }}>
        <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:T.muted }}/>
        <input placeholder="Buscar por nome ou telefone…" value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inputSt, paddingLeft:"2.5rem" }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:selected?"1fr 360px":"1fr", gap:"1.5rem" }}>
        <Card style={{ padding:0, overflowX:"auto" }}>
          <table style={{ width:"100%", minWidth:480, borderCollapse:"collapse", fontSize:13 }}>
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
function BarbersView({ barbers, setBarbers, attendances, token, barbershopId, onRefresh, isMobile }) {
  const [showModal,  setShowModal]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState("");
  const [form,       setForm]       = useState({ name:"", phone:"", commission:40, status:"active", email:"", password:"", notificationEmail:"" });
  const [availBarber,setAvailBarber]= useState(null);
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
        if (data.error || data.msg) {
          const raw = (data.error?.message || data.msg || "").toLowerCase();
          if (raw.includes("already registered") || raw.includes("already exists") || raw.includes("user already")) {
            throw new Error("Este e-mail já possui uma conta no sistema. Use um e-mail diferente para o login deste barbeiro, ou deixe os campos de e-mail e senha em branco para cadastrá-lo sem acesso ao painel.");
          }
          throw new Error(data.error?.message || data.msg || "Erro ao criar login.");
        }
        userId = data.user?.id;
      }

      const body = { name:form.name, phone:form.phone, commission:+form.commission, status:form.status, user_id: userId, barbershop_id: barbershopId, notification_email: form.notificationEmail.trim() || null };

      if (editing) {
        await api.update("barbers", editing, body, token);
        setBarbers(bs=>bs.map(b=>b.id===editing?{...b,...toBarber({...body,id:editing,user_id:userId})}:b));
      } else {
        const rows = await api.insert("barbers", body, token);
        const newBarber = toBarber(rows[0]);
        setBarbers(bs=>[...bs, newBarber]);

        // Vincular perfil via RPC SECURITY DEFINER — bypassa RLS, funciona sempre
        if (userId) {
          await fetch(`${SUPABASE_URL}/rest/v1/rpc/link_barber_profile`, {
            method: "POST",
            headers: hdr(token),
            body: JSON.stringify({
              p_user_id:        userId,
              p_barbershop_id:  barbershopId,
              p_barber_id:      newBarber.id,
            }),
          });
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
        onRefresh={onRefresh}
        right={<Btn onClick={()=>{setEditing(null);setForm({name:"",phone:"",commission:40,status:"active",email:"",password:"",notificationEmail:""});setShowModal(true);}}><Plus size={15}/>Novo Barbeiro</Btn>}
      />
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap:"1rem" }}>
        {barbers.map(b=>{
          const bA          = monthAtts.filter(a => a.barberId === b.id);
          const total       = bA.reduce((s, a) => s + a.price, 0);                          // total pago pelo cliente
          const servTotal   = bA.reduce((s, a) => s + (a.servicesPrice ?? a.price), 0);     // base da comissão
          const commission  = servTotal * b.commission / 100;
          return (
            <Card key={b.id} style={{ opacity:b.status==="inactive"?0.55:1 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"1rem" }}>
                <div style={{ width:52, height:52, borderRadius:"50%", background:T.accentGlow, border:`1px solid ${T.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:T.accent }}>{b.name.charAt(0)}</div>
                <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                  <Badge color={b.status==="active"?T.success:T.muted}>{b.status==="active"?"Ativo":"Inativo"}</Badge>
                  <button onClick={()=>setAvailBarber(b)} title="Configurar disponibilidade" style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Clock size={14}/></button>
                  <button onClick={()=>{setEditing(b.id);setForm({...b, notificationEmail: b.notificationEmail||""});setShowModal(true);}} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Edit2 size={14}/></button>
                </div>
              </div>
              <div style={{ fontWeight:600, color:T.text, marginBottom:3 }}>{b.name}</div>
              {b.phone&&<div style={{ fontSize:12, color:T.muted, marginBottom:4, display:"flex", alignItems:"center", gap:5 }}><Phone size={11}/>{b.phone}</div>}
              {b.notificationEmail&&<div style={{ fontSize:12, color:T.muted, marginBottom:4, display:"flex", alignItems:"center", gap:5 }}>✉ {b.notificationEmail}</div>}
              {b.userId&&<div style={{ fontSize:11, color:T.success+"aa", marginBottom:"0.75rem", display:"flex", alignItems:"center", gap:4 }}><Check size={11}/>Login configurado</div>}
              {!b.userId&&<div style={{ fontSize:11, color:T.muted, marginBottom:"0.75rem" }}>⚠ Sem login configurado</div>}
              <div style={{ borderTop:`1px solid ${T.borderLight}`, paddingTop:"1rem", display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.75rem" }}>
                {[["Comissão",b.commission+"%",T.accent,"big"],["Aten. Mês",bA.length,T.text,"big"],["Total Mês",R$(total),T.success,"sm"],["A receber",R$(commission),T.accent,"sm"]].map(([l,v,c,sz])=>(
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
          <FInput label="E-mail para notificações" type="email" value={form.notificationEmail} onChange={setF("notificationEmail")} placeholder="barbeiro@email.com"/>
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
      {availBarber && (
        <AvailabilityModal
          barberId={availBarber.id}
          barberName={availBarber.name}
          barbershopId={barbershopId}
          token={token}
          onClose={() => setAvailBarber(null)}
        />
      )}
    </div>
  );
}

// ── SERVICES ─────────────────────────────────────────────────
function ServicesView({ services, setServices, token, barbershopId, onRefresh }) {
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
        onRefresh={onRefresh}
        right={<Btn onClick={()=>{setEditing(null);setForm({name:"",price:"",duration:30,active:true});setShowModal(true);}}><Plus size={15}/>Novo Serviço</Btn>}
      />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:"1rem" }}>
        {services.map(svc=>(
          <Card key={svc.id} style={{ opacity:svc.active?1:0.5, minWidth:0 }}>
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
function FinancialView({ attendances, expenses, setExpenses, token, barbershopId, barbers = [], isMobile, productSales = [], onRefresh }) {
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
  const rangeAtts     = attendances.filter(a => a.date >= filterFrom && a.date <= filterTo);
  const rangeExp      = expenses.filter(e => e.date >= filterFrom && e.date <= filterTo);
  const rangeProdSales = productSales.filter(s => s.date >= filterFrom && s.date <= filterTo);

  const totalServRev     = rangeAtts.reduce((s,a) => s + (a.servicesPrice ?? a.price), 0); // somente serviços
  const totalProdRev     = rangeProdSales.reduce((s,ps) => s + ps.totalPrice, 0);
  const totalRev         = totalServRev + totalProdRev;
  const totalExp         = rangeExp.reduce((s,e) => s + e.amount, 0);
  const totalCommissions = rangeAtts.reduce((s,a) => {
    const b = barbers.find(x => x.id === a.barberId);
    return s + ((a.servicesPrice ?? a.price) * (b?.commission || 0) / 100); // comissão sobre serviços
  }, 0);
  const profit = totalRev - totalExp - totalCommissions;

  const byPay = {};
  rangeAtts.forEach(a => { byPay[a.payment] = (byPay[a.payment] || 0) + a.price; });

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
        onRefresh={onRefresh}
        right={<Btn onClick={() => setShowModal(true)}><Plus size={15}/>Registrar Despesa</Btn>}
      />

      {/* ── Filtro de período ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:"1.5rem", flexWrap:"wrap", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "center" }}>
        <DateRangePicker
          from={filterFrom}
          to={filterTo}
          onChange={({ from, to }) => { setFilterFrom(from); setFilterTo(to); }}
        />
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap:"1rem", marginBottom:"1.5rem" }}>
        <StatCard
          label="RECEITAS"
          value={R$(totalRev)}
          color={T.success}
          icon={DollarSign}
          sub={totalProdRev > 0 ? `${rangeAtts.length} atend. + ${R$(totalProdRev)} produtos` : `${rangeAtts.length} atendimento${rangeAtts.length !== 1 ? "s" : ""}`}
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
      <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap:"1.5rem" }}>
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
    <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch", marginBottom:20 }}>
      <table style={{ width:"100%", minWidth: cols.length > 4 ? 520 : 320, borderCollapse:"collapse", fontSize:12 }}>
        <thead>
          <tr style={{ background:"#f5f5f5" }}>
            {cols.map(c => <th key={c} style={{ padding:"7px 8px", textAlign:"left", fontWeight:700, borderBottom:"1px solid #ddd", whiteSpace:"nowrap", fontSize:11 }}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r,i) => (
            <tr key={i} style={{ background: i%2===1?"#fafafa":"white", borderBottom:"1px solid #eee" }}>
              {r.map((cell,j) => <td key={j} style={{ padding:"7px 8px", ...( cell?.style||{} ) }}>{cell?.val !== undefined ? cell.val : cell}</td>)}
            </tr>
          ))}
          {totalRow && (
            <tr style={{ background:"#f0f0f0", fontWeight:700, borderTop:"2px solid #ddd" }}>
              {totalRow.map((cell,j) => <td key={j} style={{ padding:"7px 8px", whiteSpace:"nowrap" }}>{cell}</td>)}
            </tr>
          )}
        </tbody>
      </table>
    </div>
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
    <div style={{ borderBottom:`2px solid ${reportAccent}`, paddingBottom:12, marginBottom:20 }}>
      {/* Linha superior: logo + nome (esquerda) | data (direita) */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8 }}>
        {/* Logo + nome */}
        <div style={{ display:"flex", alignItems:"center", gap:12, flexShrink:1, minWidth:0, maxWidth:"65%" }}>
          <div style={{ width:52, height:52, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <img
              src={reportLogo}
              alt={reportName}
              style={{ maxWidth:52, maxHeight:52, width:"auto", height:"auto", objectFit:"contain", display:"block" }}
              onError={(e) => { e.currentTarget.src = ozBarberLogo; }}
            />
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:"Arial, sans-serif", color:reportAccent, lineHeight:1.2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {reportName}
            </div>
            <div style={{ fontSize:12, color:"#555", marginTop:2, whiteSpace:"nowrap" }}>{title}</div>
          </div>
        </div>

        {/* Data — direita */}
        <div style={{ textAlign:"right", fontSize:11, color:"#666", lineHeight:1.8, flexShrink:0 }}>
          <div>Mês: {selMonth}</div>
          <div>Gerado em: {new Date().toLocaleDateString("pt-BR")}</div>
        </div>
      </div>
    </div>
  );
}

function RevenueReportContent({ attendances, expenses, barbers = [], selMonth, shop }) {
  const mStr   = selMonth;
  const mAtts  = attendances.filter(a => a.date.startsWith(mStr));
  const mExp   = expenses.filter(e => e.date.startsWith(mStr));

  // Receita separada por serviços e produtos
  const mServRev = mAtts.reduce((s,a) => s + (a.servicesPrice ?? a.price), 0);
  const mRev     = mAtts.reduce((s,a) => s + a.price, 0);
  const mProdRev = mRev - mServRev;

  const mExpT = mExp.reduce((s,e) => s + e.amount, 0);
  const mCommissions = mAtts.reduce((s,a) => {
    const b = barbers.find(x => x.id === a.barberId);
    return s + ((a.servicesPrice ?? a.price) * (b?.commission || 0) / 100);
  }, 0);
  const profit = mRev - mExpT - mCommissions;

  const byPay = {};
  mAtts.forEach(a => { byPay[a.payment] = (byPay[a.payment] || 0) + a.price; });

  // Comissões por barbeiro com breakdown serviços / produtos
  const barberCommissions = barbers
    .map(b => {
      const bAtts    = mAtts.filter(a => a.barberId === b.id);
      const bTotal   = bAtts.reduce((s,a) => s + a.price, 0);
      const bServRev = bAtts.reduce((s,a) => s + (a.servicesPrice ?? a.price), 0);
      const bProdRev = bTotal - bServRev;
      const bComm    = bServRev * (b.commission || 0) / 100;
      return { name: b.name, pct: b.commission || 0, servRev: bServRev, prodRev: bProdRev, total: bTotal, commission: bComm, count: bAtts.length };
    })
    .filter(x => x.count > 0)
    .sort((a, b) => b.total - a.total);

  const accentColor = shop?.accent_color || "#b5a642";

  return (
    <div style={{ fontFamily:"Arial, sans-serif", color:"#111", background:"white", padding:28 }}>
      <ReportHeader title="Relatório de Faturamento" selMonth={selMonth} shop={shop} />

      {/* Resumo — 6 cards: Serviços | Produtos | Total | Comissões | Despesas | Lucro */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(110px, 1fr))", gap:8, marginBottom:20 }}>
        {[
          ["Rec. Serviços", R$(mServRev), "#166534"],
          ["Rec. Produtos", R$(mProdRev), "#1e40af"],
          ["Total Mês",     R$(mRev),     "#111"],
          ["Comissões",     R$(mCommissions), accentColor],
          ["Despesas",      R$(mExpT),        "#991b1b"],
          ["Lucro Mês",     R$(profit),       "#166534"],
        ].map(([l,v,c]) => (
          <div key={l} style={{ border:"1px solid #ddd", borderRadius:6, padding:"8px 10px", textAlign:"center" }}>
            <div style={{ fontSize:9, color:"#888", textTransform:"uppercase", marginBottom:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{l}</div>
            <div style={{ fontSize:15, fontWeight:700, color:c, whiteSpace:"nowrap" }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Formas de Pagamento */}
      <div style={{ fontSize:14, fontWeight:700, marginBottom:8, borderBottom:"1px solid #eee", paddingBottom:4 }}>Formas de Pagamento</div>
      <ReportTable
        cols={["Método","Total","% Receita"]}
        rows={Object.entries(byPay).map(([m,v]) => [m, {val:R$(v), style:{fontWeight:600}}, mRev>0 ? ((v/mRev)*100).toFixed(1)+"%" : "0%"])}
      />

      {/* Comissões por Barbeiro */}
      <div style={{ fontSize:14, fontWeight:700, marginBottom:8, borderBottom:"1px solid #eee", paddingBottom:4 }}>Comissões do Mês</div>
      <div style={{ fontSize:11, color:"#888", marginBottom:8, fontStyle:"italic" }}>
        * Comissão calculada somente sobre o valor de serviços prestados.
      </div>
      {barberCommissions.length > 0 ? (
        <ReportTable
          cols={["Barbeiro","Atend.","Serviços","Produtos","Total","% Comissão","Comissão (s/ serv.)"]}
          rows={barberCommissions.map(x => [
            {val: x.name, style:{fontWeight:600}},
            x.count,
            {val: R$(x.servRev), style:{color:"#166534", fontWeight:600}},
            {val: R$(x.prodRev), style:{color:"#1e40af", fontWeight:600}},
            {val: R$(x.total),   style:{fontWeight:700}},
            x.pct + "%",
            {val: R$(x.commission), style:{fontWeight:700, color: accentColor}},
          ])}
          totalRow={[
            "TOTAL","",
            R$(mServRev),
            R$(mProdRev),
            R$(mRev),
            "",
            R$(mCommissions),
          ]}
        />
      ) : (
        <div style={{ fontSize:13, color:"#888", marginBottom:16, paddingBottom:12, borderBottom:"1px solid #eee" }}>
          Nenhuma comissão registrada no período.
        </div>
      )}

      {/* Despesas */}
      <div style={{ fontSize:14, fontWeight:700, marginBottom:8, borderBottom:"1px solid #eee", paddingBottom:4 }}>Despesas do Mês</div>
      <ReportTable
        cols={["Descrição","Categoria","Data","Valor"]}
        rows={mExp.map(e => [e.desc, e.category, fDate(e.date), {val:R$(e.amount), style:{fontWeight:600}}])}
        totalRow={["TOTAL DESPESAS","","", R$(mExpT)]}
      />

      <ReportFooter />
    </div>
  );
}

function BarberReportContent({ attendances, services, barbers, selMonth, shop }) {
  const mAtts = attendances.filter(a => a.date.startsWith(selMonth));
  const accentColor = shop?.accent_color || "#b5a642";

  const stats = barbers.filter(b=>b.status==="active").map(b=>{
    const bA       = mAtts.filter(a=>a.barberId===b.id);
    const total    = bA.reduce((s,a)=>s+a.price,0);
    const servOnly = bA.reduce((s,a)=>s+(a.servicesPrice??a.price),0);
    const prodOnly = total - servOnly;
    const commission = servOnly * b.commission / 100;
    const sm={}; bA.forEach(a=>{const sv=services.find(sv=>sv.id===a.serviceId);if(sv)sm[sv.name]=(sm[sv.name]||0)+1;});
    const top=Object.entries(sm).sort((a,b)=>b[1]-a[1])[0];
    return {b, count:bA.length, total, servOnly, prodOnly, commission, ticket:bA.length?total/bA.length:0, top:top?top[0]+" ("+top[1]+"×)":"—"};
  }).sort((a,b)=>b.total-a.total);

  return (
    <div style={{ fontFamily:"Arial, sans-serif", color:"#111", background:"white", padding:28 }}>
      <ReportHeader title="Relatório por Barbeiro" selMonth={selMonth} shop={shop} />
      <div style={{ fontSize:11, color:"#888", marginBottom:8, fontStyle:"italic" }}>
        * Comissão calculada somente sobre o valor de serviços prestados.
      </div>
      <ReportTable
        cols={["#","Barbeiro","Atend.","Serviços","Produtos","Total","Comissão*","Ticket Méd."]}
        rows={stats.map(({b,count,total,servOnly,prodOnly,commission,ticket},i)=>[
          {val:i+1, style:{color:accentColor, fontWeight:700}},
          {val:b.name, style:{fontWeight:600}},
          count,
          {val:R$(servOnly), style:{color:"#166534", fontWeight:600}},
          {val:R$(prodOnly), style:{color:"#1e40af", fontWeight:600}},
          {val:R$(total),    style:{fontWeight:700}},
          {val:R$(commission)+" ("+b.commission+"%)", style:{color:accentColor, fontWeight:600}},
          R$(ticket),
        ])}
        totalRow={[
          "TOTAL GERAL","",
          stats.reduce((s,x)=>s+x.count,0),
          R$(stats.reduce((s,x)=>s+x.servOnly,0)),
          R$(stats.reduce((s,x)=>s+x.prodOnly,0)),
          R$(stats.reduce((s,x)=>s+x.total,0)),
          R$(stats.reduce((s,x)=>s+x.commission,0)),
          "",
        ]}
      />
      <ReportFooter />
    </div>
  );
}

function ServiceReportContent({ attendances, services, selMonth, shop }) {
  const mAtts      = attendances.filter(a => a.date.startsWith(selMonth));
  const accentColor = shop?.accent_color || "#b5a642";

  // ── Ranking de Serviços ───────────────────────────────────────
  // Conta serviço primário + extras; usa servicesPrice como receita do primário
  const sm = {};
  mAtts.forEach(a => {
    const servRev = a.servicesPrice ?? a.price; // receita de serviços do atendimento

    // Serviço primário
    const prim = services.find(sv => sv.id === a.serviceId);
    if (prim) {
      if (!sm[prim.id]) sm[prim.id] = { name: prim.name, price: prim.price, count: 0, total: 0 };
      sm[prim.id].count++;
      sm[prim.id].total += prim.price; // usa preço de tabela do serviço
    }

    // Serviços extras
    (a.extraServices || []).forEach(es => {
      const sv = es.serviceId ? services.find(x => x.id === es.serviceId) : null;
      const name  = sv?.name  || es.name  || "Serviço extra";
      const price = sv?.price || es.price || 0;
      const key   = sv?.id    || name;
      if (!sm[key]) sm[key] = { name, price, count: 0, total: 0 };
      sm[key].count++;
      sm[key].total += price;
    });
  });
  const svcRows = Object.values(sm).sort((a, b) => b.total - a.total);
  const svcGt   = svcRows.reduce((s, r) => s + r.total, 0);

  // ── Ranking de Produtos ───────────────────────────────────────
  const pm = {};
  mAtts.forEach(a => {
    (a.productsSold || []).forEach(p => {
      const key = p.productId || p.name;
      if (!pm[key]) pm[key] = { name: p.name, price: p.price, count: 0, total: 0 };
      pm[key].count += p.quantity || 1;
      pm[key].total += p.price * (p.quantity || 1);
    });
  });
  const prodRows = Object.values(pm).sort((a, b) => b.total - a.total);
  const prodGt   = prodRows.reduce((s, r) => s + r.total, 0);

  return (
    <div style={{ fontFamily:"Arial, sans-serif", color:"#111", background:"white", padding:28 }}>
      <ReportHeader title="Relatório por Atendimento" selMonth={selMonth} shop={shop} />

      {/* ── Serviços ── */}
      <div style={{ fontSize:14, fontWeight:700, marginBottom:8, borderBottom:"1px solid #eee", paddingBottom:4 }}>
        Ranking de Serviços
      </div>
      {svcRows.length > 0 ? (
        <ReportTable
          cols={["#","Serviço","Preço Tabela","Qtd.","Total Gerado","% Receita"]}
          rows={svcRows.map(({name,price,count,total},i)=>[
            {val:i+1, style:{color:accentColor, fontWeight:700}},
            {val:name, style:{fontWeight:600}},
            {val:R$(price), style:{color:"#555"}},
            count+"×",
            {val:R$(total), style:{color:"#166534", fontWeight:700}},
            {val:(svcGt>0?((total/svcGt)*100).toFixed(1):0)+"%", style:{color:"#555"}},
          ])}
          totalRow={["TOTAL","", svcRows.reduce((s,r)=>s+r.count,0)+"×", R$(svcGt),"",""]}
        />
      ) : (
        <div style={{ fontSize:13, color:"#888", marginBottom:16, paddingBottom:12, borderBottom:"1px solid #eee" }}>
          Nenhum serviço registrado no período.
        </div>
      )}

      {/* ── Produtos ── */}
      <div style={{ fontSize:14, fontWeight:700, margin:"20px 0 8px", borderBottom:"1px solid #eee", paddingBottom:4 }}>
        Ranking de Produtos Vendidos em Atendimentos
      </div>
      {prodRows.length > 0 ? (
        <ReportTable
          cols={["#","Produto","Preço Unit.","Qtd.","Total Gerado","% Receita"]}
          rows={prodRows.map(({name,price,count,total},i)=>[
            {val:i+1, style:{color:accentColor, fontWeight:700}},
            {val:name, style:{fontWeight:600}},
            {val:R$(price), style:{color:"#555"}},
            count+"×",
            {val:R$(total), style:{color:"#1e40af", fontWeight:700}},
            {val:(prodGt>0?((total/prodGt)*100).toFixed(1):0)+"%", style:{color:"#555"}},
          ])}
          totalRow={["TOTAL","", prodRows.reduce((s,r)=>s+r.count,0)+"×", R$(prodGt),"",""]}
        />
      ) : (
        <div style={{ fontSize:13, color:"#888", marginBottom:16, paddingBottom:12, borderBottom:"1px solid #eee" }}>
          Nenhum produto vendido via atendimento no período.
        </div>
      )}

      <ReportFooter />
    </div>
  );
}

function ReportsView({ attendances, clients, services, barbers, expenses, shop, isMobile, onRefresh }) {
  const [selMonth, setSelMonth] = useState(month());
  const [preview, setPreview]   = useState(null);
  const [printing, setPrinting] = useState(false);

  const mAtts        = attendances.filter(a => a.date.startsWith(selMonth));
  const mExp         = expenses.filter(e => e.date.startsWith(selMonth));
  const mRev         = mAtts.reduce((s,a)=>s+a.price,0);
  const mExpT        = mExp.reduce((s,e)=>s+e.amount,0);
  const mCommissions = mAtts.reduce((s,a)=>{ const b=barbers.find(x=>x.id===a.barberId); return s+((a.servicesPrice??a.price)*(b?.commission||0)/100); },0); // comissão sobre serviços
  const mProfit      = mRev - mExpT - mCommissions;

  const REPORTS = [
    { id:"revenue",  label:"Faturamento",     desc:"Receitas, despesas, lucro e formas de pagamento",          Icon:DollarSign, color:T.success },
    { id:"barbers",  label:"Por Barbeiro",     desc:"Ranking, produção, comissões e ticket médio",              Icon:Award,      color:T.accent  },
    { id:"services", label:"Por Atendimento",  desc:"Ranking de serviços e produtos vendidos no período",       Icon:Scissors,   color:T.info    },
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
          /* ── 1. Fundo branco em todo o papel (elimina retângulo preto) */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          /* ── 2. Esconde tudo exceto a área de impressão */
          body * { visibility: hidden !important; background-color: transparent !important; }
          #report-print-area,
          #report-print-area * { visibility: visible !important; }
          /* ── 3. Área de impressão cobre o papel inteiro */
          #report-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            z-index: 99999 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          /* ── 4. Tabelas: caber na largura A4 sem overflow */
          #report-print-area div {
            overflow: visible !important;
            max-width: 100% !important;
          }
          #report-print-area table {
            font-size: 9px !important;
            min-width: 0 !important;
            width: 100% !important;
            table-layout: auto !important;
          }
          #report-print-area th,
          #report-print-area td {
            padding: 4px 5px !important;
            font-size: 9px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          /* ── 5. Evita quebra de página no meio de linhas de tabela */
          #report-print-area tr { page-break-inside: avoid !important; }
          #report-print-area tbody tr:last-child { page-break-after: avoid !important; }
          /* ── 6. Rodapé fixo de marca */
          .report-brand-footer {
            position: fixed !important;
            left: 0 !important;
            right: 0 !important;
            bottom: 0.6cm !important;
            text-align: center !important;
            border-top: none !important;
            background: white !important;
          }
          @page { margin: 1.5cm; size: A4 portrait; }
        }
      `}</style>

      {preview && (
        <div id="report-print-area">
          {contentMap[preview]}
        </div>
      )}

      <PageHeader title="Relatórios" sub={"Mês: "+selMonth} onRefresh={onRefresh} right={
        <input type="month" value={selMonth} onChange={e=>setSelMonth(e.target.value)}
          style={{ background:T.card, border:"1px solid "+T.border, borderRadius:8, padding:"0.5rem 0.875rem", color:T.text, fontSize:13, outline:"none", fontFamily:"'DM Sans', sans-serif" }}/>
      }/>

      {!preview ? (
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap:"1rem" }}>
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
                  // Top 2 serviços
                  const sm={}; mAtts.forEach(a=>{ sm[a.serviceId]=(sm[a.serviceId]||0)+1; });
                  const topSvc = Object.entries(sm).sort((a,b)=>b[1]-a[1]).slice(0,2);
                  // Top 2 produtos (via productsSold nos atendimentos)
                  const pm={}; mAtts.forEach(a=>(a.productsSold||[]).forEach(p=>{ pm[p.name]=(pm[p.name]||0)+(p.quantity||1); }));
                  const topProd = Object.entries(pm).sort((a,b)=>b[1]-a[1]).slice(0,2);
                  return [
                    ...topSvc.map(([sid,n])=>{
                      const s=services.find(sv=>sv.id===+sid);
                      return s ? <div key={"s"+sid} style={{ background:T.surface, borderRadius:6, padding:"8px 10px" }}>
                        <div style={{ fontSize:9, color:T.muted, textTransform:"uppercase", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>✂ {s.name}</div>
                        <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{n}×</div>
                      </div> : null;
                    }),
                    ...topProd.map(([name,n])=>(
                      <div key={"p"+name} style={{ background:T.surface, borderRadius:6, padding:"8px 10px" }}>
                        <div style={{ fontSize:9, color:T.accent, textTransform:"uppercase", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>📦 {name}</div>
                        <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{n}×</div>
                      </div>
                    )),
                  ];
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
          <Card style={{ background:"white", color:"black", overflowX:"auto", padding: isMobile ? "0.5rem" : "1rem" }}>
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

function SettingsView({ token, shop, onShopUpdated, themeMode = "dark", onToggleTheme }) {
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

      {/* ── Card Tema ── */}
      <Card style={{ marginBottom:"1.25rem" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ background:T.accentGlow, borderRadius:12, padding:10, display:"flex" }}>
              {themeMode === "dark" ? <Moon size={19} color={T.accent}/> : <Sun size={19} color={T.accent}/>}
            </div>
            <div>
              <div style={{ color:T.text, fontWeight:800, fontSize:15 }}>
                Tema da interface
              </div>
              <div style={{ color:T.muted, fontSize:12, marginTop:2 }}>
                {themeMode === "dark"
                  ? "Modo Escuro ativo — fundo preto, ideal para ambientes com pouca luz."
                  : "Modo Claro ativo — fundo branco, ideal para ambientes iluminados."}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <span style={{ fontSize:12, fontWeight:700, color: themeMode === "light" ? T.accent : T.muted }}>
              Claro
            </span>
            <ThemeToggleSwitch isDark={themeMode === "dark"} onToggle={onToggleTheme}/>
            <span style={{ fontSize:12, fontWeight:700, color: themeMode === "dark" ? T.accent : T.muted }}>
              Escuro
            </span>
          </div>
        </div>
      </Card>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap:"1.25rem", alignItems:"start" }}>
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



// ── PRODUCTS ──────────────────────────────────────────────────
const UNIT_OPTS  = ["un", "ml", "g", "kg", "L", "cx", "pct"];

function ProductsView({ products, setProducts, productSales, setProductSales, barbers, token, barbershopId, isMobile, onRefresh }) {
  const [tab, setTab]             = useState("produtos");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [saving, setSaving]       = useState(false);
  const [err, setErr]             = useState("");

  const emptyForm = () => ({ name:"", description:"", price:"", cost:"0", stockCurrent:"0", stockMinimum:"5", unit:"un", active: true });
  const [form, setForm]           = useState(emptyForm());
  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  // Stock entry modal
  const [stockModal, setStockModal]   = useState(null);
  const [stockQty, setStockQty]       = useState("1");
  const [stockReason, setStockReason] = useState("");
  const [stockSaving, setStockSaving] = useState(false);

  // Sale modal
  const [saleModal, setSaleModal] = useState(null);
  const [saleForm, setSaleForm]   = useState({ qty:"1", barberId:"", payment:"PIX" });
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleErr, setSaleErr]     = useState("");

  const lowStock = products.filter(p => p.active && p.stockCurrent <= p.stockMinimum);

  const stockColor = p => {
    if (p.stockCurrent === 0) return T.danger;
    if (p.stockCurrent <= p.stockMinimum) return WARN_COLOR;
    return T.success;
  };

  // ── CRUD ──────────────────────────────────────────────────────
  const openAdd  = () => { setEditing(null); setForm(emptyForm()); setErr(""); setShowModal(true); };
  const openEdit = p  => { setEditing(p.id); setForm({ name:p.name, description:p.description, price:String(p.price), cost:String(p.cost), stockCurrent:String(p.stockCurrent), stockMinimum:String(p.stockMinimum), unit:p.unit, active:p.active }); setErr(""); setShowModal(true); };

  const saveProduct = async () => {
    if (!form.name || !form.price) return setErr("Nome e preço são obrigatórios.");
    setSaving(true); setErr("");
    try {
      const body = { name:form.name, description:form.description, price:+form.price, cost:+(form.cost||0), stock_current:+(form.stockCurrent||0), stock_minimum:+(form.stockMinimum||0), unit:form.unit||"un", active:form.active, barbershop_id:barbershopId };
      if (editing) {
        await api.update("products", editing, body, token);
        setProducts(ps => ps.map(p => p.id===editing ? toProduct({...body, id:editing}) : p));
      } else {
        const rows = await api.insert("products", body, token);
        setProducts(ps => [toProduct(rows[0]), ...ps]);
      }
      setShowModal(false);
    } catch(e) { setErr(e.message); }
    setSaving(false);
  };

  const delProduct = async id => {
    if (!window.confirm("Deletar produto?")) return;
    await api.remove("products", id, token);
    setProducts(ps => ps.filter(p => p.id !== id));
  };

  const toggleProduct = async p => {
    await api.update("products", p.id, { active: !p.active }, token);
    setProducts(ps => ps.map(x => x.id===p.id ? { ...x, active:!x.active } : x));
  };

  // ── STOCK ENTRY ───────────────────────────────────────────────
  const doStockEntry = async () => {
    const qty = +stockQty;
    if (!qty || qty <= 0) return;
    setStockSaving(true);
    try {
      const newStock = stockModal.stockCurrent + qty;
      await api.update("products", stockModal.id, { stock_current: newStock }, token);
      setProducts(ps => ps.map(p => p.id===stockModal.id ? { ...p, stockCurrent: newStock } : p));
      await api.insert("stock_movements", { product_id:stockModal.id, barbershop_id:barbershopId, type:"entrada", quantity:qty, reason:stockReason||"Entrada de estoque" }, token);
      setStockModal(null); setStockQty("1"); setStockReason("");
    } catch(e) { alert(e.message); }
    setStockSaving(false);
  };

  // ── SALE ──────────────────────────────────────────────────────
  const doSale = async () => {
    const qty = +saleForm.qty;
    if (!qty || qty <= 0) return setSaleErr("Quantidade inválida.");
    if (qty > saleModal.stockCurrent) return setSaleErr("Estoque insuficiente.");
    setSaleSaving(true); setSaleErr("");
    try {
      const unitPrice  = saleModal.price;
      const totalPrice = unitPrice * qty;
      const rows = await api.insert("product_sales", {
        product_id:    saleModal.id,
        barber_id:     saleForm.barberId || null,
        barbershop_id: barbershopId,
        quantity:      qty,
        unit_price:    unitPrice,
        total_price:   totalPrice,
        payment:       saleForm.payment,
        sold_at:       new Date().toISOString(),
      }, token);
      setProductSales(ps => [toProductSale(rows[0]), ...ps]);
      const newStock = saleModal.stockCurrent - qty;
      await api.update("products", saleModal.id, { stock_current: newStock }, token);
      setProducts(ps => ps.map(p => p.id===saleModal.id ? { ...p, stockCurrent: newStock } : p));
      await api.insert("stock_movements", { product_id:saleModal.id, barbershop_id:barbershopId, type:"venda", quantity:qty, reason:`Venda — ${saleForm.payment}` }, token);
      setSaleModal(null); setSaleForm({ qty:"1", barberId:"", payment:"PIX" });
    } catch(e) { setSaleErr(e.message); }
    setSaleSaving(false);
  };

  const totalSalesRev = productSales.reduce((s, ps) => s + ps.totalPrice, 0);

  return (
    <div>
      <PageHeader
        title="Produtos"
        sub={`${products.filter(p=>p.active).length} ativos · ${products.length} total`}
        onRefresh={onRefresh}
        right={<Btn onClick={openAdd}><Plus size={15}/>Novo Produto</Btn>}
      />

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div style={{ background:`${WARN_COLOR}18`, border:`1px solid ${WARN_COLOR}44`, borderRadius:10, padding:"0.75rem 1rem", marginBottom:"1.25rem", display:"flex", alignItems:"center", gap:10 }}>
          <AlertCircle size={16} color={WARN_COLOR}/>
          <span style={{ color:WARN_COLOR, fontSize:13, fontWeight:700 }}>
            {lowStock.length} produto{lowStock.length>1?"s":""} com estoque baixo ou zerado: {lowStock.map(p=>p.name).join(", ")}
          </span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:"1.25rem" }}>
        {[["produtos","Produtos"],["vendas","Histórico de Vendas"]].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: tab===id ? T.accent : T.card,
            color: tab===id ? "#0a0808" : T.muted,
            border: `1px solid ${tab===id ? T.accent : T.border}`,
            borderRadius:8, padding:"0.5rem 1.1rem", fontSize:13, fontWeight:700,
            cursor:"pointer", fontFamily:"'DM Sans', sans-serif",
          }}>
            {label}
          </button>
        ))}
        {tab==="vendas" && productSales.length > 0 && (
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", fontSize:13, color:T.success, fontWeight:700, gap:6 }}>
            <DollarSign size={14}/> Total vendas: {R$(totalSalesRev)}
          </div>
        )}
      </div>

      {/* ── Tab Produtos ── */}
      {tab === "produtos" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:"1rem" }}>
          {products.map(p => (
            <Card key={p.id} style={{ opacity:p.active?1:0.55, minWidth:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"0.75rem" }}>
                <div style={{ fontSize:14, fontWeight:700, color:T.text, lineHeight:1.3, minWidth:0, flex:1 }}>{p.name}</div>
                <div style={{ display:"flex", gap:2, flexShrink:0, marginLeft:6 }}>
                  <button onClick={() => openEdit(p)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Edit2 size={13}/></button>
                  <button onClick={() => delProduct(p.id)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Trash2 size={13}/></button>
                </div>
              </div>

              {p.description && (
                <div style={{ fontSize:11, color:T.muted, marginBottom:10, lineHeight:1.4 }}>{p.description}</div>
              )}

              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, color:T.accent, letterSpacing:1, lineHeight:1, marginBottom:10 }}>{R$(p.price)}</div>

              {/* Estoque indicator */}
              <div style={{ background:T.surface, borderRadius:8, padding:"8px 10px", marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:T.muted, textTransform:"uppercase", letterSpacing:0.5 }}>Estoque</span>
                  <span style={{ fontSize:14, fontWeight:900, color:stockColor(p) }}>{p.stockCurrent} {p.unit}</span>
                </div>
                <div style={{ fontSize:11, color:T.muted, marginTop:2 }}>Mín: {p.stockMinimum} {p.unit}</div>
              </div>

              {/* Action buttons */}
              <div style={{ display:"flex", gap:6 }}>
                <button
                  onClick={() => { setStockModal(p); setStockQty("1"); setStockReason(""); }}
                  style={{ flex:1, background:T.surface, border:`1px solid ${T.border}`, color:T.text, borderRadius:7, padding:"6px 8px", fontSize:11, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontFamily:"'DM Sans', sans-serif" }}
                >
                  <Package size={12}/> Entrada
                </button>
                <button
                  onClick={() => { if(p.stockCurrent>0){ setSaleModal(p); setSaleForm({qty:"1",barberId:"",payment:"PIX"}); setSaleErr(""); } }}
                  disabled={p.stockCurrent === 0}
                  style={{ flex:1, background:p.stockCurrent===0?T.surface:T.accentGlow, border:`1px solid ${p.stockCurrent===0?T.border:T.accent+"44"}`, color:p.stockCurrent===0?T.muted:T.accent, borderRadius:7, padding:"6px 8px", fontSize:11, fontWeight:700, cursor:p.stockCurrent===0?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4, fontFamily:"'DM Sans', sans-serif" }}
                >
                  <ShoppingCart size={12}/> Vender
                </button>
              </div>

              {/* Active toggle */}
              <button
                onClick={() => toggleProduct(p)}
                style={{ width:"100%", marginTop:8, background:"none", border:`1px solid ${p.active?T.success+"44":T.border}`, color:p.active?T.success:T.muted, borderRadius:6, padding:"4px", fontSize:10, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans', sans-serif" }}
              >
                {p.active ? "ATIVO" : "INATIVO"}
              </button>
            </Card>
          ))}
          {products.length === 0 && (
            <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"3rem", color:T.muted, fontSize:14 }}>
              Nenhum produto cadastrado. Clique em "Novo Produto" para começar.
            </div>
          )}
        </div>
      )}

      {/* ── Tab Vendas ── */}
      {tab === "vendas" && (
        <Card style={{ padding:0, overflowX:"auto" }}>
          <table style={{ width:"100%", minWidth:560, borderCollapse:"collapse", fontSize:13 }}>
            <THead cols={["Data","Produto","Qtd.","Valor Unit.","Total","Pagamento","Barbeiro"]}/>
            <tbody>
              {productSales.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign:"center", padding:"3rem", color:T.muted }}>Nenhuma venda registrada.</td></tr>
              ) : productSales.slice(0, 100).map(s => {
                const prod = products.find(p => p.id === s.productId);
                const barb = barbers.find(b => b.id === s.barberId);
                return (
                  <tr key={s.id} style={{ borderTop:`1px solid ${T.borderLight}` }}>
                    <td style={{ padding:"9px 0.75rem", color:T.muted }}>{fDate(s.date)}</td>
                    <td style={{ padding:"9px 0.75rem", color:T.text, fontWeight:500 }}>{prod?.name||"—"}</td>
                    <td style={{ padding:"9px 0.75rem", color:T.muted }}>{s.quantity}×</td>
                    <td style={{ padding:"9px 0.75rem", color:T.muted }}>{R$(s.unitPrice)}</td>
                    <td style={{ padding:"9px 0.75rem", color:T.success, fontWeight:700 }}>{R$(s.totalPrice)}</td>
                    <td style={{ padding:"9px 0.75rem" }}><Badge>{s.payment}</Badge></td>
                    <td style={{ padding:"9px 0.75rem", color:T.muted }}>{barb?.name||"—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Modal: CRUD Produto ── */}
      {showModal && (
        <Modal title={editing ? "Editar Produto" : "Novo Produto"} onClose={() => setShowModal(false)}>
          <ErrorBar msg={err}/>
          <FInput label="Nome do produto" value={form.name} onChange={setF("name")} placeholder="Ex: Pomada Matte"/>
          <FArea  label="Descrição (opcional)" value={form.description} onChange={setF("description")} placeholder="Breve descrição do produto"/>
          <Row>
            <FG label="Preço de venda (R$)" half><input style={inputSt} type="number" min="0" step="0.01" value={form.price} onChange={setF("price")}/></FG>
            <FG label="Custo (R$)" half><input style={inputSt} type="number" min="0" step="0.01" value={form.cost} onChange={setF("cost")}/></FG>
          </Row>
          <Row>
            <FG label="Estoque atual" half><input style={inputSt} type="number" min="0" value={form.stockCurrent} onChange={setF("stockCurrent")}/></FG>
            <FG label="Estoque mínimo" half><input style={inputSt} type="number" min="0" value={form.stockMinimum} onChange={setF("stockMinimum")}/></FG>
          </Row>
          <Row>
            <FG label="Unidade" half>
              <select style={{ ...inputSt, appearance:"none" }} value={form.unit} onChange={setF("unit")}>
                {UNIT_OPTS.map(u => <option key={u}>{u}</option>)}
              </select>
            </FG>
            <FG label="Status" half>
              <select style={{ ...inputSt, appearance:"none" }} value={form.active ? "1" : "0"} onChange={e => setForm(f => ({ ...f, active: e.target.value === "1" }))}>
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </FG>
          </Row>
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancelar</Btn>
            <Btn onClick={saveProduct} disabled={saving}>
              {saving ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Check size={13}/>}
              {editing ? "Atualizar" : "Cadastrar"}
            </Btn>
          </Row>
        </Modal>
      )}

      {/* ── Modal: Entrada de Estoque ── */}
      {stockModal && (
        <Modal title={`Entrada de Estoque — ${stockModal.name}`} onClose={() => setStockModal(null)}>
          <div style={{ background:T.surface, borderRadius:8, padding:"10px 14px", marginBottom:"1rem", fontSize:13 }}>
            <div style={{ color:T.muted }}>Estoque atual: <span style={{ color:stockColor(stockModal), fontWeight:800 }}>{stockModal.stockCurrent} {stockModal.unit}</span></div>
          </div>
          <FG label="Quantidade a adicionar">
            <input style={inputSt} type="number" min="1" value={stockQty} onChange={e => setStockQty(e.target.value)}/>
          </FG>
          <FG label="Motivo (opcional)">
            <input style={inputSt} value={stockReason} onChange={e => setStockReason(e.target.value)} placeholder="Ex: Compra fornecedor"/>
          </FG>
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => setStockModal(null)}>Cancelar</Btn>
            <Btn onClick={doStockEntry} disabled={stockSaving}>
              {stockSaving ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Package size={13}/>}
              Confirmar Entrada
            </Btn>
          </Row>
        </Modal>
      )}

      {/* ── Modal: Venda ── */}
      {saleModal && (
        <Modal title={`Vender — ${saleModal.name}`} onClose={() => setSaleModal(null)}>
          <ErrorBar msg={saleErr}/>
          <div style={{ background:T.surface, borderRadius:8, padding:"10px 14px", marginBottom:"1rem", fontSize:13 }}>
            <div style={{ color:T.muted }}>Preço unitário: <span style={{ color:T.accent, fontWeight:800 }}>{R$(saleModal.price)}</span></div>
            <div style={{ color:T.muted, marginTop:4 }}>Estoque disponível: <span style={{ color:stockColor(saleModal), fontWeight:800 }}>{saleModal.stockCurrent} {saleModal.unit}</span></div>
          </div>
          <FG label="Quantidade">
            <input style={inputSt} type="number" min="1" max={saleModal.stockCurrent} value={saleForm.qty} onChange={e => setSaleForm(f => ({ ...f, qty:e.target.value }))}/>
          </FG>
          {+saleForm.qty > 0 && (
            <div style={{ background:T.accentGlow, border:`1px solid ${T.accent}33`, borderRadius:8, padding:"8px 12px", marginBottom:"1rem", fontSize:14, color:T.accent, fontWeight:800 }}>
              Total: {R$(saleModal.price * +saleForm.qty)}
            </div>
          )}
          <FSelect label="Forma de pagamento" value={saleForm.payment} onChange={e => setSaleForm(f => ({ ...f, payment:e.target.value }))}>
            {PAYMENT_OPTS.map(p => <option key={p}>{p}</option>)}
          </FSelect>
          <FSelect label="Barbeiro responsável (opcional)" value={saleForm.barberId} onChange={e => setSaleForm(f => ({ ...f, barberId:e.target.value }))}>
            <option value="">Sem barbeiro</option>
            {barbers.filter(b => b.status === "active").map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </FSelect>
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => setSaleModal(null)}>Cancelar</Btn>
            <Btn onClick={doSale} disabled={saleSaving}>
              {saleSaving ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <ShoppingCart size={13}/>}
              Confirmar Venda
            </Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── AGENDAMENTOS ─────────────────────────────────────────────
function AppointmentsView({ barbers, services, token, isAdmin, myBarberId, barbershopId, isMobile, onRefresh, shop }) {
  const [appts,       setAppts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterDate,  setFilterDate]  = useState(today());
  const [filterStatus,setFilterStatus]= useState("all");
  const [filterBarber,setFilterBarber]= useState("all");
  const [saving,      setSaving]      = useState(false);
  const [confirmModal,setConfirmModal]= useState(null); // {id, action, label}

  const loadAppts = useCallback(async () => {
    setLoading(true);
    try {
      const parts = [
        `barbershop_id=eq.${barbershopId}`,
        "order=scheduled_date.asc,scheduled_time.asc",
        "select=*",
      ];
      if (filterDate)                 parts.push(`scheduled_date=eq.${filterDate}`);
      if (!isAdmin)                   parts.push(`barber_id=eq.${myBarberId}`);
      else if (filterBarber !== "all") parts.push(`barber_id=eq.${filterBarber}`);
      if (filterStatus !== "all")     parts.push(`status=eq.${filterStatus}`);
      const rows = await api.list("appointments", parts.join("&"), token);
      setAppts(Array.isArray(rows) ? rows : []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, [filterDate, filterStatus, filterBarber, token, barbershopId, isAdmin, myBarberId]);

  useEffect(() => { loadAppts(); }, [loadAppts]);

  const updateStatus = async (id, newStatus) => {
    setSaving(true);
    try {
      await api.update("appointments", id, { status: newStatus, updated_at: new Date().toISOString() }, token);
      setAppts(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));

      // Ao confirmar: cria atendimento rascunho (Pendente) automaticamente
      if (newStatus === "confirmed") {
        const appt = appts.find(a => a.id === id);
        if (appt) {
          const serviceIds = Array.isArray(appt.service_ids) && appt.service_ids.length > 0
            ? appt.service_ids : appt.service_id ? [appt.service_id] : [];
          const apptSvcs = serviceIds.map(sid => services.find(s => s.id == sid)).filter(Boolean);
          if (apptSvcs.length > 0) {
            const [primary, ...extras] = apptSvcs;
            const totalPrice = apptSvcs.reduce((sum, s) => sum + Number(s.price), 0);
            try {
              await api.insert("attendances", {
                barbershop_id:  barbershopId,
                barber_id:      appt.barber_id,
                client_id:      appt.client_id || null,
                service_id:     primary.id,
                price:          totalPrice,
                services_price: totalPrice,
                payment:        "Pendente",
                date:           appt.scheduled_date,
                time:           (appt.scheduled_time || "").slice(0, 5),
                notes:          appt.notes || null,
                extra_services: extras.map(s => ({ serviceId: s.id, name: s.name, price: s.price })),
                appointment_id: appt.id,
                source:         "appointment",
              }, token);
            } catch (_) { /* unique constraint: atendimento já criado */ }

            onRefresh(); // atualiza lista de atendimentos no pai
          }

          // Envia e-mail de confirmação ao cliente (fire-and-forget)
          // Desacoplado do bloco de serviços para garantir o envio mesmo quando
          // os serviços não são encontrados no estado local.
          // IMPORTANTE: não usar hdr(token) aqui — o header "Prefer" que ele
          // injeta não está na lista CORS da Edge Function e bloqueia o POST.
          if (appt.client_email) {
            const serviceNames = apptSvcs.length > 0
              ? apptSvcs.map(s => s.name).join(" + ")
              : (services.find(s => s.id == appt.service_id)?.name || "Serviço");
            const barberName = barbers.find(b => b.id === appt.barber_id)?.name || "—";
            fetch(`${SUPABASE_URL}/functions/v1/notify-appointment`, {
              method: "POST",
              headers: {
                apikey:          SUPABASE_ANON,
                Authorization:   `Bearer ${token}`,
                "Content-Type":  "application/json",
              },
              body: JSON.stringify({
                client_name:     appt.client_name  || "",
                client_email:    appt.client_email,
                barbershop_name: shop?.name         || "Barbearia",
                barbershop_logo: shop?.logo_url     || null,
                accent_color:    shop?.accent_color || "#4db8ff",
                barber_name:     barberName,
                services:        serviceNames,
                scheduled_date:  appt.scheduled_date,
                scheduled_time:  (appt.scheduled_time || "").slice(0, 5),
              }),
            }).catch(e => console.warn("[notify-appointment]", e));
          }
        }
      }
    } catch(e) { console.error(e); }
    setSaving(false);
    setConfirmModal(null);
  };

  const STATUS_CFG = {
    pending:   { label:"Pendente",   bg:"#f59e0b1a", color:"#f59e0b" },
    confirmed: { label:"Confirmado", bg:`${T.success}1a`, color:T.success },
    completed: { label:"Concluído",  bg:`${T.accent}1a`,  color:T.accent },
    cancelled: { label:"Cancelado",  bg:`${T.danger}1a`,  color:T.danger },
  };

  const getBarberName  = id => barbers.find(b => b.id === id)?.name || "—";
  const getServiceName = id => services.find(s => s.id === id)?.name || "—";

  const copyLink = () => {
    if (!shop?.slug) return;
    const link = `${window.location.origin}/agendar/${shop.slug}`;
    navigator.clipboard.writeText(link)
      .then(() => alert(`Link copiado!\n${link}`))
      .catch(() => alert(`Link: ${link}`));
  };

  return (
    <div>
      <PageHeader
        title="Agendamentos"
        sub={`${appts.length} agendamento${appts.length !== 1 ? "s" : ""}`}
        onRefresh={loadAppts}
        right={isAdmin && shop?.slug ? (
          <Btn variant="ghost" onClick={copyLink}><Calendar size={14}/> Copiar Link</Btn>
        ) : null}
      />

      {/* Filters */}
      <div style={{ display:"flex", flexWrap:"wrap", gap:"0.75rem", marginBottom:"1.25rem" }}>
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          style={{ ...inputSt, width:"auto", minWidth:150 }}
        />
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ ...inputSt, width:"auto" }}>
          <option value="all">Todos os status</option>
          <option value="pending">Pendente</option>
          <option value="confirmed">Confirmado</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
        {isAdmin && (
          <select value={filterBarber} onChange={e => setFilterBarber(e.target.value)} style={{ ...inputSt, width:"auto" }}>
            <option value="all">Todos os barbeiros</option>
            {barbers.filter(b => b.status === "active").map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ color:T.muted, textAlign:"center", padding:"3rem" }}>Carregando...</div>
      ) : appts.length === 0 ? (
        <Card style={{ textAlign:"center", padding:"3rem" }}>
          <Calendar size={38} style={{ color:T.muted, marginBottom:12, opacity:0.35 }}/>
          <div style={{ fontSize:15, color:T.muted, marginBottom: isAdmin && shop?.slug ? "1.25rem" : 0 }}>
            Nenhum agendamento{filterDate ? ` para ${fDate(filterDate)}` : ""}
          </div>
          {isAdmin && shop?.slug && (
            <Btn variant="ghost" onClick={copyLink}><Calendar size={13}/> Copiar link de agendamento</Btn>
          )}
        </Card>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:"0.75rem" }}>
          {appts.map(a => {
            const st = STATUS_CFG[a.status] || STATUS_CFG.pending;
            return (
              <Card key={a.id} style={{ padding:"1rem 1.25rem" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:"0.5rem" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
                      <span style={{ fontWeight:700, fontSize:15 }}>{a.client_name || "—"}</span>
                      <span style={{ background:st.bg, color:st.color, borderRadius:6, fontSize:11, fontWeight:700, padding:"2px 8px", flexShrink:0 }}>{st.label}</span>
                      {a.booked_via === "public" && (
                        <span style={{ background:T.accentGlow, color:T.accent, borderRadius:6, fontSize:10, fontWeight:600, padding:"2px 6px", flexShrink:0 }}>Online</span>
                      )}
                    </div>
                    <div style={{ fontSize:13, color:T.muted, marginBottom:4 }}>
                      {a.client_phone && <span>{a.client_phone} · </span>}
                      <span>
                        {Array.isArray(a.service_ids) && a.service_ids.length > 0
                          ? a.service_ids.map(id => getServiceName(id)).join(" + ")
                          : getServiceName(a.service_id)}
                      </span>
                      {isAdmin && <span> · {getBarberName(a.barber_id)}</span>}
                    </div>
                    <div style={{ fontSize:13, fontWeight:600 }}>
                      {fDate(a.scheduled_date)} às {(a.scheduled_time||"").slice(0,5)}
                      <span style={{ color:T.muted, fontWeight:400 }}> · {a.duration_minutes} min</span>
                    </div>
                    {a.notes && <div style={{ fontSize:12, color:T.muted, marginTop:4, fontStyle:"italic" }}>"{a.notes}"</div>}
                  </div>
                  <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap" }}>
                    {a.status === "pending" && (
                      <Btn sm onClick={() => setConfirmModal({ id:a.id, action:"confirmed", label:"Confirmar agendamento" })}>
                        <Check size={12}/> Confirmar
                      </Btn>
                    )}
                    {(a.status === "pending" || a.status === "confirmed") && (
                      <Btn sm variant="ghost" onClick={() => setConfirmModal({ id:a.id, action:"completed", label:"Marcar como Concluído" })}>
                        Concluído
                      </Btn>
                    )}
                    {(a.status === "pending" || a.status === "confirmed") && (
                      <Btn sm variant="danger" onClick={() => setConfirmModal({ id:a.id, action:"cancelled", label:"Cancelar agendamento" })}>
                        Cancelar
                      </Btn>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {confirmModal && (
        <Modal title={confirmModal.label} onClose={() => setConfirmModal(null)}>
          <p style={{ color:T.muted, fontSize:14, marginBottom:"1.25rem" }}>
            Deseja confirmar esta ação? Ela será registrada imediatamente.
          </p>
          <Row g="0.5rem" style={{ justifyContent:"flex-end" }}>
            <Btn variant="ghost" onClick={() => setConfirmModal(null)}>Voltar</Btn>
            <Btn
              variant={confirmModal.action === "cancelled" ? "danger" : "primary"}
              onClick={() => updateStatus(confirmModal.id, confirmModal.action)}
              disabled={saving}
            >
              {saving ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Check size={13}/>}
              Confirmar
            </Btn>
          </Row>
        </Modal>
      )}
    </div>
  );
}

// ── AVAILABILITY MODAL ────────────────────────────────────────
function AvailabilityModal({ barberId, barberName, barbershopId, token, onClose }) {
  const DAYS = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

  const [rows,    setRows]    = useState(
    DAYS.map((_, i) => ({ day_of_week:i, start_time:"09:00", end_time:"18:00", is_active: i >= 1 && i <= 6, id:null }))
  );
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.list("barber_availability", `barber_id=eq.${barberId}&order=day_of_week.asc`, token);
        const dbRows = Array.isArray(res) ? res : [];
        setRows(prev => prev.map(r => {
          const found = dbRows.find(d => d.day_of_week === r.day_of_week);
          if (found) return {
            ...r, ...found,
            start_time: (found.start_time || "09:00").slice(0, 5),
            end_time:   (found.end_time   || "18:00").slice(0, 5),
          };
          return r;
        }));
      } catch(e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [barberId, token]);

  const save = async () => {
    setSaving(true);
    try {
      for (const row of rows) {
        const body = {
          start_time:  row.start_time,
          end_time:    row.end_time,
          is_active:   row.is_active,
          updated_at:  new Date().toISOString(),
        };
        if (row.id) {
          await fetch(`${SUPABASE_URL}/rest/v1/barber_availability?id=eq.${row.id}`, {
            method: "PATCH",
            headers: hdr(token, { Prefer: "return=minimal" }),
            body: JSON.stringify(body),
          });
        } else if (row.is_active) {
          await api.insert("barber_availability", {
            barber_id:    barberId,
            barbershop_id: barbershopId,
            day_of_week:  row.day_of_week,
            start_time:   row.start_time,
            end_time:     row.end_time,
            is_active:    true,
          }, token);
        }
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  return (
    <Modal title={`Disponibilidade — ${barberName}`} onClose={onClose}>
      {loading ? (
        <div style={{ color:T.muted, textAlign:"center", padding:"1.5rem" }}>Carregando...</div>
      ) : (
        <>
          <div style={{ fontSize:12, color:T.muted, marginBottom:"1.25rem", background:T.accentGlow, border:`1px solid ${T.accent}33`, borderRadius:8, padding:"0.6rem 0.75rem" }}>
            💡 Configure os dias e horários de trabalho. Apenas os dias ativos ficam disponíveis para agendamento online.
          </div>
          {rows.map((row, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"0.65rem", flexWrap:"wrap" }}>
              {/* Toggle */}
              <div
                onClick={() => setRows(prev => prev.map((r, j) => j === i ? { ...r, is_active: !r.is_active } : r))}
                style={{ width:38, height:22, borderRadius:99, cursor:"pointer", background: row.is_active ? T.success : T.border, position:"relative", transition:"background .2s", flexShrink:0 }}
              >
                <div style={{ position:"absolute", top:3, left: row.is_active ? 19 : 3, width:16, height:16, borderRadius:99, background:"#fff", transition:"left .15s" }}/>
              </div>
              <span style={{ fontSize:13, fontWeight: row.is_active ? 600 : 400, color: row.is_active ? T.text : T.muted, minWidth:62 }}>{DAYS[i]}</span>
              {row.is_active && (
                <>
                  <input
                    type="time"
                    value={row.start_time}
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, start_time: e.target.value } : r))}
                    style={{ ...inputSt, width:105, padding:"0.4rem 0.6rem", fontSize:13, colorScheme:"dark" }}
                  />
                  <span style={{ color:T.muted, fontSize:12 }}>até</span>
                  <input
                    type="time"
                    value={row.end_time}
                    onChange={e => setRows(prev => prev.map((r, j) => j === i ? { ...r, end_time: e.target.value } : r))}
                    style={{ ...inputSt, width:105, padding:"0.4rem 0.6rem", fontSize:13, colorScheme:"dark" }}
                  />
                </>
              )}
            </div>
          ))}
          <Row g="0.5rem" style={{ justifyContent:"flex-end", marginTop:"1.25rem" }}>
            <Btn variant="ghost" onClick={onClose}>Fechar</Btn>
            <Btn onClick={save} disabled={saving}>
              {saving ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Check size={13}/>}
              {saved ? "Salvo! ✓" : "Salvar"}
            </Btn>
          </Row>
        </>
      )}
    </Modal>
  );
}

// ── SIDEBAR ──────────────────────────────────────────────────
function Sidebar({ view, setView, collapsed, setCollapsed, isAdmin, isSuperAdmin, userName, onLogout, shop, lowStockCount = 0, themeMode = "dark", onToggleTheme }) {
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
        { id:"dashboard",    label:"Dashboard",    Icon:LayoutDashboard },
        { id:"attendances",  label:"Atendimentos",  Icon:Scissors },
        { id:"clients",      label:"Clientes",      Icon:Users },
        { id:"appointments", label:"Agendamentos",  Icon:Calendar },
        ...(isAdmin ? [
          { id:"barbers",   label:"Barbeiros",     Icon:Award },
          { id:"services",  label:"Serviços",      Icon:Tag },
          { id:"produtos",  label:"Produtos",      Icon:Package, badge: lowStockCount },
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
          ? (themeMode === "dark" ? "linear-gradient(180deg, #0f1018 0%, #0b0b11 100%)" : T.sidebar)
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
          padding: collapsed ? "1.15rem 0.75rem" : (isSuperAdmin ? "1.25rem 1rem" : "1rem 0.85rem 1.2rem"),
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: isSuperAdmin ? 165 : 150,
          position: "relative",
        }}
      >
        {!collapsed && (
          isSuperAdmin ? (
            <div
              style={{
                display:"flex",
                flexDirection:"column",
                alignItems:"center",
                justifyContent:"center",
                minWidth:0,
                flex:1,
                width:"100%",
                padding:"0.5rem 0.5rem",
                gap:8,
              }}
            >
              <img
                src={ozBarberLogo}
                alt="Oz.Barber"
                style={{
                  width:"100%",
                  maxWidth:150,
                  height:"auto",
                  maxHeight:90,
                  objectFit:"contain",
                  display:"block",
                  filter:`drop-shadow(0 0 18px ${T.accent}33)`,
                }}
              />
              <div style={{
                fontFamily:"'Bebas Neue', sans-serif",
                fontSize:22,
                letterSpacing:3,
                color:T.accent,
                lineHeight:1,
                textShadow:`0 0 18px ${T.accent}55`,
              }}>
                Oz.Barber
              </div>
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
              background: isSuperAdmin ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.18)",
              border: `1px solid ${T.border}`,
              color: T.muted,
              cursor: "pointer",
              display: "flex",
              width: 28,
              height: 28,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 8,
              position: "absolute",
              top: 12,
              right: 12,
              flexShrink: 0,
            }}
          >
            <ChevronLeft size={15}/>
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
            margin: "0.75rem 1rem 0",
            padding: "0.8rem 1rem",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${T.accent}28, ${T.accent}10)`,
            border: `1px solid ${T.accent}45`,
            boxShadow: `0 4px 24px ${T.accent}18`,
          }}
        >
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
            <Zap size={14} color={T.accent} fill={T.accent}/>
            <span style={{ color:T.accent, fontSize:12, fontWeight:900, letterSpacing:1.2, textTransform:"uppercase" }}>
              Super Admin
            </span>
          </div>
          <div style={{ color:T.mutedLight, fontSize:11, lineHeight:1.5 }}>
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
        {nav.map(({id,label,Icon,desc,badge}) => {
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
                padding: collapsed ? "0.82rem 0" : (isSuperAdmin ? "0.88rem 0.9rem" : "0.75rem 0.8rem"),
                marginBottom: isSuperAdmin ? 4 : 4,
                borderRadius: isSuperAdmin ? 12 : 9,
                border: isSuperAdmin
                  ? `1px solid ${active ? `${T.accent}35` : "rgba(255,255,255,.03)"}`
                  : "none",
                background: active
                  ? (isSuperAdmin ? `linear-gradient(90deg, ${T.accent}20, ${T.accent}08)` : T.accentGlow)
                  : "transparent",
                color: active ? T.accent : T.mutedLight,
                cursor:"pointer",
                fontFamily:"'DM Sans', sans-serif",
                fontSize:13,
                fontWeight: active ? 800 : 600,
                textAlign:"left",
                transition:"all .18s ease",
                boxShadow: active && isSuperAdmin ? `0 4px 20px ${T.accent}10` : "none",
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
                    right:0,
                    top:"50%",
                    transform:"translateY(-50%)",
                    width:3,
                    height:26,
                    borderRadius:999,
                    background:T.accent,
                    boxShadow:`0 0 12px ${T.accent}`,
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
                <span style={{ minWidth:0, flex:1, display:"flex", flexDirection: isSuperAdmin ? "column" : "row", alignItems: isSuperAdmin ? "flex-start" : "center", gap: isSuperAdmin ? 2 : 6 }}>
                  <span style={{ display:"flex", alignItems:"center", gap:6, width:"100%" }}>
                    <span style={{
                      display:"block",
                      whiteSpace:"nowrap",
                      overflow:"hidden",
                      textOverflow:"ellipsis",
                      flex:1,
                      fontSize: isSuperAdmin ? 14 : 13,
                      fontWeight: isSuperAdmin ? 700 : (active ? 800 : 600),
                      color: isSuperAdmin ? (active ? T.accent : T.text) : undefined,
                    }}>
                      {label}
                    </span>
                    {badge > 0 && (
                      <span style={{ background:WARN_COLOR, color:"#0a0808", borderRadius:999, fontSize:9, fontWeight:900, padding:"2px 6px", lineHeight:1.4, flexShrink:0 }}>
                        {badge}
                      </span>
                    )}
                  </span>
                  {isSuperAdmin && desc && (
                    <span
                      style={{
                        display:"block",
                        color: active ? `${T.accent}88` : T.muted,
                        fontSize:11,
                        fontWeight:500,
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
          <div style={{ marginBottom:"0.85rem", minWidth:0, padding:"0.25rem 0.25rem" }}>
            <div style={{ fontSize:11, color:T.muted, marginBottom:3 }}>Logado como</div>
            <div style={{ fontSize:12, color: isSuperAdmin ? T.accent : T.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontWeight: isSuperAdmin ? 600 : 400 }}>{userName}</div>
          </div>
        )}

        {/* Mini toggle de tema — usa div para evitar <button> aninhado (HTML inválido) */}
        {onToggleTheme && (
          <div
            onClick={onToggleTheme}
            title={themeMode === "dark" ? "Mudar para Modo Claro" : "Mudar para Modo Escuro"}
            style={{
              width:"100%",
              display:"flex",
              alignItems:"center",
              justifyContent: collapsed ? "center" : "space-between",
              gap:8,
              padding:"0.6rem 0.4rem",
              borderRadius:12,
              color:T.mutedLight,
              cursor:"pointer",
              fontSize:12,
              fontWeight:600,
              fontFamily:"'DM Sans', sans-serif",
              marginBottom:6,
              userSelect:"none",
            }}
          >
            <div style={{ display:"flex", alignItems:"center", gap:8, pointerEvents:"none" }}>
              {themeMode === "dark" ? <Sun size={14} color="#f59e0b"/> : <Moon size={14}/>}
              {!collapsed && (themeMode === "dark" ? "Modo Claro" : "Modo Escuro")}
            </div>
            {!collapsed && (
              <div style={{ pointerEvents:"none" }}>
                <ThemeToggleSwitch isDark={themeMode === "dark"} onToggle={() => {}}/>
              </div>
            )}
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
            padding:"0.6rem 0.4rem",
            borderRadius:12,
            border:"none",
            background:"transparent",
            color:T.mutedLight,
            cursor:"pointer",
            fontSize:12,
            fontWeight:600,
            fontFamily:"'DM Sans', sans-serif",
            transition:"all .18s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = T.danger; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = T.mutedLight; }}
        >
          <LogOut size={15}/>
          {!collapsed && "Sair"}
        </button>
      </div>
    </aside>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────
// ── HOOK: detecta mobile ─────────────────────────────────────
function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

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
  .mob-scroll-x{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .mob-scroll-x table{min-width:520px}
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

  // ── Hooks devem vir ANTES de qualquer return condicional ──────
  const isMobile   = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);

  const [auth,         setAuth]         = useState(() => safeLoadAuth());
  const [dataLoaded,   setDataLoaded]   = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [view,         setView]         = useState("dashboard");
  const [collapsed,    setCollapsed]    = useState(false);
  const [themeMode,    setThemeMode]    = useState(() => localStorage.getItem("oz_theme") || "dark");
  const [showPlans,      setShowPlans]      = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('plans') === 'true';
  });
  const [showLanding,    setShowLanding]    = useState(() => {
    const host = window.location.hostname;
    // ozbarber.vercel.app e localhost vão direto pro app (sem landing)
    if (host === "ozbarber.vercel.app" || host === "localhost") return false;
    return true;
  });
  const [expiredMsg,     setExpiredMsg]     = useState("");
  const [postPaymentPlan, setPostPaymentPlan] = useState(null);
  const [courtesyEmail,setCourtesyEmail]= useState(null);
  const [shop,         setShop]         = useState(null);

  const isResetPasswordRoute =
    window.location.pathname === "/reset-password" ||
    window.location.hash.includes("type=recovery") ||
    window.location.hash.includes("access_token") ||
    window.location.search.includes("type=recovery") ||
    window.location.search.includes("code=");

  if (isResetPasswordRoute) {
    return <ResetPassword />;
  }

  // Rota pública de agendamento: /agendar/<slug>
  const isBookingRoute = window.location.pathname.startsWith("/agendar/");
  if (isBookingRoute) {
    const slug = window.location.pathname.replace("/agendar/", "").split("/")[0] || "";
    return <BookingPage slug={slug} />;
  }

  // Resultado de confirmação via link do e-mail (?booking=confirmed|already|cancelled|invalid)
  const bookingStatus = new URLSearchParams(window.location.search).get("booking");
  if (bookingStatus) {
    const params     = new URLSearchParams(window.location.search);
    const clientName = params.get("name")  || "o cliente";
    const shopName   = params.get("shop")  || "";
    const shopLogo   = params.get("logo")  || "";
    const shopColor  = params.get("color") || "";

    const cfg = {
      confirmed: { icon:"✓", baseColor:"#22c55e", title:"Agendamento Confirmado!", msg:`O agendamento de ${clientName} foi confirmado com sucesso. O cliente será notificado por e-mail.` },
      already:   { icon:"✓", baseColor:"#22c55e", title:"Já Confirmado",           msg:`O agendamento de ${clientName} já havia sido confirmado anteriormente.` },
      cancelled: { icon:"✕", baseColor:"#ef4444", title:"Agendamento Cancelado",   msg:"Este agendamento foi cancelado e não pode ser confirmado." },
      invalid:   { icon:"✕", baseColor:"#ef4444", title:"Link Inválido",           msg:"Este link de confirmação é inválido ou já foi utilizado." },
    }[bookingStatus] || { icon:"?", baseColor:"#6b7280", title:"Status Desconhecido", msg:"" };

    // Usa cor da barbearia em status positivos; vermelho/cinza para erros
    const accent = (shopColor && (bookingStatus === "confirmed" || bookingStatus === "already"))
      ? shopColor : cfg.baseColor;

    return (
      <div style={{ minHeight:"100vh", background:"#08090c", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:"2rem" }}>
        {/* Branding da barbearia */}
        <div style={{ marginBottom:"2rem", textAlign:"center" }}>
          {shopLogo ? (
            <img src={shopLogo} alt={shopName} style={{ maxHeight:72, maxWidth:180, width:"auto", height:"auto", borderRadius:12, display:"block", margin:"0 auto 12px" }} />
          ) : shopName ? (
            <div style={{ width:64, height:64, borderRadius:16, background:`${accent}22`, border:`2px solid ${accent}44`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", fontSize:28, fontWeight:900, color:accent, fontFamily:"'Bebas Neue',sans-serif" }}>
              {shopName[0].toUpperCase()}
            </div>
          ) : null}
          {shopName && <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:3, color:"#ffffff", opacity:0.9 }}>{shopName.toUpperCase()}</div>}
          <div style={{ fontSize:11, color:"#4b5563", letterSpacing:1, marginTop:2 }}>Sistema de Agendamento</div>
        </div>

        {/* Card */}
        <div style={{ background:"#13141a", border:`1px solid ${accent}33`, borderRadius:20, padding:"2.5rem 2rem", maxWidth:400, width:"100%", textAlign:"center", boxShadow:`0 0 40px ${accent}11` }}>
          {/* Ícone */}
          <div style={{
            width:80, height:80, borderRadius:"50%",
            background:`${accent}18`, border:`2px solid ${accent}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 1.5rem",
            fontSize:36, fontWeight:900, color:accent,
            fontFamily:"'Bebas Neue',sans-serif",
          }}>
            {cfg.icon}
          </div>

          {/* Título */}
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, color:accent, marginBottom:"0.75rem", lineHeight:1.1 }}>
            {cfg.title}
          </div>

          {/* Mensagem */}
          <p style={{ color:"#9ca3af", fontSize:15, lineHeight:1.7, margin:"0 0 1.75rem" }}>
            {cfg.msg}
          </p>

          {/* Divider */}
          <div style={{ borderTop:"1px solid #1e2030", paddingTop:"1.25rem" }}>
            <div style={{ fontSize:12, color:"#374151" }}>
              Powered by <strong style={{ color:accent }}>OzTech SmartControl</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [clients,      setClients]      = useState([]);
  const [services,     setServices]     = useState([]);
  const [barbers,      setBarbers]      = useState([]);
  const [attendances,  setAttendances]  = useState([]);
  const [expenses,     setExpenses]     = useState([]);
  const [products,     setProducts]     = useState([]);
  const [productSales, setProductSales] = useState([]);

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
        setProducts([]);
        setProductSales([]);
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

      const [shopRows, brs, cls, svcs, atts, exps, prods, prodSales] = await Promise.all([
        api.list("barbershops",  `id=eq.${shopId}&select=*`, tok),
        api.list("barbers",      withShop("select=*&order=name"), tok),
        api.list("clients",      withShop("select=*&order=name"), tok),
        api.list("services",     withShop("select=*&order=name"), tok),
        api.list("attendances",  attQuery, tok),
        isAdm ? api.list("expenses",     withShop("select=*&order=date.desc"), tok) : Promise.resolve([]),
        isAdm ? api.list("products",     withShop("select=*&order=name"), tok)      : Promise.resolve([]),
        isAdm ? api.list("product_sales","select=*&order=sold_at.desc", tok)        : Promise.resolve([]),
      ]);

      const currentShop = ensureArray(shopRows)[0] || null;
      setShop(currentShop);
      applyTenantTheme(currentShop);

      setBarbers(ensureArray(brs).map(toBarber));
      setClients(ensureArray(cls).map(toClient));
      setServices(ensureArray(svcs).map(toService));
      setAttendances(ensureArray(atts).map(toAtt));
      setExpenses(ensureArray(exps).map(toExpense));
      setProducts(ensureArray(prods).map(toProduct));
      setProductSales(ensureArray(prodSales).map(toProductSale));
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

  const toggleTheme = useCallback(() => {
    const newMode = themeMode === "dark" ? "light" : "dark";
    localStorage.setItem("oz_theme", newMode);
    applyThemeMode(newMode);
    // Re-aplica accent do tenant se houver
    if (shop?.accent_color) {
      T.accent     = normalizeHex(shop.accent_color);
      T.accentGlow = `${T.accent}22`;
    }
    setThemeMode(newMode);
  }, [themeMode, shop]);

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
    setProducts([]);
    setProductSales([]);
    setDataLoaded(false);
    setView("dashboard");
    setShowPlans(false);
    setExpiredMsg("");
    setShowLanding(true);
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

  if (!auth) {
    if (showLanding) return (
      <LandingPage
        onLogin={() => setShowLanding(false)}
        onSubscribe={() => { setShowLanding(false); setShowPlans(true); }}
      />
    );
    return <><style>{CSS}</style><LoginView onLogin={onLogin} onShowPlans={() => setShowPlans(true)} /></>;
  }

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

  const lowStockCount = products.filter(p => p.active && p.stockCurrent <= p.stockMinimum).length;

  // Exclui atendimentos "Pendente" dos cálculos financeiros (ainda não recebidos)
  const finalizedAtts = attendances.filter(a => a.payment !== "Pendente");

  const views = isSuperAdmin
    ? {
        superadmin_dashboard:     <SuperAdminView token={tok} section="dashboard"     themeMode={themeMode} />,
        superadmin_clients:       <SuperAdminView token={tok} section="clients"       themeMode={themeMode} />,
        superadmin_finance:       <SuperAdminView token={tok} section="finance"       themeMode={themeMode} />,
        superadmin_subscriptions: <SuperAdminView token={tok} section="subscriptions" themeMode={themeMode} />,
        superadmin_courtesy:      <SuperAdminView token={tok} section="courtesy"      themeMode={themeMode} />,
        superadmin_alerts:        <SuperAdminView token={tok} section="alerts"        themeMode={themeMode} />,
        superadmin_analytics:     <SuperAdminView token={tok} section="analytics"     themeMode={themeMode} />,
      }
    : {
        dashboard:   <Dashboard   attendances={finalizedAtts} clients={clients} services={services} barbers={barbers} products={products} isAdmin={isAdmin} myBarberId={myBarberId} onGoReports={isAdmin?()=>setView('reports'):undefined} isMobile={isMobile} onRefresh={() => loadData(tok, auth.profile)}/>,
        attendances: <AttendancesView attendances={attendances} setAttendances={setAttendances} clients={clients} setClients={setClients} services={services} barbers={barbers} token={tok} isAdmin={isAdmin} myBarberId={myBarberId} barbershopId={barbershopId} products={products} setProducts={setProducts} setProductSales={setProductSales} onRefresh={() => loadData(tok, auth.profile)}/>,
        clients:      <ClientsView clients={clients} setClients={setClients} attendances={finalizedAtts} services={services} token={tok} isAdmin={isAdmin} barbershopId={barbershopId} onRefresh={() => loadData(tok, auth.profile)}/>,
        appointments: <AppointmentsView barbers={barbers} services={services} token={tok} isAdmin={isAdmin} myBarberId={myBarberId} barbershopId={barbershopId} isMobile={isMobile} onRefresh={() => loadData(tok, auth.profile)} shop={shop}/>,
        barbers:      <BarbersView  barbers={barbers} setBarbers={setBarbers} attendances={finalizedAtts} token={tok} barbershopId={barbershopId} onRefresh={() => loadData(tok, auth.profile)} isMobile={isMobile}/>,
        services:    <ServicesView services={services} setServices={setServices} token={tok} barbershopId={barbershopId} onRefresh={() => loadData(tok, auth.profile)}/>,
        produtos:    <ProductsView products={products} setProducts={setProducts} productSales={productSales} setProductSales={setProductSales} barbers={barbers} token={tok} barbershopId={barbershopId} isMobile={isMobile} onRefresh={() => loadData(tok, auth.profile)}/>,
        financial:   <FinancialView attendances={finalizedAtts} expenses={expenses} setExpenses={setExpenses} token={tok} barbershopId={barbershopId} barbers={barbers} isMobile={isMobile} productSales={productSales} onRefresh={() => loadData(tok, auth.profile)}/>,
        reports:     <ReportsView attendances={finalizedAtts} clients={clients} services={services} barbers={barbers} expenses={expenses} shop={shop} isMobile={isMobile} onRefresh={() => loadData(tok, auth.profile)}/>,
        settings:    <SettingsView token={tok} shop={shop} onShopUpdated={(updatedShop) => { setShop(updatedShop); applyTenantTheme(updatedShop, themeMode); }} themeMode={themeMode} onToggleTheme={toggleTheme}/>,
        meuPlano:    <MeuPlanoView token={tok} userEmail={auth.user?.email} profile={auth.profile} onRenew={() => setShowPlans(true)} />,
      };

  const shopDisplayName = isSuperAdmin ? "Oz.Barber" : (shop?.name || "Oz.Barber");

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, color:T.text, fontFamily:"'DM Sans', sans-serif", overflow:"hidden", position:"relative" }}>
      <style>{CSS}</style>

      {/* Backdrop mobile */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:299, backdropFilter:"blur(2px)" }}
        />
      )}

      {/* Sidebar: fixed drawer no mobile, normal no desktop */}
      {isMobile ? (
        <div style={{
          position:"fixed", top:0, left: drawerOpen ? 0 : "-100%", bottom:0,
          zIndex:300, transition:"left .25s cubic-bezier(.4,0,.2,1)",
          display:"flex",
        }}>
          <Sidebar
            view={activeView}
            setView={id => { setView(id); setDrawerOpen(false); }}
            collapsed={false}
            setCollapsed={() => setDrawerOpen(false)}
            isAdmin={isAdmin}
            isSuperAdmin={isSuperAdmin}
            userName={userName}
            onLogout={onLogout}
            shop={shop}
            lowStockCount={lowStockCount}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
          />
        </div>
      ) : (
        <Sidebar view={activeView} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} userName={userName} onLogout={onLogout} shop={shop} lowStockCount={lowStockCount} themeMode={themeMode} onToggleTheme={toggleTheme}/>
      )}

      {/* Área de conteúdo */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

        {/* Top bar mobile */}
        {isMobile && (
          <div style={{
            display:"flex", alignItems:"center", gap:12,
            padding:"10px 14px",
            borderBottom:`1px solid ${T.border}`,
            background:T.sidebar,
            flexShrink:0,
            zIndex:10,
          }}>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{ background:"none", border:"none", color:T.text, cursor:"pointer", display:"flex", padding:6, borderRadius:8 }}
            >
              <Menu size={22}/>
            </button>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, letterSpacing:1.5, color:T.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {shopDisplayName}
            </div>
            <button
              onClick={onLogout}
              style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"flex", padding:6, borderRadius:8 }}
            >
              <LogOut size={18}/>
            </button>
          </div>
        )}

        <main style={{ flex:1, overflow:"auto", padding: isMobile ? "1rem" : "2rem 2.25rem" }}>
          {views[activeView] || views.superadmin_dashboard}
        </main>
      </div>
    </div>
  );
}
