import { Bell } from "lucide-react";

import ActivityFeed from "../../components/superadmin/ActivityFeed";
import SectionHeader from "../../components/superadmin/SectionHeader";

export default function AlertsView({ alerts = [] }) {
  return (
    <div>
      <SectionHeader
        icon={Bell}
        title="Alertas"
        subtitle="Central de eventos da plataforma em formato de timeline"
      />

      <ActivityFeed items={alerts} />
    </div>
  );
}
