import {
  Activity,
  AlertCircle,
  Ban,
  BarChart3,
  CalendarDays,
  CreditCard,
  DollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";

import T from "../../config/theme";
import { fDate, money } from "../../utils/formatters";
import KpiCard from "../../components/superadmin/KpiCard";
import ChartCard from "../../components/superadmin/ChartCard";
import DataTable from "../../components/superadmin/DataTable";
import SectionHeader from "../../components/superadmin/SectionHeader";

const STATUS_LABEL = {
  redeemed: "Ativo",
  paid:     "Pago",
  pending:  "Pendente",
  cancelled:"Cancelado",
  refunded: "Reembolsado",
};

function calcExpiry(row) {
  if (row.expires_at) return row.expires_at;
  const base = row.paid_at || row.created_at;
  if (!base) return null;
  const d = new Date(base);
  if (row.plan === "annual")    d.setFullYear(d.getFullYear() + 1);
  else if (row.plan === "semestral") d.setMonth(d.getMonth() + 6);
  else                               d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

export default function FinanceView({
  metrics,
  planDistribution = [],
  revenueGrowth = [],
  subscriptions = [],
}) {
  const columns = [
    {
      key: "display_plan",
      label: "Plano",
      render: (_value, row) => (
        <div>
          <div style={{ color: T.text, fontWeight: 700 }}>
            {row.display_plan || row.plan || "—"}
          </div>
          <div style={{ color: T.muted, fontSize: 11, marginTop: 3 }}>
            {row.display_email || row.email || row.mp_payer_email || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Valor",
      render: (_value, row) => (
        <span style={{ color: T.success, fontWeight: 800 }}>
          {money(row.amount)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (_value, row) => STATUS_LABEL[row.status] || row.status || "—",
    },
    {
      key: "created_at",
      label: "Contratado em",
      render: (_value, row) => fDate(row.paid_at || row.created_at),
    },
    {
      key: "expires_at",
      label: "Expira em",
      render: (_value, row) => fDate(calcExpiry(row)),
    },
  ];

  return (
    <div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
          gap: 14,
          marginBottom: "1.5rem",
        }}
      >
        <KpiCard label="Receita mensal"   value={money(metrics.mrr)}            icon={DollarSign}  tone="success" />
        <KpiCard label="Receita prevista" value={money(metrics.arr)}            icon={TrendingUp}  tone="accent"  subtitle="ARR projetado" />
        <KpiCard label="Ticket médio"     value={money(metrics.average_ticket)} icon={Activity}    tone="info" />
        <KpiCard label="Assinaturas ativas"  value={metrics.active_subscriptions}  icon={CreditCard}  tone="success" />
        <KpiCard label="Inadimplência"    value={metrics.overdue_subscriptions}  icon={AlertCircle} tone="warning" />
        <KpiCard label="Cancelamentos"    value={metrics.cancelled_subscriptions} icon={Ban}        tone="danger" />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
          marginBottom: "1.5rem",
        }}
      >
        <ChartCard
          title="Receita Mensal"
          subtitle="Receita registrada por mês"
          rows={revenueGrowth}
          labelKey="month"
          valueKey="revenue"
          valueFormatter={money}
          type="column"
          icon={BarChart3}
        />
        <ChartCard
          title="Receita por Plano"
          subtitle="MRR distribuído por categoria"
          rows={planDistribution}
          labelKey="plan_name"
          valueKey="mrr"
          valueFormatter={money}
          type="bar"
          icon={DollarSign}
        />
      </div>

      <SectionHeader
        icon={CalendarDays}
        title="Pagamentos Recentes"
        subtitle="Registros capturados pelo gateway/webhook"
      />

      <DataTable
        columns={columns}
        data={subscriptions}
        title=""
        searchable={true}
        pageSize={10}
      />
    </div>
  );
}
