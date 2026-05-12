import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  Clock,
  Infinity,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import { supabase } from "./supabase";
import T from "./config/theme";

import DashboardView from "./pages/superadmin/DashboardView";
import ClientsView from "./pages/superadmin/ClientsView";
import FinanceView from "./pages/superadmin/FinanceView";
import SubscriptionsView from "./pages/superadmin/SubscriptionsView";
import CourtesyView from "./pages/superadmin/CourtesyView";
import AlertsView from "./pages/superadmin/AlertsView";
import AnalyticsView from "./pages/superadmin/AnalyticsView";

const defaultMetrics = {
  mrr: 0,
  arr: 0,
  active_barbershops: 0,
  overdue_barbershops: 0,
  cancelled_barbershops: 0,
  total_barbershops: 0,
  average_ticket: 0,
  active_subscriptions: 0,
  overdue_subscriptions: 0,
  cancelled_subscriptions: 0,
  total_courtesies: 0,
  active_courtesies: 0,
  revoked_courtesies: 0,
  total_users: 0,
  total_barbers: 0,
};

const inputSt = {
  width: "100%",
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "0.65rem 0.875rem",
  color: T.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
};

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          width: "100%",
          maxWidth: 500,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              letterSpacing: 1.5,
              color: T.text,
            }}
          >
            {title}
          </h3>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: T.muted,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "1.5rem" }}>{children}</div>
      </div>
    </div>
  );
}

function ErrorMessage({ message }) {
  if (!message) return null;

  return (
    <div
      style={{
        background: T.dangerBg,
        border: `1px solid ${T.danger}44`,
        borderRadius: 10,
        color: T.danger,
        padding: "0.75rem 1rem",
        fontSize: 13,
        marginBottom: "1rem",
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      <AlertCircle size={15} />
      {message}
    </div>
  );
}

function normalizeCourtesy(item) {
  return {
    ...item,
    source: "courtesy",
    source_label: "Cortesia",
    display_email: item.email || "—",
    display_plan:
      item.type === "unlimited" ? "Indeterminado" : "Prazo determinado",
    display_shop: item.barbershops?.name || "—",
  };
}

function normalizeSubscription(item) {
  const planLabel =
    item.plan_label ||
    item.plan_name ||
    (item.plan === "monthly"
      ? "Plano Mensal"
      : item.plan === "semestral"
      ? "Plano Semestral"
      : item.plan === "annual"
      ? "Plano Anual"
      : item.plan || "Plano");

  return {
    ...item,
    source: "subscription",
    source_label: "Assinatura",
    display_email:
      item.email ||
      item.customer_email ||
      item.payer_email ||
      item.mp_payer_email ||
      item.user_email ||
      item.user_id ||
      "—",
    display_plan: planLabel,
    display_shop: item.barbershop_name || item.shop_name || item.barbershop_id || "—",
    created_at: item.created_at || item.createdAt || item.started_at || item.start_date,
    expires_at: item.expires_at || item.expiresAt || item.current_period_end || item.end_date,
  };
}


const sectionLabels = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Visão executiva da operação SaaS",
  },
  clients: {
    title: "Clientes SaaS",
    subtitle: "Gestão das barbearias cadastradas na plataforma",
  },
  finance: {
    title: "Financeiro",
    subtitle: "Receita, MRR, ARR, inadimplência e pagamentos",
  },
  subscriptions: {
    title: "Assinaturas",
    subtitle: "Planos, recorrência, status e gateway de pagamento",
  },
  courtesy: {
    title: "Cortesias",
    subtitle: "Acessos gratuitos concedidos pelo admin master",
  },
  alerts: {
    title: "Alertas",
    subtitle: "Timeline de eventos importantes da plataforma",
  },
  analytics: {
    title: "Analytics",
    subtitle: "Inteligência SaaS avançada e indicadores futuros",
  },
};

function GlobalHeader({ section, loading, onRefresh }) {
  const meta = sectionLabels[section] || sectionLabels.dashboard;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        margin: "-2rem -2rem 1.75rem",
        padding: "1.15rem 2rem",
        background:
          "linear-gradient(180deg, rgba(11,11,14,.96), rgba(11,11,14,.82))",
        backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 18,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: T.muted,
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 7,
            }}
          >
            <ShieldCheck size={13} color={T.accent} />
            Oz.Barber
            <span style={{ color: T.muted }}>·</span>
            <span style={{ color: T.accent }}>Super Admin</span>
          </div>

          <h1
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              margin: 0,
              fontSize: 34,
              letterSpacing: 2,
              color: T.text,
              lineHeight: 1,
            }}
          >
            {meta.title}
          </h1>

          <div
            style={{
              color: T.muted,
              fontSize: 13,
              marginTop: 6,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 620,
            }}
          >
            {meta.subtitle}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 300,
              maxWidth: "28vw",
            }}
          >
            <Search
              size={15}
              color={T.muted}
              style={{
                position: "absolute",
                left: 13,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />

            <input
              placeholder="Buscar no admin..."
              style={{
                width: "100%",
                height: 42,
                background: "rgba(255,255,255,.035)",
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "0 14px 0 38px",
                color: T.text,
                outline: "none",
                fontSize: 13,
                fontFamily: "'DM Sans', sans-serif",
              }}
            />
          </div>

          <button
            title="Atualizar"
            onClick={onRefresh}
            disabled={loading}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: loading ? T.muted : T.text,
              cursor: loading ? "wait" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all .18s ease",
            }}
          >
            <RefreshCw
              size={15}
              style={{
                animation: loading ? "spin 1s linear infinite" : "none",
              }}
            />
          </button>

          <button
            title="Notificações"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.text,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <Bell size={15} />
            <span
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 7,
                height: 7,
                borderRadius: 999,
                background: T.accent,
                boxShadow: `0 0 12px ${T.accent}`,
              }}
            />
          </button>

          <div
            style={{
              height: 42,
              display: "flex",
              alignItems: "center",
              gap: 10,
              borderRadius: 14,
              border: `1px solid ${T.border}`,
              background: "rgba(255,255,255,.035)",
              padding: "0 0.75rem",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 10,
                background: `${T.accent}18`,
                border: `1px solid ${T.accent}24`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={14} color={T.accent} />
            </div>

            <div>
              <div
                style={{
                  color: T.text,
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.1,
                }}
              >
                Admin Master
              </div>
              <div
                style={{
                  color: T.muted,
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                Online
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminView({ section = "dashboard" }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [metrics, setMetrics] = useState(defaultMetrics);
  const [customerGrowth, setCustomerGrowth] = useState([]);
  const [revenueGrowth, setRevenueGrowth] = useState([]);
  const [planDistribution, setPlanDistribution] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [clients, setClients] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [courtesies, setCourtesies] = useState([]);

  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [courtesySearch, setCourtesySearch] = useState("");
  const [courtesyFilter, setCourtesyFilter] = useState("all");
  const [showCourtesyModal, setShowCourtesyModal] = useState(false);
  const [savingCourtesy, setSavingCourtesy] = useState(false);
  const [revoking, setRevoking] = useState(null);
  const [courtesyError, setCourtesyError] = useState("");

  const [form, setForm] = useState({
    email: "",
    type: "unlimited",
    expires_at: "",
    notes: "",
  });

  const loadAll = async () => {
    setLoading(true);
    setErr("");

    try {
      const [
        metricsRes,
        customerGrowthRes,
        revenueGrowthRes,
        planDistributionRes,
        alertsRes,
        clientsRes,
        subscriptionsRes,
        courtesyRes,
      ] = await Promise.all([
        supabase.from("superadmin_dashboard_kpis").select("*").maybeSingle(),
        supabase.from("superadmin_customer_growth").select("*"),
        supabase.from("superadmin_revenue_growth").select("*"),
        supabase.from("superadmin_plan_distribution").select("*"),
        supabase
          .from("superadmin_alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("superadmin_saas_overview")
          .select("*")
          .order("barbershop_created_at", { ascending: false }),
        supabase
          .from("subscriptions")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("courtesy_access")
          .select("*,barbershops(name)")
          .order("created_at", { ascending: false }),
      ]);

      if (metricsRes.error) throw metricsRes.error;
      if (customerGrowthRes.error) throw customerGrowthRes.error;
      if (revenueGrowthRes.error) throw revenueGrowthRes.error;
      if (planDistributionRes.error) throw planDistributionRes.error;
      if (alertsRes.error) throw alertsRes.error;
      if (clientsRes.error) throw clientsRes.error;
      if (subscriptionsRes.error) throw subscriptionsRes.error;
      if (courtesyRes.error) throw courtesyRes.error;

      setMetrics({ ...defaultMetrics, ...(metricsRes.data || {}) });
      setCustomerGrowth(customerGrowthRes.data || []);
      setRevenueGrowth(revenueGrowthRes.data || []);
      setPlanDistribution(planDistributionRes.data || []);
      setAlerts(alertsRes.data || []);
      setClients(clientsRes.data || []);
      setSubscriptions((subscriptionsRes.data || []).map(normalizeSubscription));
      setCourtesies((courtesyRes.data || []).map(normalizeCourtesy));
    } catch (e) {
      console.error(e);
      setErr(e.message || "Erro ao carregar dados do painel administrativo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreateCourtesy = async () => {
    setCourtesyError("");

    const email = form.email.trim().toLowerCase();

    if (!email) return setCourtesyError("Informe o e-mail.");

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setCourtesyError("E-mail inválido.");
    }

    if (form.type === "timed" && !form.expires_at) {
      return setCourtesyError("Informe a data de expiração.");
    }

    setSavingCourtesy(true);

    try {
      const body = {
        email,
        type: form.type,
        expires_at:
          form.type === "timed" ? new Date(form.expires_at).toISOString() : null,
        notes: form.notes.trim() || null,
        status: "active",
      };

      const { error } = await supabase.from("courtesy_access").insert(body);
      if (error) throw error;

      setShowCourtesyModal(false);
      setForm({ email: "", type: "unlimited", expires_at: "", notes: "" });

      await loadAll();
    } catch (e) {
      console.error(e);
      setCourtesyError(e.message || "Erro ao criar cortesia.");
    } finally {
      setSavingCourtesy(false);
    }
  };

  const revokeCourtesy = async (id) => {
    const confirmed = window.confirm(
      "Revogar este acesso? O usuário perderá o acesso imediatamente."
    );

    if (!confirmed) return;

    setRevoking(id);

    try {
      const { error } = await supabase
        .from("courtesy_access")
        .update({
          status: "revoked",
          revoked_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      await loadAll();
    } catch (e) {
      console.error(e);
      alert(e.message || "Erro ao revogar cortesia.");
    } finally {
      setRevoking(null);
    }
  };

  const deleteCourtesy = async (row) => {
    if (row.status !== "revoked") {
      alert("Somente acessos revogados podem ser excluídos.");
      return;
    }

    const confirmed = window.confirm(
      `Excluir definitivamente a cortesia de ${row.display_email || row.email}?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("courtesy_access")
        .delete()
        .eq("id", row.id);

      if (error) throw error;

      await loadAll();
    } catch (e) {
      console.error(e);
      alert(e.message || "Erro ao excluir cortesia.");
    }
  };

  const currentView = useMemo(() => {
    if (section === "dashboard") {
      return (
        <DashboardView
          metrics={metrics}
          customerGrowth={customerGrowth}
          revenueGrowth={revenueGrowth}
          planDistribution={planDistribution}
          alerts={alerts}
        />
      );
    }

    if (section === "clients") {
      return (
        <ClientsView
          rows={clients}
          search={search}
          setSearch={setSearch}
          planFilter={planFilter}
          setPlanFilter={setPlanFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
      );
    }

    if (section === "finance") {
      return (
        <FinanceView
          metrics={metrics}
          planDistribution={planDistribution}
          revenueGrowth={revenueGrowth}
          subscriptions={subscriptions}
        />
      );
    }

    if (section === "subscriptions") {
      return <SubscriptionsView subscriptions={subscriptions} metrics={metrics} />;
    }

    if (section === "courtesy") {
      return (
        <CourtesyView
          metrics={metrics}
          courtesyList={courtesies}
          search={courtesySearch}
          setSearch={setCourtesySearch}
          filter={courtesyFilter}
          setFilter={setCourtesyFilter}
          onNewCourtesy={() => {
            setCourtesyError("");
            setShowCourtesyModal(true);
          }}
          onRevoke={revokeCourtesy}
          onDelete={deleteCourtesy}
          revoking={revoking}
        />
      );
    }

    if (section === "alerts") return <AlertsView alerts={alerts} />;
    if (section === "analytics") return <AnalyticsView />;

    return null;
  }, [
    section,
    alerts,
    clients,
    courtesyFilter,
    courtesySearch,
    courtesies,
    customerGrowth,
    metrics,
    planDistribution,
    planFilter,
    revenueGrowth,
    revoking,
    search,
    statusFilter,
    subscriptions,
  ]);

  return (
    <div style={{ color: T.text, fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes superadminViewFade {
          from {
            opacity: 0;
            transform: translateY(10px);
          }

          to {
            opacity: 1;
            transform: translateY(0px);
          }
        }

        /*
          Remove apenas o título duplicado interno das páginas.
          O header premium superior fica intacto porque está fora de .superadmin-view-content.
        */
        .superadmin-view-content > div > div:first-child {
          display: none !important;
        }
      `}</style>

      <GlobalHeader
        section={section}
        loading={loading}
        onRefresh={loadAll}
      />

      {err && (
        <div
          style={{
            background: T.dangerBg,
            border: `1px solid ${T.danger}44`,
            color: T.danger,
            borderRadius: 12,
            padding: "0.85rem 1rem",
            marginBottom: "1rem",
            fontSize: 13,
          }}
        >
          {err}
        </div>
      )}

      {loading ? (
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: "4rem",
            color: T.muted,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            animation: "superadminViewFade .22s ease both",
          }}
        >
          <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
          Carregando centro de inteligência…
        </div>
      ) : (
        <div
          key={section}
          className="superadmin-view-content"
          style={{
            animation: "superadminViewFade .22s ease both",
          }}
        >
          {currentView}
        </div>
      )}

      {showCourtesyModal && (
        <Modal
          title="NOVA CORTESIA"
          onClose={() => {
            setShowCourtesyModal(false);
            setCourtesyError("");
          }}
        >
          <ErrorMessage message={courtesyError} />

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
              E-mail do usuário
            </div>
            <input
              style={inputSt}
              type="email"
              placeholder="usuario@email.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Tipo de acesso
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "unlimited", icon: Infinity, label: "Indeterminado" },
                { id: "timed", icon: Clock, label: "Prazo determinado" },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = form.type === opt.id;

                return (
                  <button
                    key={opt.id}
                    onClick={() => setForm((f) => ({ ...f, type: opt.id }))}
                    style={{
                      flex: 1,
                      padding: "0.7rem",
                      borderRadius: 10,
                      border: `1px solid ${active ? T.accent : T.border}`,
                      background: active ? `${T.accent}18` : T.surface,
                      color: active ? T.accent : T.muted,
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {form.type === "timed" && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Data de expiração
              </div>

              <input
                style={inputSt}
                type="date"
                value={form.expires_at}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          )}

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>
              Observação
            </div>

            <textarea
              style={{ ...inputSt, minHeight: 76, resize: "vertical" }}
              placeholder="Ex: Cliente parceiro, teste interno, demonstração comercial…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowCourtesyModal(false)}
              style={{
                flex: 1,
                background: T.surface,
                border: `1px solid ${T.border}`,
                color: T.mutedLight,
                borderRadius: 10,
                padding: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cancelar
            </button>

            <button
              onClick={handleCreateCourtesy}
              disabled={savingCourtesy}
              style={{
                flex: 2,
                background: T.accent,
                border: "none",
                color: "#0a0808",
                borderRadius: 10,
                padding: "0.75rem",
                fontWeight: 800,
                cursor: savingCourtesy ? "wait" : "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                fontFamily: "'DM Sans', sans-serif",
                opacity: savingCourtesy ? 0.75 : 1,
              }}
            >
              {savingCourtesy ? (
                <>
                  <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                  Salvando…
                </>
              ) : (
                <>
                  <Check size={15} />
                  Liberar cortesia
                </>
              )}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
