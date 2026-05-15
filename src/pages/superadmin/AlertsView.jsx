import {
  Bell,
  Building2,
  Clock,
  UserMinus,
  UserPlus,
} from "lucide-react";

import T from "../../config/theme";
import SectionHeader from "../../components/superadmin/SectionHeader";

function getRelativeTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMin < 1) return "Agora";
  if (diffMin < 60) return `${diffMin} min atrás`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "1d atrás";
  return `${diffDays}d atrás`;
}

function getAlertText(item = {}) {
  return [
    item.title,
    item.message,
    item.type,
    item.event_type,
    item.kind,
    item.status,
    item.badge,
    item.tag,
    item.label,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getAlertVisual(item = {}) {
  const text = getAlertText(item);

  const isLostClient =
    text.includes("menos um cliente") ||
    text.includes("cancelou") ||
    text.includes("cancelado") ||
    text.includes("cancelada") ||
    text.includes("cancelled") ||
    text.includes("canceled") ||
    text.includes("encerrou") ||
    text.includes("encerrado") ||
    text.includes("revogou") ||
    text.includes("revogado") ||
    text.includes("revoked");

  if (isLostClient) {
    return {
      label: "Menos um Cliente",
      Icon: UserMinus,
      color: T.danger,
      bg: `${T.danger}14`,
      border: `${T.danger}30`,
      line: `${T.danger}24`,
    };
  }

  return {
    label: "Novo Cliente",
    Icon: UserPlus,
    color: T.success,
    bg: `${T.success}14`,
    border: `${T.success}30`,
    line: `${T.success}24`,
  };
}

function getTitle(item = {}) {
  return item.title || item.message || "Alerta";
}

function getSource(item = {}) {
  return (
    item.source_name ||
    item.entity_name ||
    item.subtitle ||
    item.barbershop_name ||
    item.description ||
    item.email ||
    "Sistema"
  );
}

export default function AlertsView({ alerts = [] }) {
  return (
    <div>
      <SectionHeader
        icon={Bell}
        title="Alertas"
        subtitle="Central de eventos da plataforma em formato de timeline"
      />

      <div style={{ marginTop: "1rem" }}>
        {alerts.map((item, index) => {
          const visual = getAlertVisual(item);
          const Icon = visual.Icon;
          const source = getSource(item);
          const time = getRelativeTime(
            item.created_at || item.occurred_at || item.timestamp
          );

          return (
            <div
              key={item.id || `${getTitle(item)}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "44px minmax(0, 1fr) auto",
                gap: 14,
                alignItems: "start",
                position: "relative",
                paddingBottom: 22,
              }}
            >
              <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
                {index < alerts.length - 1 && (
                  <div
                    style={{
                      position: "absolute",
                      top: 40,
                      bottom: -22,
                      width: 1,
                      background: visual.line,
                    }}
                  />
                )}

                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    background: visual.bg,
                    border: `1px solid ${visual.border}`,
                    color: visual.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 18px ${visual.color}12`,
                    zIndex: 1,
                  }}
                >
                  <Icon size={17} />
                </div>
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      color: T.text,
                      fontSize: 14,
                      fontWeight: 900,
                      lineHeight: 1.25,
                    }}
                  >
                    {getTitle(item)}
                  </div>

                  <div
                    style={{
                      background: visual.bg,
                      border: `1px solid ${visual.border}`,
                      color: visual.color,
                      borderRadius: 999,
                      padding: "3px 9px",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: 0.55,
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {visual.label}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: T.muted,
                    fontSize: 12,
                    minWidth: 0,
                  }}
                >
                  <Building2 size={12} />
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {source}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: T.muted,
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  paddingTop: 3,
                }}
              >
                <Clock size={12} />
                {time}
              </div>
            </div>
          );
        })}

        {!alerts.length && (
          <div
            style={{
              background: T.card,
              border: `1px solid ${T.border}`,
              borderRadius: 18,
              padding: "2.5rem",
              textAlign: "center",
              color: T.muted,
              fontSize: 14,
            }}
          >
            Nenhum alerta encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
