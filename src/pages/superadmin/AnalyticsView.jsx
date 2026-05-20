import { Activity, BarChart3, TrendingUp } from "lucide-react";

import EmptyState from "../../components/superadmin/EmptyState";
import SectionHeader from "../../components/superadmin/SectionHeader";

export default function AnalyticsView() {
  return (
    <div>
      <EmptyState
        icon={Activity}
        title="Analytics avançado em breve"
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
