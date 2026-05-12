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
  
  import T from "../../config/theme";
  import { money, pct } from "../../utils/formatters";
  import KpiCard from "../../components/superadmin/KpiCard";
  import ChartCard from "../../components/superadmin/ChartCard";
  import ActivityFeed from "../../components/superadmin/ActivityFeed";
  import SectionHeader from "../../components/superadmin/SectionHeader";
  
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
          subtitle="Visão executiva da operação SaaS do Oz.Barber"
        />
  
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
          <ChartCard
            title="Crescimento de Receita"
            subtitle="Receita registrada por mês"
            rows={revenueGrowth}
            labelKey="month"
            valueKey="revenue"
            valueFormatter={money}
            type="column"
            icon={TrendingUp}
          />
  
          <ChartCard
            title="Novos Clientes"
            subtitle="Barbearias cadastradas por mês"
            rows={customerGrowth}
            labelKey="month"
            valueKey="new_customers"
            valueFormatter={(v) => `${v} cliente(s)`}
            type="column"
            icon={UserPlus}
          />
        </div>
  
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.15fr 0.85fr",
            gap: 16,
          }}
        >
          <ChartCard
            title="Distribuição de Planos"
            subtitle="Quantidade de clientes por plano"
            rows={planDistribution}
            labelKey="plan_name"
            valueKey="barbershops_count"
            valueFormatter={(v) => `${v} conta(s)`}
            type="bar"
            icon={PieChart}
          />
  
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 18,
              padding: "1.25rem",
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
  