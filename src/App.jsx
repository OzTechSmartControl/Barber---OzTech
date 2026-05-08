import { useState, useMemo, useEffect, useCallback } from "react";
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
  borderLight: "#222230", accent: "#c9963b", accentGlow: "#c9963b22",
  text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", successBg: "#43d18a18", danger: "#f07070", dangerBg: "#f0707018",
  info: "#60a5fa", infoBg: "#60a5fa18", sidebar: "#0e0e14",
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
const LoginView = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass]   = useState("");
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
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 64, height: 64, borderRadius: "50%", background: T.accentGlow, border: `1px solid ${T.accent}44`, marginBottom: "1rem" }}>
            <Scissors size={28} color={T.accent} />
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, letterSpacing: 5, color: T.accent, lineHeight: 1 }}>BARBER</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, letterSpacing: 6, color: T.muted }}>MANAGER</div>
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
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={onKey}
                placeholder="••••••••" style={{ ...inputSt, paddingLeft: "2.25rem" }} />
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
function AttendancesView({ attendances, setAttendances, clients, services, barbers, token, isAdmin, myBarberId }) {
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
      const rows = await api.insert("attendances", fromAtt(form), token);
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
function ClientsView({ clients, setClients, attendances, services, token, isAdmin }) {
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
        const rows = await api.insert("clients", { name:form.name, phone:form.phone, whatsapp:form.whatsapp, birthdate:form.birthdate||null, notes:form.notes, points:+form.points||0 }, token);
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
                      <button onClick={e=>openEdit(c,e)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"inline-flex" }}><Edit2 size={13}/></button>
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
                <button onClick={()=>setSelected(null)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer" }}><X size={16}/></button>
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
function BarbersView({ barbers, setBarbers, attendances, token }) {
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

      const body = { name:form.name, phone:form.phone, commission:+form.commission, status:form.status, user_id: userId };

      if (editing) {
        await api.update("barbers", editing, body, token);
        setBarbers(bs=>bs.map(b=>b.id===editing?{...b,...toBarber({...body,id:editing,user_id:userId})}:b));
      } else {
        const rows = await api.insert("barbers", body, token);
        const newBarber = toBarber(rows[0]);
        setBarbers(bs=>[...bs, newBarber]);
        if (userId) {
          await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: hdr(token),
            body: JSON.stringify({ barber_id: newBarber.id, role: "barber" }),
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
function ServicesView({ services, setServices, token }) {
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
      const body = { name:form.name, price:+form.price, duration:+form.duration, active:form.active };
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
function FinancialView({ attendances, expenses, setExpenses, token }) {
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
      const rows = await api.insert("expenses", { description:form.desc, amount:+form.amount, date:form.date, category:form.category }, token);
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
function ReportsView({ attendances, clients, services, barbers, expenses }) {
  const [selMonth, setSelMonth] = useState(month());
  const [generating, setGenerating] = useState("");

  const mAtts  = attendances.filter(a => a.date.startsWith(selMonth));
  const mExp   = expenses.filter(e => e.date.startsWith(selMonth));
  const mRev   = mAtts.reduce((s, a) => s + a.price, 0);
  const mExpT  = mExp.reduce((s, e) => s + e.amount, 0);

  const printReport = (id, name) => {
    setGenerating(id);
    setTimeout(() => {
      const el = document.getElementById("pdf-content");
      if (!el) { setGenerating(""); return; }

      const html = el.innerHTML;
      const win = window.open("", "_blank", "width=900,height=700");
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8"/>
          <title>${name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; color: #111; background: white; padding: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid #eee; }
            thead tr { background: #f5f5f5; }
            h1 { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #c9963b; padding-bottom: 12px; margin-bottom: 20px; }
            .meta { text-align: right; font-size: 13px; color: #555; }
            .kpis { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
            .kpi { border: 1px solid #ddd; border-radius: 6px; padding: 10px 14px; text-align: center; }
            .kpi-label { font-size: 11px; color: #888; text-transform: uppercase; margin-bottom: 4px; }
            .kpi-val { font-size: 20px; font-weight: 700; }
            .section-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; margin-top: 20px; }
            .total-row { background: #f0f0f0; font-weight: 700; border-top: 2px solid #ddd; }
            .gold { color: #c9963b; }
            .stripe { background: #fafafa; }
            @page { margin: 1cm; size: A4; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${html}</body>
        </html>
      `);
      win.document.close();
      win.onload = () => {
        setTimeout(() => {
          win.focus();
          win.print();
          win.close();
        }, 400);
      };
      setGenerating("");
    }, 200);
  };

  // ── REPORT RENDERERS ────────────────────────────────────
  const RevenueReport = () => {
    const tAtts = attendances.filter(a => a.date === today());
    const tRev  = tAtts.reduce((s, a) => s + a.price, 0);
    const byPay = {};
    mAtts.forEach(a => { byPay[a.payment] = (byPay[a.payment] || 0) + a.price; });
    const profit = mRev - mExpT;
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"2px solid #c9963b", paddingBottom:12, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700 }}>Barber Manager</div>
            <div style={{ fontSize:13, color:"#555" }}>Relatório de Faturamento</div>
          </div>
          <div style={{ textAlign:"right", fontSize:13, color:"#555" }}>
            <div>Mês: {selMonth}</div>
            <div>Gerado em: {new Date().toLocaleDateString("pt-BR")}</div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
          {[["Atend. Hoje", tAtts.length],["Receita Hoje", R$(tRev)],["Receita Mês", R$(mRev)],["Lucro Mês", R$(profit)]].map(([l,v])=>(
            <div key={l} style={{ border:"1px solid #ddd", borderRadius:6, padding:"10px 14px", textAlign:"center" }}>
              <div style={{ fontSize:11, color:"#888", textTransform:"uppercase", marginBottom:4 }}>{l}</div>
              <div style={{ fontSize:20, fontWeight:700 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:8, borderBottom:"1px solid #eee", paddingBottom:4 }}>Formas de Pagamento</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ background:"#f5f5f5" }}>{["Método","Total","% Receita"].map(h=><th key={h} style={{ padding:"6px 10px", textAlign:"left", fontWeight:600 }}>{h}</th>)}</tr></thead>
            <tbody>{Object.entries(byPay).map(([m,v])=>(
              <tr key={m} style={{ borderBottom:"1px solid #eee" }}>
                <td style={{ padding:"6px 10px" }}>{m}</td>
                <td style={{ padding:"6px 10px", fontWeight:600 }}>{R$(v)}</td>
                <td style={{ padding:"6px 10px", color:"#555" }}>{mRev>0?((v/mRev)*100).toFixed(1):0}%</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:8, borderBottom:"1px solid #eee", paddingBottom:4 }}>Despesas do Mês</div>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr style={{ background:"#f5f5f5" }}>{["Descrição","Categoria","Data","Valor"].map(h=><th key={h} style={{ padding:"6px 10px", textAlign:"left", fontWeight:600 }}>{h}</th>)}</tr></thead>
            <tbody>
              {mExp.map(e=>(
                <tr key={e.id} style={{ borderBottom:"1px solid #eee" }}>
                  <td style={{ padding:"6px 10px" }}>{e.desc}</td>
                  <td style={{ padding:"6px 10px", color:"#555" }}>{e.category}</td>
                  <td style={{ padding:"6px 10px", color:"#555" }}>{fDate(e.date)}</td>
                  <td style={{ padding:"6px 10px", fontWeight:600 }}>{R$(e.amount)}</td>
                </tr>
              ))}
              <tr style={{ background:"#f5f5f5", fontWeight:700 }}>
                <td colSpan={3} style={{ padding:"8px 10px" }}>TOTAL DESPESAS</td>
                <td style={{ padding:"8px 10px" }}>{R$(mExpT)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const BarberReport = () => {
    const stats = barbers.filter(b=>b.status==="active").map(b=>{
      const bA = mAtts.filter(a=>a.barberId===b.id);
      const total = bA.reduce((s,a)=>s+a.price,0);
      const svcMap = {};
      bA.forEach(a=>{ const s=services.find(sv=>sv.id===a.serviceId); if(s) svcMap[s.name]=(svcMap[s.name]||0)+1; });
      const topSvc = Object.entries(svcMap).sort((a,b)=>b[1]-a[1])[0];
      return { b, count:bA.length, total, commission:total*b.commission/100, ticket:bA.length?total/bA.length:0, topSvc:topSvc?`${topSvc[0]} (${topSvc[1]}×)`:"—" };
    }).sort((a,b)=>b.total-a.total);
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"2px solid #c9963b", paddingBottom:12, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700 }}>Barber Manager</div>
            <div style={{ fontSize:13, color:"#555" }}>Relatório por Barbeiro</div>
          </div>
          <div style={{ textAlign:"right", fontSize:13, color:"#555" }}>
            <div>Mês: {selMonth}</div>
            <div>Gerado em: {new Date().toLocaleDateString("pt-BR")}</div>
          </div>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead><tr style={{ background:"#f5f5f5" }}>
            {["#","Barbeiro","Atend.","Total Produzido","Comissão","Ticket Médio","Serviço Top"].map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {stats.map(({b,count,total,commission,ticket,topSvc},i)=>(
              <tr key={b.id} style={{ borderBottom:"1px solid #eee", background:i%2===0?"white":"#fafafa" }}>
                <td style={{ padding:"8px 10px", fontWeight:700, color:"#c9963b" }}>{i+1}</td>
                <td style={{ padding:"8px 10px", fontWeight:600 }}>{b.name}</td>
                <td style={{ padding:"8px 10px" }}>{count}</td>
                <td style={{ padding:"8px 10px", fontWeight:700 }}>{R$(total)}</td>
                <td style={{ padding:"8px 10px", color:"#c9963b", fontWeight:600 }}>{R$(commission)} <span style={{color:"#888",fontWeight:400}}>({b.commission}%)</span></td>
                <td style={{ padding:"8px 10px" }}>{R$(ticket)}</td>
                <td style={{ padding:"8px 10px", color:"#555" }}>{topSvc}</td>
              </tr>
            ))}
            <tr style={{ background:"#f0f0f0", fontWeight:700, borderTop:"2px solid #ddd" }}>
              <td colSpan={2} style={{ padding:"8px 10px" }}>TOTAL GERAL</td>
              <td style={{ padding:"8px 10px" }}>{stats.reduce((s,x)=>s+x.count,0)}</td>
              <td style={{ padding:"8px 10px" }}>{R$(stats.reduce((s,x)=>s+x.total,0))}</td>
              <td style={{ padding:"8px 10px" }}>{R$(stats.reduce((s,x)=>s+x.commission,0))}</td>
              <td colSpan={2}></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const ServiceReport = () => {
    const svcMap = {};
    mAtts.forEach(a=>{
      const s = services.find(sv=>sv.id===a.serviceId);
      if(!s) return;
      if(!svcMap[s.id]) svcMap[s.id]={ name:s.name, price:s.price, count:0, total:0 };
      svcMap[s.id].count++;
      svcMap[s.id].total += a.price;
    });
    const rows = Object.values(svcMap).sort((a,b)=>b.total-a.total);
    const grandTotal = rows.reduce((s,r)=>s+r.total,0);
    return (
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"2px solid #c9963b", paddingBottom:12, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:22, fontWeight:700 }}>Barber Manager</div>
            <div style={{ fontSize:13, color:"#555" }}>Relatório por Serviço</div>
          </div>
          <div style={{ textAlign:"right", fontSize:13, color:"#555" }}>
            <div>Mês: {selMonth}</div>
            <div>Gerado em: {new Date().toLocaleDateString("pt-BR")}</div>
          </div>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead><tr style={{ background:"#f5f5f5" }}>
            {["#","Serviço","Preço Tabela","Qtd. Realizado","Total Gerado","% Receita"].map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"left", fontWeight:600 }}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(({name,price,count,total},i)=>(
              <tr key={name} style={{ borderBottom:"1px solid #eee", background:i%2===0?"white":"#fafafa" }}>
                <td style={{ padding:"8px 10px", fontWeight:700, color:"#c9963b" }}>{i+1}</td>
                <td style={{ padding:"8px 10px", fontWeight:600 }}>{name}</td>
                <td style={{ padding:"8px 10px", color:"#555" }}>{R$(price)}</td>
                <td style={{ padding:"8px 10px" }}>{count}×</td>
                <td style={{ padding:"8px 10px", fontWeight:700 }}>{R$(total)}</td>
                <td style={{ padding:"8px 10px", color:"#555" }}>{grandTotal>0?((total/grandTotal)*100).toFixed(1):0}%</td>
              </tr>
            ))}
            <tr style={{ background:"#f0f0f0", fontWeight:700, borderTop:"2px solid #ddd" }}>
              <td colSpan={3} style={{ padding:"8px 10px" }}>TOTAL</td>
              <td style={{ padding:"8px 10px" }}>{rows.reduce((s,r)=>s+r.count,0)}×</td>
              <td style={{ padding:"8px 10px" }}>{R$(grandTotal)}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const REPORTS = [
    { id:"revenue",  label:"Faturamento",      desc:"Receitas, despesas, lucro e formas de pagamento", Icon:DollarSign,  color:T.success,  Component:RevenueReport },
    { id:"barbers",  label:"Por Barbeiro",      desc:"Ranking, produção, comissões e ticket médio",      Icon:Award,       color:T.accent,   Component:BarberReport  },
    { id:"services", label:"Por Serviço",       desc:"Serviços mais realizados e receita gerada",        Icon:Scissors,    color:T.info,     Component:ServiceReport },
  ];

  const [preview, setPreview] = useState(null);
  const active = REPORTS.find(r=>r.id===preview);

  return (
    <div>
      <PageHeader title="Relatórios" sub={`Mês selecionado: ${selMonth}`} right={
        <div style={{ display:"flex", alignItems:"center", gap:"0.75rem" }}>
          <input type="month" value={selMonth} onChange={e=>setSelMonth(e.target.value)}
            style={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8, padding:"0.5rem 0.875rem", color:T.text, fontSize:13, outline:"none", fontFamily:"'DM Sans', sans-serif" }}/>
        </div>
      }/>

      {!preview ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"1rem" }}>
          {REPORTS.map(({id,label,desc,Icon,color,Component})=>(
            <Card key={id} style={{ cursor:"pointer", transition:"border-color 0.15s" }} onClick={()=>setPreview(id)}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:"1rem" }}>
                <div style={{ background:color+"18", borderRadius:10, padding:12 }}><Icon size={22} color={color}/></div>
                <div>
                  <div style={{ fontWeight:600, color:T.text, fontSize:15 }}>{label}</div>
                  <div style={{ fontSize:12, color:T.muted, marginTop:2 }}>{desc}</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:"1rem" }}>
                {id==="revenue"  && [["Receita",R$(mRev)],["Despesas",R$(mExpT)],["Lucro",R$(mRev-mExpT)],["Atend.",mAtts.length]].map(([l,v])=>(
                  <div key={l} style={{ background:T.surface, borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase" }}>{l}</div>
                    <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{v}</div>
                  </div>
                ))}
                {id==="barbers"  && barbers.filter(b=>b.status==="active").slice(0,4).map(b=>{
                  const bA=mAtts.filter(a=>a.barberId===b.id), total=bA.reduce((s,a)=>s+a.price,0);
                  return <div key={b.id} style={{ background:T.surface, borderRadius:6, padding:"8px 10px" }}>
                    <div style={{ fontSize:10, color:T.muted, textTransform:"uppercase", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{b.name}</div>
                    <div style={{ fontWeight:600, color:T.text, fontSize:13 }}>{R$(total)}</div>
                  </div>;
                })}
                {id==="services" && (() => {
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
          <div style={{ display:"flex", gap:"0.75rem", marginBottom:"1.25rem" }} className="no-print">
            <Btn variant="ghost" onClick={()=>setPreview(null)}><X size={14}/>Voltar</Btn>
            <Btn onClick={()=>printReport(preview, `${active?.label} - ${selMonth}`)} disabled={generating===preview}>
              {generating===preview ? <RefreshCw size={14} style={{animation:"spin 1s linear infinite"}}/> : <Download size={14}/>}
              Imprimir / Salvar PDF
            </Btn>
          </div>
          <Card id="pdf-content" style={{ background:"white", color:"black" }}>
            {active && <active.Component/>}
          </Card>
        </div>
      )}
    </div>
  );
}

// ── SIDEBAR ──────────────────────────────────────────────────
function Sidebar({ view, setView, collapsed, setCollapsed, isAdmin, userName, onLogout }) {
  const nav = [
    { id:"dashboard",   label:"Dashboard",    Icon:LayoutDashboard },
    { id:"attendances", label:"Atendimentos",  Icon:Scissors },
    { id:"clients",     label:"Clientes",      Icon:Users },
    ...(isAdmin ? [
      { id:"barbers",   label:"Barbeiros",     Icon:Award },
      { id:"services",  label:"Serviços",      Icon:Tag },
      { id:"financial", label:"Financeiro",    Icon:DollarSign },
      { id:"reports",   label:"Relatórios",   Icon:FileText },
    ] : []),
  ];

  return (
    <div style={{ width:collapsed?60:216, background:T.sidebar, borderRight:`1px solid ${T.border}`, display:"flex", flexDirection:"column", flexShrink:0, transition:"width 0.2s ease" }}>
      <div style={{ padding:collapsed?"1.25rem 0":"1.4rem 1.25rem", borderBottom:`1px solid ${T.border}`, display:"flex", alignItems:"center", justifyContent:collapsed?"center":"space-between" }}>
        {!collapsed&&(
          <div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, letterSpacing:3.5, color:T.accent }}>BARBER</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:11, letterSpacing:4.5, color:T.muted }}>MANAGER</div>
          </div>
        )}
        <button onClick={()=>setCollapsed(c=>!c)} style={{ background:"none", border:"none", color:T.muted, cursor:"pointer", display:"flex" }}><Menu size={17}/></button>
      </div>

      <nav style={{ flex:1, padding:"0.5rem 0" }}>
        {nav.map(({id,label,Icon})=>{
          const active=view===id;
          return <button key={id} onClick={()=>setView(id)} title={collapsed?label:undefined}
            style={{ width:"100%", display:"flex", alignItems:"center", gap:11, padding:collapsed?"0.7rem":"0.7rem 1.25rem", background:active?T.accentGlow:"transparent", border:"none", borderLeft:`2.5px solid ${active?T.accent:"transparent"}`, color:active?T.accent:T.muted, cursor:"pointer", fontSize:13.5, fontWeight:active?600:400, justifyContent:collapsed?"center":"flex-start", fontFamily:"'DM Sans', sans-serif" }}>
            <Icon size={17}/>{!collapsed&&label}
          </button>;
        })}
      </nav>

      <div style={{ padding:collapsed?"0.75rem":"0.875rem 1.25rem", borderTop:`1px solid ${T.border}` }}>
        {!collapsed&&(
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:12, fontWeight:600, color:T.text, marginBottom:2 }}>{userName}</div>
            <Badge color={isAdmin?T.accent:T.info}>{isAdmin?"Admin":"Barbeiro"}</Badge>
          </div>
        )}
        <button onClick={onLogout} title={collapsed?"Sair":undefined}
          style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:collapsed?"0.5rem":"0.5rem 0", background:"none", border:"none", color:T.muted, cursor:"pointer", fontSize:13, fontFamily:"'DM Sans', sans-serif", justifyContent:collapsed?"center":"flex-start" }}>
          <LogOut size={15}/>{!collapsed&&"Sair"}
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
  const [auth,       setAuth]       = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [view,       setView]       = useState("dashboard");
  const [collapsed,  setCollapsed]  = useState(false);

  const [clients,     setClients]     = useState([]);
  const [services,    setServices]    = useState([]);
  const [barbers,     setBarbers]     = useState([]);
  const [attendances, setAttendances] = useState([]);
  const [expenses,    setExpenses]    = useState([]);

  const loadData = useCallback(async (tok, profile) => {
    setLoading(true);
    try {
      const isAdm = profile.role === "admin";
      const attQuery = isAdm
        ? "select=*&order=date.desc,time.desc"
        : `select=*&barber_id=eq.${profile.barber_id}&order=date.desc,time.desc`;

      const [brs, cls, svcs, atts, exps] = await Promise.all([
        api.list("barbers",     "select=*&order=name",     tok),
        api.list("clients",     "select=*&order=name",     tok),
        api.list("services",    "select=*&order=name",     tok),
        api.list("attendances", attQuery,                  tok),
        isAdm ? api.list("expenses", "select=*&order=date.desc", tok) : Promise.resolve([]),
      ]);

      setBarbers(brs.map(toBarber));
      setClients(cls.map(toClient));
      setServices(svcs.map(toService));
      setAttendances(atts.map(toAtt));
      setExpenses(exps.map(toExpense));
      setDataLoaded(true);
    } catch(e) { console.error(e); }
    setLoading(false);
  }, []);

  const onLogin = useCallback(async (authData) => {
    setAuth(authData);
    await loadData(authData.token, authData.profile);
  }, [loadData]);

  const onLogout = () => { setAuth(null); setDataLoaded(false); setView("dashboard"); };

  if (!auth)        return <><style>{CSS}</style><LoginView onLogin={onLogin}/></>;
  if (loading||!dataLoaded) return <><style>{CSS}</style><LoadingScreen/></>;

  const isAdmin    = auth.profile.role === "admin";
  const myBarberId = auth.profile.barber_id;
  const userName   = barbers.find(b=>b.userId===auth.user?.id)?.name || auth.user?.email || "Usuário";
  const tok        = auth.token;

  const views = {
    dashboard:   <Dashboard   attendances={attendances} clients={clients}   services={services}  barbers={barbers}    isAdmin={isAdmin} myBarberId={myBarberId} onGoReports={isAdmin?()=>setView('reports'):undefined}/>,
    attendances: <AttendancesView attendances={attendances} setAttendances={setAttendances} clients={clients} services={services} barbers={barbers} token={tok} isAdmin={isAdmin} myBarberId={myBarberId}/>,
    clients:     <ClientsView clients={clients} setClients={setClients} attendances={attendances} services={services} token={tok} isAdmin={isAdmin}/>,
    barbers:     <BarbersView  barbers={barbers} setBarbers={setBarbers} attendances={attendances} token={tok}/>,
    services:    <ServicesView services={services} setServices={setServices} token={tok}/>,
    financial:   <FinancialView attendances={attendances} expenses={expenses} setExpenses={setExpenses} token={tok}/>,
    reports:     <ReportsView attendances={attendances} clients={clients} services={services} barbers={barbers} expenses={expenses}/>,
  };

  return (
    <div style={{ display:"flex", height:"100vh", background:T.bg, color:T.text, fontFamily:"'DM Sans', sans-serif", overflow:"hidden" }}>
      <style>{CSS}</style>
      <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed} isAdmin={isAdmin} userName={userName} onLogout={onLogout}/>
      <main style={{ flex:1, overflow:"auto", padding:"2rem 2.25rem" }}>
        {views[view] || views.dashboard}
      </main>
    </div>
  );
}
