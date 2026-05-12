import T from "../../config/theme";

export default function EmptyState({
  icon: Icon,
  title = "Nenhum dado encontrado",
  subtitle,
  action,
}) {
  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "3rem 1.5rem",
        textAlign: "center",
        color: T.muted,
      }}
    >
      {Icon && (
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 14,
            background: T.surface,
            border: `1px solid ${T.border}`,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
          }}
        >
          <Icon size={22} color={T.mutedLight} />
        </div>
      )}

      <div style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>
        {title}
      </div>

      {subtitle && (
        <div
          style={{
            color: T.muted,
            fontSize: 12,
            marginTop: 6,
            maxWidth: 360,
            marginLeft: "auto",
            marginRight: "auto",
            lineHeight: 1.5,
          }}
        >
          {subtitle}
        </div>
      )}

      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
