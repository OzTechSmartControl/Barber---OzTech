import {
  AlertCircle,
  Ban,
  BarChart3,
  Bell,
  Building2,
  Clock,
  DollarSign,
  PieChart,
  TrendingUp,
  UserMinus,
  UserPlus,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import T from "../../config/theme";
import { money, pct } from "../../utils/formatters";
import KpiCard from "../../components/superadmin/KpiCard";
import SectionHeader from "../../components/superadmin/SectionHeader";
import EmptyState from "../../components/superadmin/EmptyState";

// ── helpers compartilhados com AlertsView ────────────────────────
function getRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs  = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1)  return "Agora";
  if (diffMin < 60) return `${diffMin} min atrás`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "1d atrás" : `${diffDays}d atrás`;
}

function getAlertText(item = {}) {
  return [item.title, item.message, item.type, item.event_type, item.kind, item.status, item.badge, item.tag, item.label]
    .filter(Boolean).join(" ").toLowerCase();
}

function getAlertVisual(item = {}) {
  const text = getAlertText(item);
  const isLost =
    text.includes("menos um cliente") || text.includes("cancelou") ||
    text.includes("cancelado")        || text.includes("cancelada") ||
    text.includes("cancelled")        || text.includes("canceled")  ||
    text.includes("encerrou")         || text.includes("encerrado") ||
    text.includes("revogou")          || text.includes("revogado")  ||
    text.includes("revoked");
  if (isLost) return { label: "Menos um Cliente", Icon: UserMinus, color: T.danger,  bg: `${T.danger}14`,  border: `${T.danger}30`,  line: `${T.danger}24` };
  return       { label: "Novo Cliente",            Icon: UserPlus,  color: T.success, bg: `${T.success}14`, border: `${T.success}30`, line: `${T.success}24` };
}

function getTitle(item  = {}) { return item.title  || item.message || "Alerta"; }
function getSource(item = {}) {
  return item.source_name || item.entity_name || item.subtitle || item.barbershop_name || item.description || item.email || "Sistema";
}

// ── mini feed de alertas (mesmo visual de AlertsView) ────────────
function AlertMiniList({ items = [] }) {
  if (!items.length) {
    return (
      <div style={{ color: T.muted, fontSize: 13, textAlign: "center", marginTop: "1.5rem" }}>
        Nenhum evento recente.
      </div>
    );
  }

  return (
    <div style={{ marginTop: "0.75rem" }}>
      {items.map((item, index) => {
        const visual = getAlertVisual(item);
        const Icon   = visual.Icon;
        const source = getSource(item);
        const time   = getRelativeTime(item.created_at || item.occurred_at || item.timestamp);

        return (
          <div
            key={item.id || `${getTitle(item)}-${index}`}
            style={{
              display: "grid",
              gridTemplateColumns: "36px minmax(0, 1fr) auto",
              gap: 10,
              alignItems: "start",
              position: "relative",
              paddingBottom: 18,
            }}
          >
            {/* linha vertical */}
            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              {index < items.length - 1 && (
                <div style={{ position: "absolute", top: 34, bottom: -18, width: 1, background: visual.line }} />
              )}
              <div
                style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: visual.bg, border: `1px solid ${visual.border}`,
                  color: visual.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: `0 0 14px ${visual.color}12`, zIndex: 1,
                }}
              >
                <Icon size={14} />
              </div>
            </div>

            {/* conteúdo */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                <div style={{ color: T.text, fontSize: 13, fontWeight: 800, lineHeight: 1.25 }}>
                  {getTitle(item)}
                </div>
                <div
                  style={{
                    background: visual.bg, border: `1px solid ${visual.border}`,
                    color: visual.color, borderRadius: 999,
                    padding: "2px 7px", fontSize: 9, fontWeight: 900,
                    letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
                  }}
                >
                  {visual.label}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.muted, fontSize: 11 }}>
                <Building2 size={11} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {source}
                </span>
              </div>
            </div>

            {/* tempo */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.muted, fontSize: 11, whiteSpace: "nowrap", paddingTop: 2 }}>
              <Clock size={11} />
              {time}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── gráficos ──────────────────────────────────────────────────────
function ChartShell({ title, subtitle, icon: Icon, children }) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`, borderRadius: 20,
        padding: "1.25rem", minHeight: 315,
        boxShadow: "0 18px 50px rgba(0,0,0,.18)",
      }}
    >
      <SectionHeader title={title} subtitle={subtitle} icon={Icon} compact />
      {children}
    </div>
  );
}

function PremiumTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "0.7rem 0.85rem", boxShadow: "0 18px 40px rgba(0,0,0,.35)" }}>
      <div style={{ color: T.mutedLight, fontSize: 11, marginBottom: 5 }}>{label}</div>
      <div style={{ color: T.text, fontSize: 13, fontWeight: 800 }}>
        {formatter ? formatter(payload[0].value) : payload[0].value}
      </div>
    </div>
  );
}

function normalizeMonthRows(rows = [], valueKey) {
  return rows.map((row) => ({
    ...row,
    monthLabel: row.month ? new Date(`${row.month}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }) : "—",
    value: Number(row[valueKey] || 0),
  }));
}

function RevenueChart({ rows = [] }) {
  const data    = normalizeMonthRows(rows, "revenue");
  const hasData = data.some((item) => Number(item.value) > 0);
  if (!hasData) return <EmptyState icon={BarChart3} title="Sem dados suficientes" subtitle="Quando houver assinaturas pagas, o crescimento de receita será exibido aqui." />;
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 14, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={T.success} stopOpacity={0.42} />
              <stop offset="95%" stopColor={T.success} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={T.border} vertical={false} />
          <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fill: T.muted, fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: T.muted, fontSize: 11 }} tickFormatter={(v) => `R$ ${v}`} />
          <Tooltip content={<PremiumTooltip formatter={money} />} />
          <Area type="monotone" dataKey="value" stroke={T.success} strokeWidth={3} fill="url(#revenueGradient)"
            dot={{ r: 4, strokeWidth: 2, fill: T.card, stroke: T.success }} activeDot={{ r: 6 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomersChart({ rows = [] }) {
  const data    = normalizeMonthRows(rows, "new_customers");
  const hasData = data.some((item) => Number(item.value) > 0);
  if (!hasData) return <EmptyState icon={UserPlus} title="Nenhum cliente no período" subtitle="Novas barbearias cadastradas aparecerão neste gráfico." />;
  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 14, left: -18, bottom: 0 }}>
          <CartesianGrid stroke={T.border} vertical={false} />
          <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fill: T.muted, fontSize: 11 }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: T.muted, fontSize: 11 }} />
          <Tooltip content={<PremiumTooltip formatter={(v) => `${Number(v || 0)} cliente(s)`} />} />
          <Bar dataKey="value" fill={T.accent} radius={[10, 10, 3, 3]} maxBarSize={52} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlanDistribution({ rows = [] }) {
  const total = rows.reduce((sum, item) => sum + Number(item.barbershops_count || 0), 0);
  if (!rows.length || total === 0) return <EmptyState icon={PieChart} title="Sem distribuição de planos" subtitle="Quando houver planos associados, a distribuição será exibida aqui." />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((row, index) => {
        const value   = Number(row.barbershops_count || 0);
        const percent = total ? (value / total) * 100 : 0;
        return (
          <div key={`${row.plan_name}-${index}`}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8, fontSize: 12 }}>
              <span style={{ color: T.text, fontWeight: 700 }}>{row.plan_name || "Sem plano"}</span>
              <span style={{ color: T.mutedLight }}>{value} cliente(s) · {percent.toFixed(0)}%</span>
            </div>
            <div style={{ height: 10, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${Math.max(percent, 4)}%`, height: "100%", background: index === 0 ? `linear-gradient(90deg, ${T.accent}, #7dd3fc)` : T.accent, borderRadius: 999 }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── view principal ────────────────────────────────────────────────
export default function DashboardView({
  metrics,
  customerGrowth  = [],
  revenueGrowth   = [],
  planDistribution = [],
  alerts           = [],
}) {
  const churnRate = metrics.total_barbershops > 0
    ? (metrics.cancelled_barbershops / metrics.total_barbershops) * 100
    : 0;

  const lastMonthCustomers = customerGrowth.length > 0
    ? customerGrowth[customerGrowth.length - 1]?.new_customers || 0
    : 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(150px, 1fr))", gap: 14, marginBottom: "1.5rem" }}>
        <KpiCard label="MRR"            value={money(metrics.mrr)}             subtitle="Receita recorrente mensal"     icon={DollarSign}  tone="success" />
        <KpiCard label="ARR"            value={money(metrics.arr)}             subtitle="Receita anual projetada"       icon={TrendingUp}  tone="accent"  />
        <KpiCard label="Clientes ativos" value={metrics.active_barbershops}    subtitle="Assinaturas ativas"            icon={Building2}   tone="success" />
        <KpiCard label="Churn"          value={pct(churnRate)}                 subtitle="Canceladas / clientes totais"  icon={Ban}         tone="danger"  />
        <KpiCard label="Inadimplência"  value={metrics.overdue_barbershops}    subtitle="Vencidas ou em atraso"         icon={AlertCircle} tone="warning" />
        <KpiCard label="Crescimento"    value={lastMonthCustomers}             subtitle="Novas contas no último mês"    icon={UserPlus}    tone="info"    />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16, marginBottom: "1.5rem" }}>
        <ChartShell title="Crescimento de Receita" subtitle="Evolução da receita registrada por mês" icon={TrendingUp}>
          <RevenueChart rows={revenueGrowth} />
        </ChartShell>
        <ChartShell title="Novos Clientes" subtitle="Barbearias cadastradas por mês" icon={UserPlus}>
          <CustomersChart rows={customerGrowth} />
        </ChartShell>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 16 }}>
        <ChartShell title="Distribuição de Planos Ativos" subtitle="Clientes ativos por modalidade de acesso" icon={PieChart}>
          <PlanDistribution rows={planDistribution} />
        </ChartShell>

        {/* Atividade Recente — mesmo visual do AlertsView */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`, borderRadius: 20,
            padding: "1.25rem", minHeight: 315,
            boxShadow: "0 18px 50px rgba(0,0,0,.18)",
            overflow: "hidden",
          }}
        >
          <SectionHeader title="Atividade Recente" subtitle="Resumo dos eventos mais importantes" icon={Bell} compact />
          <AlertMiniList items={alerts.slice(0, 6)} />
        </div>
      </div>
    </div>
  );
}
