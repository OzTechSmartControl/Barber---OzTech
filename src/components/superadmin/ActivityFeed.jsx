import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  ShieldAlert,
  UserPlus,
  XCircle,
} from "lucide-react";

import T from "../../config/theme";

function relativeTime(dateString) {
  if (!dateString) return "Agora";

  const now = new Date();
  const date = new Date(dateString);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return "Agora";

  const minutes = Math.floor(diff / 60);
  if (minutes < 60) return `${minutes} min atrás`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;

  return date.toLocaleDateString("pt-BR");
}

function getAlertConfig(item) {
  const type = item?.type || "default";

  const configs = {
    new_customer: {
      icon: UserPlus,
      color: T.success,
      bg: `${T.success}14`,
      border: `${T.success}22`,
      label: "Novo Cliente",
    },

    new_subscription: {
      icon: CreditCard,
      color: T.accent,
      bg: `${T.accent}14`,
      border: `${T.accent}22`,
      label: "Nova Assinatura",
    },

    overdue: {
      icon: AlertTriangle,
      color: T.warning,
      bg: `${T.warning}14`,
      border: `${T.warning}22`,
      label: "Inadimplência",
    },

    cancelled: {
      icon: XCircle,
      color: T.danger,
      bg: `${T.danger}14`,
      border: `${T.danger}22`,
      label: "Cancelamento",
    },

    risk: {
      icon: ShieldAlert,
      color: "#fb7185",
      bg: "rgba(251,113,133,.12)",
      border: "rgba(251,113,133,.22)",
      label: "Risco de Churn",
    },

    active: {
      icon: CheckCircle2,
      color: T.success,
      bg: `${T.success}14`,
      border: `${T.success}22`,
      label: "Conta Ativa",
    },

    default: {
      icon: Bell,
      color: T.mutedLight,
      bg: `${T.surface}`,
      border: `${T.border}`,
      label: "Evento",
    },
  };

  return configs[type] || configs.default;
}

function TimelineItem({ item, compact = false, isLast }) {
  const cfg = getAlertConfig(item);
  const Icon = cfg.icon;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        gap: 14,
        paddingBottom: isLast ? 0 : 18,
      }}
    >
      {!isLast && (
        <div
          style={{
            position: "absolute",
            left: 20,
            top: 46,
            bottom: -6,
            width: 1,
            background: "rgba(255,255,255,.08)",
          }}
        />
      )}

      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 14,
          background: cfg.bg,
          border: `1px solid ${cfg.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: `0 0 24px ${cfg.color}12`,
          position: "relative",
          zIndex: 2,
        }}
      >
        <Icon size={18} color={cfg.color} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: compact ? "center" : "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  color: T.text,
                  fontSize: compact ? 13 : 14,
                  fontWeight: 800,
                }}
              >
                {item.message || cfg.label}
              </span>

              <div
                style={{
                  fontSize: 10,
                  padding: "4px 7px",
                  borderRadius: 999,
                  background: cfg.bg,
                  border: `1px solid ${cfg.border}`,
                  color: cfg.color,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {cfg.label}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                color: T.muted,
                fontSize: 12,
              }}
            >
              <Building2 size={12} />
              {item.reference || "Sistema"}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: T.muted,
              fontSize: 11,
              whiteSpace: "nowrap",
            }}
          >
            <Clock3 size={11} />
            {relativeTime(item.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ActivityFeed({
  items = [],
  compact = false,
}) {
  if (!items.length) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 240,
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            background: `${T.surface}`,
            border: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Bell size={26} color={T.muted} />
        </div>

        <div
          style={{
            color: T.text,
            fontWeight: 800,
            marginBottom: 6,
          }}
        >
          Nenhuma atividade recente
        </div>

        <div
          style={{
            color: T.muted,
            fontSize: 13,
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          Novos eventos da plataforma aparecerão automaticamente aqui.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? 12 : 18,
      }}
    >
      {items.map((item, index) => (
        <TimelineItem
          key={index}
          item={item}
          compact={compact}
          isLast={index === items.length - 1}
        />
      ))}
    </div>
  );
}
