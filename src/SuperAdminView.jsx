import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus, Trash2, RefreshCw, Check, X, AlertCircle,
  Gift, Clock, Infinity, Search, ShieldCheck, Building2,
  DollarSign, TrendingUp, Users, Scissors, CreditCard,
  BarChart3, PieChart, Filter, CalendarDays
} from "lucide-react";

const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co";
const SUPABASE_ANON = "sb_publishable_cTk8su9HL7LcXoPQE-bqVQ_5Idjyf1a";

const T = {
  bg: "#0b0b0e",
  surface: "#13131a",
  card: "#1a1a24",
  border: "#2a2a3a",
  accent: "#4db8ff",
  text: "#ece8e0",
  muted: "#706b63",
  mutedLight: "#9a9590",
  success: "#43d18a",
  successBg: "#43d18a18",
  danger: "#f07070",
  dangerBg: "#f0707018",
  warning: "#f59e0b",
  warningBg: "#f59e0b18",
  info: "#60a5fa",
  infoBg: "#60a5fa18",
};

const inputSt = {
  width: "100%",
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: "0.6rem 0.875rem",
  color: T.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
};

const hdr = (tok) => ({
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${tok}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

const fDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const fDatetime = (s) => s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";
const money = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));

const StatusBadge = ({ status }) => {
  const map = {
    active:  { label: "Ativo", bg: T.successBg, color: T.success },
    expired: { label: "Expirado", bg: T.warningBg, color: T.warning },
    past_due: { label: "Inadimplente", bg: T.warningBg, color: T.warning },
    overdue: { label: "Vencido", bg: T.warningBg, color: T.warning },
    revoked: { label: "Revogado", bg: T.dangerBg, color: T.danger },
    cancelled: { label: "Cancelado", bg: T.dangerBg, color: T.danger },
    pending: { label: "Pendente", bg: T.warningBg, color: T.warning },
    approved: { label: "Aprovado", bg: T.successBg, color: T.success },
  };
  const s = map[status] || { label: status || "Sem status", bg: T.surface, color: T.mutedLight };
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}>
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${T.border}` }}>
        <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1.5, color: T.text }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={18} /></button>
      </div>
      <div style={{ padding: "1.5rem" }}>{children}</div>
    </div>
  </div>
);

const ErrMsg = ({ msg }) => msg ? (
  <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.6rem 1rem", color: T.danger, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
    <AlertCircle size={14} />{msg}
  </div>
) : null;

const MetricCard = ({ label, value, sub, icon: Icon, color = T.accent }) => (
  <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "1.15rem 1.25rem" }}>
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 10 }}>{label}</div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color, lineHeight: 1, letterSpacing: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 7 }}>{sub}</div>}
      </div>
      {Icon && (
        <div style={{ background: color + "18", border: `1px solid ${color}22`, borderRadius: 10, padding: 10 }}>
          <Icon size={18} color={color} />
        </div>
      )}
    </div>
  </div>
);

const SectionTitle = ({ icon: Icon, title, sub, right }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1.75rem 0 1rem" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {Icon && <Icon size={18} color={T.accent} />}
      <div>
        <div style={{ fontFamily: "'Bebas Neue', sans-serif", color: T.text, fontSize: 24, letterSpacing: 1.8 }}>{title}</div>
        {sub && <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
    {right}
  </div>
);

const BarList = ({ rows, labelKey, valueKey, valueFormatter = (v) => v }) => {
  const max = Math.max(1, ...rows.map(r => Number(r[valueKey] || 0)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {rows.length === 0 ? (
        <div style={{ color: T.muted, fontSize: 13, padding: "1.5rem", textAlign: "center" }}>Sem dados para exibir</div>
      ) : rows.map((r, idx) => {
        const val = Number(r[valueKey] || 0);
        const pct = Math.max(4, (val / max) * 100);
        return (
          <div key={`${r[labelKey]}-${idx}`}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: T.text }}>{r[labelKey] || "—"}</span>
              <span style={{ color: T.mutedLight }}>{valueFormatter(val)}</span>
            </div>
            <div style={{ height: 8, background: T.surface, borderRadius: 999, overflow: "hidden", border: `1px solid ${T.border}` }}>
              <div style={{ width: `${pct}%`, height: "100%", background: T.accent, borderRadius: 999 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default function SuperAdminView({ token }) {
  const [activeTab, setActiveTab] = useState("executive");

  const [courtesyList, setCourtesyList] = useState([]);
  const [subscriptionsList, setSubscriptionsList] = useState([]);
  const [saasOverview, setSaasOverview] = useState([]);
  const [saasMetrics, setSaasMetrics] = useState(null);
  const [planDistribution, setPlanDistribution] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // all | active | expired | revoked
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [revoking, setRevoking] = useState(null);

  const [form, setForm] = useState({
    email: "",
    type: "unlimited",
    expires_at: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");

    try {
      const [
        courtesyRes,
        subscriptionsRes,
        metricsRes,
        overviewRes,
        planDistRes,
      ] = await Promise.allSettled([
        fetch(`${SUPABASE_URL}/rest/v1/courtesy_access?select=*,barbershops(name)&order=created_at.desc`, { headers: hdr(token) }),
        fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.desc`, { headers: hdr(token) }),
        fetch(`${SUPABASE_URL}/rest/v1/superadmin_saas_metrics?select=*`, { headers: hdr(token) }),
        fetch(`${SUPABASE_URL}/rest/v1/superadmin_saas_overview?select=*&order=barbershop_created_at.desc`, { headers: hdr(token) }),
        fetch(`${SUPABASE_URL}/rest/v1/superadmin_plan_distribution?select=*`, { headers: hdr(token) }),
      ]);

      let courtesy = [];
      if (courtesyRes.status === "fulfilled" && courtesyRes.value.ok) {
        const data = await courtesyRes.value.json();
        courtesy = Array.isArray(data)
          ? data.map(item => ({
              ...item,
              source: "courtesy",
              source_label: "Cortesia",
              display_email: item.email || "—",
              display_plan: item.type === "unlimited" ? "Indeterminado" : "Prazo determinado",
              display_shop: item.barbershops?.name || "—",
            }))
          : [];
      }

      let subscriptions = [];
      if (subscriptionsRes.status === "fulfilled" && subscriptionsRes.value.ok) {
        const data = await subscriptionsRes.value.json();
        subscriptions = Array.isArray(data)
          ? data.map(item => {
              const planLabel =
                item.plan_label ||
                item.plan_name ||
                (item.plan === "monthly" ? "Plano Mensal" :
                 item.plan === "semestral" ? "Plano Semestral" :
                 item.plan === "annual" ? "Plano Anual" :
                 item.plan || "Plano");

              return {
                ...item,
                source: "subscription",
                source_label: "Assinatura",
                display_email: item.email || item.customer_email || item.payer_email || item.mp_payer_email || item.user_email || item.user_id || "—",
                display_plan: planLabel,
                display_shop: item.barbershop_name || item.shop_name || item.barbershop_id || "—",
                created_at: item.created_at || item.createdAt || item.started_at || item.start_date,
                expires_at: item.expires_at || item.expiresAt || item.current_period_end || item.end_date,
              };
            })
          : [];
      }

      let metrics = null;
      if (metricsRes.status === "fulfilled" && metricsRes.value.ok) {
        const data = await metricsRes.value.json();
        metrics = Array.isArray(data) ? data[0] : null;
      }

      let overview = [];
      if (overviewRes.status === "fulfilled" && overviewRes.value.ok) {
        const data = await overviewRes.value.json();
        overview = Array.isArray(data) ? data : [];
      }

      let distribution = [];
      if (planDistRes.status === "fulfilled" && planDistRes.value.ok) {
        const data = await planDistRes.value.json();
        distribution = Array.isArray(data) ? data : [];
      }

      setCourtesyList(courtesy);
      setSubscriptionsList(subscriptions);
      setSaasMetrics(metrics);
      setSaasOverview(overview);
      setPlanDistribution(distribution);
    } catch (e) {
      console.error(e);
      setCourtesyList([]);
      setSubscriptionsList([]);
      setSaasMetrics(null);
      setSaasOverview([]);
      setPlanDistribution([]);
      setErr("Erro ao carregar painel administrativo.");
    }

    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setErr("");
    if (!form.email.trim()) return setErr("Informe o e-mail.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr("E-mail inválido.");
    if (form.type === "timed" && !form.expires_at) return setErr("Informe a data de expiração.");

    setSaving(true);
    try {
      const body = {
        email: form.email.trim().toLowerCase(),
        type: form.type,
        expires_at: form.type === "timed" ? new Date(form.expires_at).toISOString() : null,
        notes: form.notes.trim() || null,
        status: "active",
      };

      const res = await fetch(`${SUPABASE_URL}/rest/v1/courtesy_access`, {
        method: "POST",
        headers: hdr(token),
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Erro ao criar acesso.");
      }

      setShowModal(false);
      setForm({ email: "", type: "unlimited", expires_at: "", notes: "" });
      await load();
    } catch (e) {
      setErr(e.message);
    }
    setSaving(false);
  };

  const handleRevoke = async (id) => {
    if (!window.confirm("Revogar este acesso? O usuário perderá o acesso imediatamente.")) return;
    setRevoking(id);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/courtesy_access?id=eq.${id}`, {
        method: "PATCH",
        headers: hdr(token),
        body: JSON.stringify({ status: "revoked", revoked_at: new Date().toISOString() }),
      });
      await load();
    } catch {}
    setRevoking(null);
  };

  const handleDelete = async (item) => {
    if (item.source !== "courtesy") {
      alert("Por segurança, assinaturas pagas não são excluídas por aqui. Cancele/controle a assinatura pelo fluxo de pagamento.");
      return;
    }

    if (item.status !== "revoked") {
      alert("Somente acessos revogados podem ser excluídos.");
      return;
    }

    if (!window.confirm("Excluir definitivamente este acesso revogado? Esta ação não pode ser desfeita.")) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/courtesy_access?id=eq.${item.id}`, {
        method: "DELETE",
        headers: hdr(token),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Erro ao excluir acesso.");
      }

      await load();
    } catch (e) {
      alert(e.message || "Erro ao excluir acesso.");
    }
  };

  const courtesyStats = useMemo(() => ({
    total: courtesyList.length,
    active: courtesyList.filter(i => i.status === "active").length,
    expired: courtesyList.filter(i => i.status === "expired").length,
    revoked: courtesyList.filter(i => i.status === "revoked").length,
    used: courtesyList.filter(i => !!i.used_at).length,
  }), [courtesyList]);

  const filteredCourtesy = courtesyList.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (item.display_email || item.email || "").toLowerCase().includes(q) ||
      (item.notes || "").toLowerCase().includes(q) ||
      (item.display_plan || "").toLowerCase().includes(q) ||
      (item.source_label || "").toLowerCase().includes(q);
    const matchFilter = filter === "all" || item.status === filter;
    return matchSearch && matchFilter;
  });

  const filteredSaas = saasOverview.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (item.barbershop_name || "").toLowerCase().includes(q) ||
      (item.plan_name || "").toLowerCase().includes(q) ||
      (item.subscription_status || "").toLowerCase().includes(q);

    const matchPlan = planFilter === "all" || (item.billing_cycle || "none") === planFilter;
    const matchStatus = statusFilter === "all" || (item.subscription_status || "none") === statusFilter;

    return matchSearch && matchPlan && matchStatus;
  });

  const metrics = {
    total_barbershops: Number(saasMetrics?.total_barbershops || saasOverview.length || 0),
    active_barbershops: Number(saasMetrics?.active_barbershops || 0),
    overdue_barbershops: Number(saasMetrics?.overdue_barbershops || 0),
    cancelled_barbershops: Number(saasMetrics?.cancelled_barbershops || 0),
    mrr: Number(saasMetrics?.mrr || 0),
    arr: Number(saasMetrics?.arr || 0),
    average_ticket: Number(saasMetrics?.average_ticket || 0),
    total_users: Number(saasMetrics?.total_users || 0),
    total_barbers: Number(saasMetrics?.total_barbers || 0),
  };

  const tabs = [
    { id: "executive", label: "Visão SaaS", Icon: BarChart3 },
    { id: "clients", label: "Clientes SaaS", Icon: Building2 },
    { id: "billing", label: "Financeiro", Icon: DollarSign },
    { id: "courtesy", label: "Cortesias", Icon: Gift },
  ];

  return (
    <div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <ShieldCheck size={22} color={T.accent} />
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 2.5, margin: 0, color: T.text }}>PAINEL EXECUTIVO SAAS</h1>
          </div>
          <div style={{ color: T.muted, fontSize: 13 }}>Gestão da plataforma Oz.Barber: tenants, receita, assinaturas e cortesias</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load}
            style={{ background: T.surface, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.6rem 1rem", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
            <RefreshCw size={14} /> Atualizar
          </button>
          <button onClick={() => { setShowModal(true); setErr(""); }}
            style={{ background: T.accent, color: "#0a0808", border: "none", borderRadius: 8, padding: "0.6rem 1.25rem", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
            <Plus size={15} /> Novo acesso cortesia
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{
              borderRadius: 10,
              padding: "0.65rem 1rem",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              border: `1px solid ${activeTab === t.id ? T.accent : T.border}`,
              background: activeTab === t.id ? T.accent + "18" : T.surface,
              color: activeTab === t.id ? T.accent : T.mutedLight,
              fontFamily: "'DM Sans', sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}>
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <ErrMsg msg={err} />

      {loading ? (
        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "4rem", textAlign: "center", color: T.muted }}>
          <RefreshCw size={24} style={{ animation: "spin 1s linear infinite", marginBottom: 12 }} />
          <div>Carregando painel executivo…</div>
        </div>
      ) : (
        <>
          {activeTab === "executive" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                <MetricCard label="MRR" value={money(metrics.mrr)} sub="Receita recorrente mensal" icon={DollarSign} color={T.success} />
                <MetricCard label="ARR" value={money(metrics.arr)} sub="Projeção anual" icon={TrendingUp} color={T.accent} />
                <MetricCard label="Ticket médio" value={money(metrics.average_ticket)} sub="Base ativa pagante" icon={CreditCard} color={T.info} />
                <MetricCard label="Barbearias" value={metrics.total_barbershops} sub="Clientes SaaS cadastrados" icon={Building2} color={T.text} />
                <MetricCard label="Ativas" value={metrics.active_barbershops} sub="Com assinatura ativa" icon={Check} color={T.success} />
                <MetricCard label="Inadimplentes" value={metrics.overdue_barbershops} sub="Vencidas / em atraso" icon={AlertCircle} color={T.warning} />
                <MetricCard label="Usuários" value={metrics.total_users} sub="Acessos criados" icon={Users} color={T.accent} />
                <MetricCard label="Barbeiros" value={metrics.total_barbers} sub="Profissionais cadastrados" icon={Scissors} color={T.mutedLight} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginTop: "1.5rem" }}>
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "1.25rem" }}>
                  <SectionTitle icon={PieChart} title="Distribuição de Planos" sub="Quantidade de barbearias por plano" />
                  <BarList rows={planDistribution} labelKey="plan_name" valueKey="barbershops_count" valueFormatter={(v) => `${v} conta(s)`} />
                </div>

                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "1.25rem" }}>
                  <SectionTitle icon={Gift} title="Cortesias" sub="Acessos doados pelo admin master" />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <MetricCard label="Total" value={courtesyStats.total} color={T.accent} />
                    <MetricCard label="Ativas" value={courtesyStats.active} color={T.success} />
                    <MetricCard label="Usadas" value={courtesyStats.used} color={T.info} />
                    <MetricCard label="Revogadas" value={courtesyStats.revoked} color={T.danger} />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === "clients" && (
            <>
              <SectionTitle icon={Building2} title="Clientes SaaS" sub="Cada linha representa uma barbearia/tenant da plataforma" />
              <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220, position: "relative" }}>
                  <Search size={14} color={T.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input style={{ ...inputSt, paddingLeft: 32 }} placeholder="Buscar barbearia, plano ou status…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={{ ...inputSt, width: 180 }}>
                  <option value="all">Todos os planos</option>
                  <option value="monthly">Mensal</option>
                  <option value="semestral">Semestral</option>
                  <option value="annual">Anual</option>
                  <option value="none">Sem plano</option>
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...inputSt, width: 180 }}>
                  <option value="all">Todos status</option>
                  <option value="active">Ativo</option>
                  <option value="expired">Expirado</option>
                  <option value="past_due">Inadimplente</option>
                  <option value="cancelled">Cancelado</option>
                  <option value="none">Sem assinatura</option>
                </select>
              </div>

              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Barbearia", "Plano", "Status", "MRR", "Usuários", "Barbeiros", "Cadastro", "Expira em"].map(col => (
                          <th key={col} style={{ textAlign: "left", padding: "0.8rem 1rem", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${T.border}` }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSaas.length === 0 ? (
                        <tr><td colSpan="8" style={{ padding: "3rem", textAlign: "center", color: T.muted }}>Nenhuma barbearia encontrada</td></tr>
                      ) : filteredSaas.map((item, i) => (
                        <tr key={`${item.barbershop_id}-${item.subscription_id || i}`} style={{ borderBottom: i < filteredSaas.length - 1 ? `1px solid ${T.border}` : "none" }}>
                          <td style={{ padding: "0.85rem 1rem", color: T.text, fontSize: 13, fontWeight: 600 }}>{item.barbershop_name || "—"}</td>
                          <td style={{ padding: "0.85rem 1rem", color: T.mutedLight, fontSize: 12 }}>{item.plan_name || "Sem plano"}</td>
                          <td style={{ padding: "0.85rem 1rem" }}><StatusBadge status={item.subscription_status || "none"} /></td>
                          <td style={{ padding: "0.85rem 1rem", color: Number(item.mrr) > 0 ? T.success : T.muted, fontSize: 12, fontWeight: 700 }}>{money(item.mrr)}</td>
                          <td style={{ padding: "0.85rem 1rem", color: T.mutedLight, fontSize: 12 }}>{item.users_count || 0}</td>
                          <td style={{ padding: "0.85rem 1rem", color: T.mutedLight, fontSize: 12 }}>{item.barbers_count || 0}</td>
                          <td style={{ padding: "0.85rem 1rem", color: T.muted, fontSize: 12 }}>{fDate(item.barbershop_created_at)}</td>
                          <td style={{ padding: "0.85rem 1rem", color: T.muted, fontSize: 12 }}>{fDate(item.expires_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "billing" && (
            <>
              <SectionTitle icon={DollarSign} title="Financeiro SaaS" sub="Receita da plataforma, não financeiro interno das barbearias" />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
                <MetricCard label="MRR" value={money(metrics.mrr)} icon={DollarSign} color={T.success} />
                <MetricCard label="ARR" value={money(metrics.arr)} icon={TrendingUp} color={T.accent} />
                <MetricCard label="Ticket médio" value={money(metrics.average_ticket)} icon={CreditCard} color={T.info} />
                <MetricCard label="Canceladas" value={metrics.cancelled_barbershops} icon={X} color={T.danger} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: "1.5rem" }}>
                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "1.25rem" }}>
                  <SectionTitle icon={BarChart3} title="Receita por Plano" sub="MRR por categoria" />
                  <BarList rows={planDistribution} labelKey="plan_name" valueKey="mrr" valueFormatter={money} />
                </div>

                <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "1.25rem" }}>
                  <SectionTitle icon={CalendarDays} title="Últimas Assinaturas" sub="Pagamentos capturados pelo webhook" />
                  {subscriptionsList.length === 0 ? (
                    <div style={{ color: T.muted, fontSize: 13, padding: "2rem", textAlign: "center" }}>Nenhuma assinatura paga registrada ainda</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {subscriptionsList.slice(0, 8).map(item => (
                        <div key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "0.75rem", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10 }}>
                          <div>
                            <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{item.display_plan}</div>
                            <div style={{ color: T.muted, fontSize: 11 }}>{item.display_email}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ color: T.success, fontSize: 13, fontWeight: 700 }}>{money(item.amount)}</div>
                            <div style={{ color: T.muted, fontSize: 11 }}>{fDate(item.created_at)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === "courtesy" && (
            <>
              <SectionTitle
                icon={Gift}
                title="Cortesias & Benefícios"
                sub="Acessos gratuitos doados pelo admin master; não contam como MRR"
                right={
                  <button onClick={() => { setShowModal(true); setErr(""); }}
                    style={{ background: T.accent, color: "#0a0808", border: "none", borderRadius: 8, padding: "0.6rem 1rem", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
                    <Plus size={14} /> Nova cortesia
                  </button>
                }
              />

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: "1.25rem" }}>
                <MetricCard label="Total" value={courtesyStats.total} color={T.accent} />
                <MetricCard label="Ativas" value={courtesyStats.active} color={T.success} />
                <MetricCard label="Expiradas" value={courtesyStats.expired} color={T.warning} />
                <MetricCard label="Revogadas" value={courtesyStats.revoked} color={T.danger} />
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                  <Search size={14} color={T.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input style={{ ...inputSt, paddingLeft: 32 }} placeholder="Buscar por e-mail ou observação…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {["all", "active", "expired", "revoked"].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ borderRadius: 8, padding: "0.5rem 1rem", fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${filter === f ? T.accent : T.border}`, background: filter === f ? T.accent + "18" : T.surface, color: filter === f ? T.accent : T.muted, fontFamily: "'DM Sans', sans-serif" }}>
                    {{ all: "Todos", active: "Ativos", expired: "Expirados", revoked: "Revogados" }[f]}
                  </button>
                ))}
              </div>

              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
                {filteredCourtesy.length === 0 ? (
                  <div style={{ padding: "3rem", textAlign: "center", color: T.muted }}>
                    <Gift size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
                    <div style={{ fontSize: 14 }}>Nenhum acesso encontrado</div>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["E-mail", "Tipo", "Status", "Criado em", "Expira em", "Usado por", "Ações"].map(col => (
                            <th key={col} style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${T.border}` }}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCourtesy.map((item, i) => (
                          <tr key={item.id} style={{ borderBottom: i < filteredCourtesy.length - 1 ? `1px solid ${T.border}` : "none" }}>
                            <td style={{ padding: "0.85rem 1rem", fontSize: 13, color: T.text }}>
                              <div>{item.display_email || item.email || "—"}</div>
                              {item.notes && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{item.notes}</div>}
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: T.mutedLight }}>
                                {item.type === "unlimited" ? <><Infinity size={12} /> Indeterminado</> : <><Clock size={12} /> Prazo determinado</>}
                              </span>
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}><StatusBadge status={item.status} /></td>
                            <td style={{ padding: "0.85rem 1rem", fontSize: 12, color: T.muted }}>{fDate(item.created_at)}</td>
                            <td style={{ padding: "0.85rem 1rem", fontSize: 12, color: T.muted }}>
                              {item.type === "unlimited" ? <span style={{ color: T.success }}>Sem expiração</span> : fDate(item.expires_at)}
                            </td>
                            <td style={{ padding: "0.85rem 1rem", fontSize: 12, color: T.muted }}>
                              {item.used_at
                                ? <div><div style={{ color: T.text, fontSize: 12 }}>{item.display_shop || item.barbershops?.name || "—"}</div><div style={{ fontSize: 11 }}>{fDatetime(item.used_at)}</div></div>
                                : <span style={{ color: T.muted }}>Não utilizado</span>}
                            </td>
                            <td style={{ padding: "0.85rem 1rem" }}>
                              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                                {item.status === "active" && (
                                  <button onClick={() => handleRevoke(item.id)} disabled={revoking === item.id}
                                    style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: T.danger, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                                    {revoking === item.id ? <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={11} />}
                                    Revogar
                                  </button>
                                )}

                                {item.status === "revoked" && (
                                  <button onClick={() => handleDelete(item)}
                                    style={{ background: "#2a1111", border: `1px solid ${T.danger}55`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: T.danger, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                                    <Trash2 size={11} /> Excluir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {showModal && (
        <Modal title="NOVO ACESSO CORTESIA" onClose={() => setShowModal(false)}>
          <ErrMsg msg={err} />

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>E-mail do usuário</div>
            <input style={inputSt} type="email" placeholder="usuario@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoFocus />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Tipo de acesso</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "unlimited", icon: <Infinity size={14} />, label: "Indeterminado" },
                { id: "timed", icon: <Clock size={14} />, label: "Prazo determinado" },
              ].map(opt => (
                <button key={opt.id} onClick={() => setForm(f => ({ ...f, type: opt.id }))}
                  style={{ flex: 1, padding: "0.6rem", borderRadius: 8, border: `1px solid ${form.type === opt.id ? T.accent : T.border}`, background: form.type === opt.id ? T.accent + "18" : T.surface, color: form.type === opt.id ? T.accent : T.muted, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.type === "timed" && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Data de expiração</div>
              <input style={inputSt} type="date" value={form.expires_at} min={new Date().toISOString().slice(0, 10)} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
          )}

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Observação (opcional)</div>
            <textarea style={{ ...inputSt, resize: "vertical", minHeight: 64 }} placeholder="Ex: Cliente parceiro, período de teste…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowModal(false)}
              style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.65rem", fontSize: 14, fontWeight: 600, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, background: T.accent, border: "none", borderRadius: 8, padding: "0.65rem", fontSize: 14, fontWeight: 600, color: "#0a0808", cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>
              {saving ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando…</> : <><Check size={14} /> Liberar acesso</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
