import { Building2, Search } from "lucide-react";

import T from "../../config/theme";
import { fDate, money } from "../../utils/formatters";
import DataTable from "../../components/superadmin/DataTable";
import SectionHeader from "../../components/superadmin/SectionHeader";

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

function StatusBadge({ status }) {
  const map = {
    active: { label: "Ativo", color: T.success, bg: T.successBg },
    expired: { label: "Expirado", color: T.warning, bg: T.warningBg },
    past_due: { label: "Inadimplente", color: T.warning, bg: T.warningBg },
    overdue: { label: "Vencido", color: T.warning, bg: T.warningBg },
    cancelled: { label: "Cancelado", color: T.danger, bg: T.dangerBg },
    none: { label: "Sem assinatura", color: T.mutedLight, bg: T.surface },
  };

  const s = map[status || "none"] || map.none;

  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 999,
        padding: "3px 9px",
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

export default function ClientsView({
  rows = [],
  search,
  setSearch,
  planFilter,
  setPlanFilter,
  statusFilter,
  setStatusFilter,
}) {
  const filteredRows = rows.filter((item) => {
    const q = (search || "").toLowerCase();

    const matchSearch =
      !search ||
      (item.barbershop_name || "").toLowerCase().includes(q) ||
      (item.plan_name || "").toLowerCase().includes(q) ||
      (item.subscription_status || "").toLowerCase().includes(q);

    const matchPlan =
      planFilter === "all" || (item.billing_cycle || "none") === planFilter;

    const matchStatus =
      statusFilter === "all" ||
      (item.subscription_status || "none") === statusFilter;

    return matchSearch && matchPlan && matchStatus;
  });

  const columns = [
    {
      key: "barbershop_name",
      label: "Barbearia",
      render: (row) => (
        <div>
          <div style={{ color: T.text, fontWeight: 800 }}>
            {row.barbershop_name || "—"}
          </div>
          <div style={{ color: T.muted, fontSize: 11, marginTop: 3 }}>
            Cliente SaaS / tenant
          </div>
        </div>
      ),
    },
    {
      key: "plan_name",
      label: "Plano",
      muted: true,
      render: (row) => row.plan_name || "Sem plano",
    },
    {
      key: "subscription_status",
      label: "Status",
      nowrap: true,
      render: (row) => <StatusBadge status={row.subscription_status || "none"} />,
    },
    {
      key: "users_count",
      label: "Usuários",
      nowrap: true,
      muted: true,
      render: (row) => row.users_count || 0,
    },
    {
      key: "barbers_count",
      label: "Barbeiros",
      nowrap: true,
      muted: true,
      render: (row) => row.barbers_count || 0,
    },
    {
      key: "expires_at",
      label: "Vencimento",
      nowrap: true,
      muted: true,
      render: (row) => fDate(row.expires_at),
    },
    {
      key: "mrr",
      label: "MRR",
      nowrap: true,
      render: (row) => (
        <span style={{ color: Number(row.mrr) > 0 ? T.success : T.muted }}>
          {money(row.mrr)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        icon={Building2}
        title="Clientes SaaS"
        subtitle="Gestão das barbearias cadastradas como tenants da plataforma"
      />

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <Search
            size={14}
            color={T.muted}
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            style={{ ...inputSt, paddingLeft: 34 }}
            placeholder="Buscar barbearia, plano ou status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          style={{ ...inputSt, width: 180 }}
        >
          <option value="all">Todos os planos</option>
          <option value="monthly">Mensal</option>
          <option value="semestral">Semestral</option>
          <option value="annual">Anual</option>
          <option value="none">Sem plano</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputSt, width: 190 }}
        >
          <option value="all">Todos status</option>
          <option value="active">Ativo</option>
          <option value="expired">Expirado</option>
          <option value="past_due">Inadimplente</option>
          <option value="cancelled">Cancelado</option>
          <option value="none">Sem assinatura</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={filteredRows}
        emptyTitle="Nenhuma barbearia encontrada"
        emptySubtitle="Tente ajustar os filtros ou a busca."
      />
    </div>
  );
}
