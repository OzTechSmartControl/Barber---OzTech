import T from "../../config/theme";

export default function SectionHeader({
  title,
  subtitle,
  icon: Icon,
  right,
  compact = false,
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        gap: 16,
        marginBottom: compact ? "0.85rem" : "1rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {Icon && <Icon size={18} color={T.accent} />}

        <div>
          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              color: T.text,
              fontSize: compact ? 20 : 24,
              letterSpacing: 1.8,
              lineHeight: 1,
            }}
          >
            {title}
          </div>

          {subtitle && (
            <div
              style={{
                color: T.muted,
                fontSize: 12,
                marginTop: 6,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {right}
    </div>
  );
}
