import {
  Building2,
  CreditCard,
  Gift,
  Search,
  Users,
} from "lucide-react";

import T from "../../config/theme";
import { fDate, money } from "../../utils/formatters";
import DataTable from "../../components/superadmin/DataTable";
import KpiCard from "../../components/superadmin/KpiCard";
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

const TYPE_ACTIVE_SUB    = ["redeemed", "paid"];
const TYPE_ACTIVE_COURT  = ["active"];

function calcExpiry(row) {
  if (row.expires_at) return row.expires_at;
  if (row.source !== "subscription") return null;
  const base = row.paid_at || row.created_at;
  if (!base) return null;
  const d = new Date(base);
  if (row.plan === "annual")         d.setFullYear(d.getFullYear() + 1);
  else if (row.plan === "semestral") d.setMonth(d.getMonth() + 6);
  else                               d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

function SourceBadge({ source }) {
  const isCourtesy = source === "courtesy";
  return (
    <span
      style={{
        background: isCourtesy ? `${T.accent}18` : `${T.success}18`,
        color: isCourtesy ? T.accent : T.success,
        border: `1px solid ${isCourtesy ? T.accent : T.success}44`,
        borderRadius: 999,
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 800,
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {isCourtesy ? "Cortesia" : "Assinatura"}
    </span>
  );
}

function StatusBadge({ status, source }) {
  const map = {
    redeemed: { label: "Ativo",     color: T.success, bg: `${T.success}18` },
    paid:     { label: "Pago",      color: T.success, bg: `${T.success}18` },
    active:   { label: "Ativo",     color: T.success, bg: `${T.success}18` },
    expired:  { label: "Expirado",  color: T.warning, bg: `${T.warning}18` },
    pending:  { label: "Pendente",  color: T.warning, bg: `${T.warning}18` },
    revoked:  { label: "Revogado",  color: T.danger,  bg: `${T.danger}18`  },
    cancelled:{ label: "Cancelado", color: T.danger,  bg: `${T.danger}18`  },
  };
  const s = map[status] || { label: status || "—", color: T.muted, bg: T.surface };
  return (
    <span
      style={{
        background: s.bg, color: s.color,
        borderRadius: 999, padding: "3px 9px",
        fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

export default function ClientsView({
  subscriptions = [],
  courtesies    = [],
  search,
  setSearch,
  planFilter,
  setPlanFilter,
  statusFilter,
  setStatusFilter,
}) {
  // Merge: assinantes ativos + cortesias ativas
  const allClients = [
    ...subscriptions.filter((s) => TYPE_ACTIVE_SUB.includes(s.status)),
    ...courtesies.filter((c) => TYPE_ACTIVE_COURT.includes(c.status)),
  ];

  const totalSubscribers = subscriptions.filter((s) => TYPE_ACTIVE_SUB.includes(s.status)).length;
  const totalCourtesies  = courtesies.filter((c) => TYPE_ACTIVE_COURT.includes(c.status)).length;
  const totalAtivos      = totalSubscribers + totalCourtesies;

  // Filtros
  const filteredRows = allClients.filter((item) => {
    const q = (search || "").toLowerCase();
    const matchSearch =
      !search ||
      (item.display_email || "").toLowerCase().includes(q) ||
      (item.display_shop  || "").toLowerCase().includes(q) ||
      (item.display_plan  || "").toLowerCase().includes(q) ||
      (item.source_label  || "").toLowerCase().includes(q);

    const matchPlan =
      planFilter === "all" || item.source === planFilter;

    const matchStatus =
      statusFilter === "all" || item.status === statusFilter;

    return matchSearch && matchPlan && matchStatus;
  });

  const columns = [
    {
      key: "display_email",
      label: "Cliente",
      render: (_value, row) => (
        <div>
          <div style={{ color: T.text, fontWeight: 800, fontSize: 13 }}>
            {row.display_email || "—"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, color: T.muted, fontSize: 11, marginTop: 3 }}>
            <Building2 size={11} />
            <span>{row.display_shop || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "source",
      label: "Tipo",
      render: (_value, row) => <SourceBadge source={row.source} />,
    },
    {
      key: "display_plan",
      label: "Plano",
      render: (_value, row) => (
        <span style={{ color: T.mutedLight, fontSize: 12 }}>
          {row.display_plan || "—"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (_value, row) => <StatusBadge status={row.status} source={row.source} />,
    },
    {
      key: "created_at",
      label: "Desde",
      render: (_value, row) => (
        <span style={{ color: T.muted, fontSize: 12 }}>
          {fDate(row.created_at)}
        </span>
      ),
    },
    {
      key: "expires_at",
      label: "Vencimento",
      render: (_value, row) => {
        if (row.source === "courtesy" && row.type === "unlimited") {
          return <span style={{ color: T.muted, fontSize: 12 }}>Indeterminado</span>;
        }
        const expiry = calcExpiry(row);
        return (
          <span style={{ color: T.muted, fontSize: 12 }}>
            {expiry ? fDate(expiry) : "—"}
          </span>
        );
      },
    },
    {
      key: "amount",
      label: "Valor",
      render: (_value, row) => (
        <span style={{ color: row.source === "subscription" ? T.success : T.muted, fontWeight: 800, fontSize: 13 }}>
          {row.source === "subscription" ? money(row.amount) : "—"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
          marginBottom: "1.5rem",
        }}
      >
        <KpiCard label="Total ativos"  value={totalAtivos}       icon={Users}      tone="success" />
        <KpiCard label="Assinantes"    value={totalSubscribers}  icon={CreditCard} tone="accent"  />
        <KpiCard label="Cortesias"     value={totalCourtesies}   icon={Gift}       tone="info"    />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <Search
            size={14}
            color={T.muted}
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            style={{ ...inputSt, paddingLeft: 34 }}
            placeholder="Buscar por e-mail, barbearia ou plano…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          style={{ ...inputSt, width: 190 }}
        >
          <option value="all">Todos os tipos</option>
          <option value="subscription">Assinatura</option>
          <option value="courtesy">Cortesia</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...inputSt, width: 190 }}
        >
          <option value="all">Todos status</option>
          <option value="redeemed">Ativo (Resgat.)</option>
          <option value="paid">Pago</option>
          <option value="active">Ativo (Cortesia)</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={filteredRows}
      />
    </div>
  );
}
