import T from "../../config/theme";

export default function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = "accent",
}) {
  const colors = {
    accent: T.accent,
    success: T.success,
    danger: T.danger,
    warning: T.warning,
    info: T.info,
    muted: T.mutedLight,
    text: T.text,
  };

  const color = colors[tone] || T.accent;

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "1.15rem 1.25rem",
        minHeight: 118,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div
            style={{
              fontSize: 10,
              color: T.muted,
              textTransform: "uppercase",
              letterSpacing: 0.9,
              marginBottom: 10,
              fontWeight: 700,
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 34,
              letterSpacing: 1,
              lineHeight: 1,
              color,
            }}
          >
            {value}
          </div>

          {subtitle && (
            <div
              style={{
                color: T.muted,
                fontSize: 12,
                marginTop: 8,
                lineHeight: 1.35,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {Icon && (
          <div
            style={{
              background: `${color}18`,
              border: `1px solid ${color}28`,
              borderRadius: 12,
              width: 40,
              height: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={18} color={color} />
          </div>
        )}
      </div>
    </div>
  );
}
