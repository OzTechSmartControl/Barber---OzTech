import { CreditCard } from "lucide-react";

import T from "../../config/theme";
import { fDate, money } from "../../utils/formatters";
import DataTable from "../../components/superadmin/DataTable";
import SectionHeader from "../../components/superadmin/SectionHeader";
import KpiCard from "../../components/superadmin/KpiCard";

export default function SubscriptionsView({ subscriptions = [], metrics }) {
  const columns = [
    {
      key: "display_plan",
      label: "Plano",
      render: (_value, row) => (
        <div>
          <div style={{ color: T.text, fontWeight: 800 }}>
            {row.display_plan || row.plan || "—"}
          </div>
          <div style={{ color: T.muted, fontSize: 11, marginTop: 3 }}>
            Gateway: Mercado Pago
          </div>
        </div>
      ),
    },
    {
      key: "display_email",
      label: "Pagador",
      render: (_value, row) =>
        row.display_email || row.email || row.mp_payer_email || "—",
    },
    {
      key: "status",
      label: "Status",
      render: (_value, row) => row.status || "—",
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
      key: "created_at",
      label: "Início",
      render: (_value, row) => fDate(row.created_at || row.started_at),
    },
    {
      key: "expires_at",
      label: "Renovação",
      render: (_value, row) => fDate(row.expires_at),
    },
  ];

  return (
    <div>
      <SectionHeader
        icon={CreditCard}
        title="Assinaturas"
        subtitle="Centro de assinaturas, recorrência e gateway de pagamento"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginBottom: "1.5rem",
        }}
      >
        <KpiCard
          label="Ativas"
          value={metrics.active_subscriptions}
          icon={CreditCard}
          tone="success"
        />

        <KpiCard
          label="Inadimplentes"
          value={metrics.overdue_subscriptions}
          icon={CreditCard}
          tone="warning"
        />

        <KpiCard
          label="Canceladas"
          value={metrics.cancelled_subscriptions}
          icon={CreditCard}
          tone="danger"
        />

        <KpiCard
          label="Gateway"
          value="MP"
          subtitle="Mercado Pago"
          icon={CreditCard}
          tone="accent"
        />
      </div>

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
