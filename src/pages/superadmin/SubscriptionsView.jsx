import { CreditCard } from "lucide-react";

import T from "../../config/theme";
import { fDate, money } from "../../utils/formatters";
import DataTable from "../../components/superadmin/DataTable";
import SectionHeader from "../../components/superadmin/SectionHeader";
import KpiCard from "../../components/superadmin/KpiCard";

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
  if (row.plan === "annual")         d.setFullYear(d.getFullYear() + 1);
  else if (row.plan === "semestral") d.setMonth(d.getMonth() + 6);
  else                               d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

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
      render: (_value, row) => STATUS_LABEL[row.status] || row.status || "—",
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
      key: "paid_at",
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
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginBottom: "1.5rem",
        }}
      >
        <KpiCard label="Ativas"       value={metrics.active_subscriptions}   icon={CreditCard} tone="success" />
        <KpiCard label="Inadimplentes" value={metrics.overdue_subscriptions}  icon={CreditCard} tone="warning" />
        <KpiCard label="Canceladas"   value={metrics.cancelled_subscriptions} icon={CreditCard} tone="danger"  />
        <KpiCard label="Gateway"      value="MP" subtitle="Mercado Pago"      icon={CreditCard} tone="accent"  />
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
