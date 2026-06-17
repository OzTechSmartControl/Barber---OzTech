import { Activity, ClipboardList, TrendingUp, Users } from "lucide-react";

import T from "../../config/theme";
import EmptyState from "../../components/superadmin/EmptyState";
import SectionHeader from "../../components/superadmin/SectionHeader";
import KpiCard from "../../components/superadmin/KpiCard";
import DataTable from "../../components/superadmin/DataTable";

const fmt = (value = 0) => Number(value || 0).toLocaleString("pt-BR");

export default function AnalyticsView({ reachTotals = {}, reachByShop = [] }) {
  const rows = [...reachByShop]
    .filter((r) => Number(r.users_count || 0) > 0)
    .sort((a, b) => Number(b.users_count || 0) - Number(a.users_count || 0));

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(150px, 1fr))",
          gap: 14,
          marginBottom: "1.5rem",
        }}
      >
        <KpiCard
          label="Usuários Cadastrados"
          value={fmt(reachTotals.total_users)}
          subtitle="Admins + barbeiros em toda a plataforma"
          icon={Users}
          tone="accent"
        />
        <KpiCard
          label="Atendimentos Realizados"
          value={fmt(reachTotals.total_attendances)}
          subtitle="Total facilitado pelo Oz.Barber"
          icon={ClipboardList}
          tone="success"
        />
      </div>

      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: "1.25rem",
          marginBottom: "1.5rem",
          boxShadow: "0 18px 50px rgba(0,0,0,.18)",
        }}
      >
        <SectionHeader
          title="Usuários por Barbearia"
          subtitle="Quantidade de admins + barbeiros cadastrados em cada cliente"
          icon={Users}
          compact
        />

        <DataTable
          columns={[
            { key: "barbershop_name", label: "Barbearia" },
            { key: "users_count", label: "Usuários", align: "right", render: (v) => fmt(v) },
          ]}
          rows={rows}
          emptyTitle="Nenhuma barbearia encontrada"
          emptySubtitle="Quando houver barbearias cadastradas, a contagem de usuários aparecerá aqui."
        />
      </div>

      <EmptyState
        icon={Activity}
        title="Mais análises em breve"
        subtitle="Aqui entrarão retenção, churn avançado, LTV, CAC, cohort, conversão trial → pago e health score."
        action={
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={14} />
            Preparado para a próxima fase
          </div>
        }
      />
    </div>
  );
}
