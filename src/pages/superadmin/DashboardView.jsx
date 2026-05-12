import {
  AlertCircle,
  Ban,
  BarChart3,
  Building2,
  DollarSign,
  PieChart,
  TrendingUp,
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
import ActivityFeed from "../../components/superadmin/ActivityFeed";
import SectionHeader from "../../components/superadmin/SectionHeader";
import EmptyState from "../../components/superadmin/EmptyState";

function ChartShell({ title, subtitle, icon: Icon, children }) {
  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(26,26,36,0.98), rgba(16,17,25,0.98))",
        border: `1px solid ${T.border}`,
        borderRadius: 20,
        padding: "1.25rem",
        minHeight: 315,
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
    <div
      style={{
        background: "#10121a",
        border: `1px solid ${T.border}`,
        borderRadius: 12,
        padding: "0.7rem 0.85rem",
        boxShadow: "0 18px 40px rgba(0,0,0,.35)",
      }}
    >
      <div style={{ color: T.mutedLight, fontSize: 11, marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ color: T.text, fontSize: 13, fontWeight: 800 }}>
        {formatter ? formatter(payload[0].value) : payload[0].value}
      </div>
    </div>
  );
}

function normalizeMonthRows(rows = [], valueKey) {
  return rows.map((row) => ({
    ...row,
    monthLabel: row.month
      ? new Date(`${row.month}T12:00:00`).toLocaleDateString("pt-BR", {
          month: "short",
        })
      : "—",
    value: Number(row[valueKey] || 0),
  }));
}

function RevenueChart({ rows = [] }) {
  const data = normalizeMonthRows(rows, "revenue");
  const hasData = data.some((item) => Number(item.value) > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem dados suficientes"
        subtitle="Quando houver assinaturas pagas, o crescimento de receita será exibido aqui."
      />
    );
  }

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 14, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={T.success} stopOpacity={0.42} />
              <stop offset="95%" stopColor={T.success} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.muted, fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.muted, fontSize: 11 }}
            tickFormatter={(v) => `R$ ${v}`}
          />
          <Tooltip content={<PremiumTooltip formatter={money} />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={T.success}
            strokeWidth={3}
            fill="url(#revenueGradient)"
            dot={{ r: 4, strokeWidth: 2, fill: "#10121a", stroke: T.success }}
            activeDot={{ r: 6 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomersChart({ rows = [] }) {
  const data = normalizeMonthRows(rows, "new_customers");
  const hasData = data.some((item) => Number(item.value) > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Nenhum cliente no período"
        subtitle="Novas barbearias cadastradas aparecerão neste gráfico."
      />
    );
  }

  return (
    <div style={{ height: 220 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 14, left: -18, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} />
          <XAxis
            dataKey="monthLabel"
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.muted, fontSize: 11 }}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: T.muted, fontSize: 11 }}
          />
          <Tooltip
            content={
              <PremiumTooltip formatter={(v) => `${Number(v || 0)} cliente(s)`} />
            }
          />
          <Bar
            dataKey="value"
            fill={T.accent}
            radius={[10, 10, 3, 3]}
            maxBarSize={52}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlanDistribution({ rows = [] }) {
  const total = rows.reduce(
    (sum, item) => sum + Number(item.barbershops_count || 0),
    0
  );

  if (!rows.length || total === 0) {
    return (
      <EmptyState
        icon={PieChart}
        title="Sem distribuição de planos"
        subtitle="Quando houver planos associados, a distribuição será exibida aqui."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((row, index) => {
        const value = Number(row.barbershops_count || 0);
        const percent = total ? (value / total) * 100 : 0;

        return (
          <div key={`${row.plan_name}-${index}`}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 8,
                fontSize: 12,
              }}
            >
              <span style={{ color: T.text, fontWeight: 700 }}>
                {row.plan_name || "Sem plano"}
              </span>
              <span style={{ color: T.mutedLight }}>
                {value} cliente(s) · {percent.toFixed(0)}%
              </span>
            </div>

            <div
              style={{
                height: 10,
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.max(percent, 4)}%`,
                  height: "100%",
                  background:
                    index === 0
                      ? `linear-gradient(90deg, ${T.accent}, #7dd3fc)`
                      : T.accent,
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardView({
  metrics,
  customerGrowth = [],
  revenueGrowth = [],
  planDistribution = [],
  alerts = [],
}) {
  const churnRate =
    metrics.total_barbershops > 0
      ? (metrics.cancelled_barbershops / metrics.total_barbershops) * 100
      : 0;

  const lastMonthCustomers =
    customerGrowth.length > 0
      ? customerGrowth[customerGrowth.length - 1]?.new_customers || 0
      : 0;

  return (
    <div>
      <SectionHeader
        icon={BarChart3}
        title="Dashboard"
        subtitle="Visão executiva, limpa e estratégica da operação SaaS"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(150px, 1fr))",
          gap: 14,
          marginBottom: "1.5rem",
        }}
      >
        <KpiCard
          label="MRR"
          value={money(metrics.mrr)}
          subtitle="Receita recorrente mensal"
          icon={DollarSign}
          tone="success"
        />

        <KpiCard
          label="ARR"
          value={money(metrics.arr)}
          subtitle="Receita anual projetada"
          icon={TrendingUp}
          tone="accent"
        />

        <KpiCard
          label="Clientes ativos"
          value={metrics.active_barbershops}
          subtitle="Assinaturas ativas"
          icon={Building2}
          tone="success"
        />

        <KpiCard
          label="Churn"
          value={pct(churnRate)}
          subtitle="Canceladas / clientes totais"
          icon={Ban}
          tone="danger"
        />

        <KpiCard
          label="Inadimplência"
          value={metrics.overdue_barbershops}
          subtitle="Vencidas ou em atraso"
          icon={AlertCircle}
          tone="warning"
        />

        <KpiCard
          label="Crescimento"
          value={lastMonthCustomers}
          subtitle="Novas contas no último mês"
          icon={UserPlus}
          tone="info"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
          marginBottom: "1.5rem",
        }}
      >
        <ChartShell
          title="Crescimento de Receita"
          subtitle="Evolução da receita registrada por mês"
          icon={TrendingUp}
        >
          <RevenueChart rows={revenueGrowth} />
        </ChartShell>

        <ChartShell
          title="Novos Clientes"
          subtitle="Barbearias cadastradas por mês"
          icon={UserPlus}
        >
          <CustomersChart rows={customerGrowth} />
        </ChartShell>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.05fr 0.95fr",
          gap: 16,
        }}
      >
        <ChartShell
          title="Distribuição de Planos"
          subtitle="Quantidade de clientes por plano"
          icon={PieChart}
        >
          <PlanDistribution rows={planDistribution} />
        </ChartShell>

        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(26,26,36,0.98), rgba(16,17,25,0.98))",
            border: `1px solid ${T.border}`,
            borderRadius: 20,
            padding: "1.25rem",
            minHeight: 315,
            boxShadow: "0 18px 50px rgba(0,0,0,.18)",
          }}
        >
          <SectionHeader
            title="Atividade Recente"
            subtitle="Resumo dos eventos mais importantes"
            icon={AlertCircle}
            compact
          />

          <ActivityFeed items={alerts.slice(0, 6)} compact />
        </div>
      </div>
    </div>
  );
}
