import T from "../../config/theme";
import EmptyState from "./EmptyState";
import { AlertCircle, Ban, Bell, UserPlus } from "lucide-react";
import { fDatetime } from "../../utils/formatters";

function iconFor(type) {
  if (type === "overdue_subscription") {
    return { Icon: AlertCircle, color: T.warning, bg: T.warningBg };
  }

  if (type === "cancelled_subscription") {
    return { Icon: Ban, color: T.danger, bg: T.dangerBg };
  }

  if (type === "new_customer") {
    return { Icon: UserPlus, color: T.success, bg: T.successBg };
  }

  return { Icon: Bell, color: T.accent, bg: `${T.accent}18` };
}

export default function ActivityFeed({ items = [], compact = false }) {
  if (!items.length) {
    return (
      <EmptyState
        icon={Bell}
        title="Nenhum evento encontrado"
        subtitle="Eventos importantes da plataforma aparecerão aqui."
      />
    );
  }

  return (
    <div
      style={{
        background: compact ? "transparent" : T.card,
        border: compact ? "none" : `1px solid ${T.border}`,
        borderRadius: compact ? 0 : 18,
        overflow: "hidden",
      }}
    >
      {items.map((item, index) => {
        const { Icon, color, bg } = iconFor(item.type);

        return (
          <div
            key={`${item.type}-${item.created_at}-${index}`}
            style={{
              display: "flex",
              gap: 12,
              padding: compact ? "0.75rem 0" : "1rem 1.1rem",
              borderBottom:
                index < items.length - 1 ? `1px solid ${T.border}` : "none",
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                background: bg,
                border: `1px solid ${color}22`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={15} color={color} />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  color: T.text,
                  fontSize: 13,
                  fontWeight: 700,
                  marginBottom: 3,
                }}
              >
                {item.message || "Evento da plataforma"}
              </div>

              <div
                style={{
                  color: T.muted,
                  fontSize: 12,
                  lineHeight: 1.45,
                }}
              >
                {item.reference || "—"}
              </div>
            </div>

            <div
              style={{
                color: T.muted,
                fontSize: 11,
                whiteSpace: "nowrap",
                paddingTop: 3,
              }}
            >
              {fDatetime(item.created_at)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
