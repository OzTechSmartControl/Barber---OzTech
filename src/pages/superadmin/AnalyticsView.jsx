import { useCallback, useEffect, useState } from "react";
import { Activity, CalendarDays, ClipboardList, TrendingUp, UserPlus, Users } from "lucide-react";

import { supabase } from "../../supabase";
import T from "../../config/theme";
import EmptyState from "../../components/superadmin/EmptyState";
import SectionHeader from "../../components/superadmin/SectionHeader";
import KpiCard from "../../components/superadmin/KpiCard";
import DataTable from "../../components/superadmin/DataTable";

const fmt = (value = 0) => Number(value || 0).toLocaleString("pt-BR");

function todayISO() { return new Date().toISOString().slice(0, 10); }
function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function lastDayOfPrevMonthISO() {
  const d = new Date();
  d.setDate(0);
  return d.toISOString().slice(0, 10);
}
function firstDayOfPrevMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}
function threeMonthsAgoISO() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return d.toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "Este mês",       from: firstOfMonthISO,      to: todayISO                },
  { label: "Mês passado",    from: firstDayOfPrevMonthISO, to: lastDayOfPrevMonthISO },
  { label: "Últimos 3 meses", from: threeMonthsAgoISO,   to: todayISO                },
  { label: "Este ano",       from: () => `${new Date().getFullYear()}-01-01`, to: todayISO },
  { label: "Tudo",           from: () => "2020-01-01",   to: () => "2099-12-31"      },
];

const dateSt = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: "0.5rem 0.75rem",
  color: T.text,
  fontSize: 13,
  outline: "none",
  fontFamily: "'DM Sans', sans-serif",
  colorScheme: "dark",
};

export default function AnalyticsView({ reachTotals = {}, reachByShop = [] }) {
  const [dateFrom,     setDateFrom]     = useState(firstOfMonthISO);
  const [dateTo,       setDateTo]       = useState(todayISO);
  const [activePreset, setActivePreset] = useState(0);
  const [periodStats,  setPeriodStats]  = useState({ period_attendances: 0, period_new_users: 0 });
  const [loadingPeriod, setLoadingPeriod] = useState(false);

  const loadPeriodStats = useCallback(async (from, to) => {
    if (!from || !to) return;
    setLoadingPeriod(true);
    try {
      const { data } = await supabase.rpc("superadmin_analytics_by_period", {
        p_date_from: from,
        p_date_to:   to,
      });
      if (data?.[0]) setPeriodStats(data[0]);
    } catch (e) {
      console.warn("superadmin_analytics_by_period:", e);
    } finally {
      setLoadingPeriod(false);
    }
  }, []);

  useEffect(() => {
    loadPeriodStats(dateFrom, dateTo);
  }, [dateFrom, dateTo, loadPeriodStats]);

  const applyPreset = (i) => {
    const p = PRESETS[i];
    setDateFrom(p.from());
    setDateTo(p.to());
    setActivePreset(i);
  };

  const rows = [...reachByShop]
    .filter((r) => Number(r.users_count || 0) > 0)
    .sort((a, b) => Number(b.users_count || 0) - Number(a.users_count || 0));

  const periodLabel = `${dateFrom} → ${dateTo}`;

  return (
    <div>
      {/* Totais históricos */}
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
          subtitle="Total histórico — admins + barbeiros"
          icon={Users}
          tone="accent"
        />
        <KpiCard
          label="Atendimentos Realizados"
          value={fmt(reachTotals.total_attendances)}
          subtitle="Total histórico facilitado pelo Oz.Barber"
          icon={ClipboardList}
          tone="success"
        />
      </div>

      {/* Filtro de período */}
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
          title="Métricas por Período"
          subtitle="Atendimentos e novos usuários no intervalo selecionado"
          icon={CalendarDays}
          compact
        />

        {/* Preset pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: "1rem" }}>
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => applyPreset(i)}
              style={{
                padding: "0.38rem 0.85rem",
                borderRadius: 999,
                border: `1.5px solid ${activePreset === i ? T.accent : T.border}`,
                background: activePreset === i ? `${T.accent}18` : "transparent",
                color: activePreset === i ? T.accent : T.muted,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all .15s",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: "1.25rem",
          }}
        >
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setActivePreset(null); }}
            style={dateSt}
          />
          <span style={{ color: T.muted, fontSize: 13 }}>até</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setActivePreset(null); }}
            style={dateSt}
          />
        </div>

        {/* Period KPI cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(150px, 1fr))",
            gap: 14,
          }}
        >
          <KpiCard
            label="Atendimentos no Período"
            value={loadingPeriod ? "…" : fmt(periodStats.period_attendances)}
            subtitle={periodLabel}
            icon={ClipboardList}
            tone="info"
          />
          <KpiCard
            label="Novos Usuários no Período"
            value={loadingPeriod ? "…" : fmt(periodStats.period_new_users)}
            subtitle={periodLabel}
            icon={UserPlus}
            tone="success"
          />
        </div>
      </div>

      {/* Tabela por barbearia */}
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
