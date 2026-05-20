import { ArrowRight } from "lucide-react";

import T from "../../config/theme";

export default function EmptyState({
  icon: Icon,
  title = "Nenhum dado encontrado",
  subtitle = "Os dados aparecerão automaticamente aqui.",
  actionLabel,
  onAction,
  compact = false,
}) {
  return (
    <div
      style={{
        width: "100%",
        minHeight: compact ? 220 : 320,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: compact ? "2rem" : "3rem",
      }}
    >
      <div
        style={{
          width: compact ? 68 : 82,
          height: compact ? 68 : 82,
          borderRadius: 24,
          background:
            "linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02))",
          border: `1px solid ${T.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 22,
          boxShadow: "0 12px 40px rgba(0,0,0,.18)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top, rgba(255,255,255,.08), transparent 70%)",
          }}
        />

        {Icon && (
          <Icon
            size={compact ? 28 : 34}
            color={T.mutedLight}
            style={{
              position: "relative",
              zIndex: 1,
            }}
          />
        )}
      </div>

      <div
        style={{
          color: T.text,
          fontWeight: 900,
          fontSize: compact ? 18 : 22,
          marginBottom: 10,
          letterSpacing: 0.2,
        }}
      >
        {title}
      </div>

      <div
        style={{
          color: T.muted,
          fontSize: compact ? 13 : 14,
          lineHeight: 1.6,
          maxWidth: 460,
          marginBottom: actionLabel ? 24 : 0,
        }}
      >
        {subtitle}
      </div>

      {actionLabel && (
        <button
          onClick={onAction}
          style={{
            background: T.accent,
            border: "none",
            color: "#0a0808",
            borderRadius: 14,
            height: 44,
            padding: "0 18px",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 10px 30px rgba(0,0,0,.18)",
            transition: "all .18s ease",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform =
              "translateY(-2px) scale(1.01)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform =
              "translateY(0px) scale(1)";
          }}
        >
          {actionLabel}
          <ArrowRight size={15} />
        </button>
      )}
    </div>
  );
}
