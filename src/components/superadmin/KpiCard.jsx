import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";

import { useEffect, useState } from "react";
import T from "../../config/theme";

function useIsMobile(bp = 768) {
  const [m, setM] = useState(() => window.innerWidth < bp);
  useEffect(() => {
    const h = () => setM(window.innerWidth < bp);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, [bp]);
  return m;
}

function TrendIcon({ trend }) {
  if (trend === "up") {
    return <ArrowUpRight size={13} />;
  }

  if (trend === "down") {
    return <ArrowDownRight size={13} />;
  }

  return <Minus size={13} />;
}

export default function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone = "accent",
  trend = "neutral",
  trendValue,
  sparkline = [],
}) {
  const isMobile = useIsMobile();
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

  const trendColor =
    trend === "up"
      ? T.success
      : trend === "down"
      ? T.danger
      : T.muted;

  const maxSpark = Math.max(1, ...sparkline);

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: isMobile ? 14 : 20,
        padding: isMobile ? "0.7rem 0.85rem" : "1.15rem 1.2rem",
        minHeight: isMobile ? 82 : 148,
        boxShadow: "0 4px 24px rgba(0,0,0,.10)",
        transition: "transform .18s ease, border-color .18s ease, box-shadow .18s ease",
        animation: "kpiFadeIn .28s ease both",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px) scale(1.01)";
        e.currentTarget.style.borderColor = `${color}55`;
        e.currentTarget.style.boxShadow = `0 18px 55px rgba(0,0,0,.28), 0 0 35px ${color}10`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0px) scale(1)";
        e.currentTarget.style.borderColor = T.border;
        e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,0,0,.20)";
      }}
    >
      <style>
        {`
          @keyframes kpiFadeIn {
            from {
              opacity: 0;
              transform: translateY(12px) scale(.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes kpiIconPop {
            from {
              opacity: 0;
              transform: scale(.9) rotate(-8deg);
            }
            to {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }

          @keyframes kpiBarGrow {
            from {
              transform: scaleY(.15);
              opacity: 0;
            }
            to {
              transform: scaleY(1);
              opacity: 1;
            }
          }
        `}
      </style>

      <div
        style={{
          position: "absolute",
          top: -40,
          right: -30,
          width: 120,
          height: 120,
          borderRadius: 999,
          background: `${color}10`,
          filter: "blur(10px)",
        }}
      />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 14,
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              color: T.muted,
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: isMobile ? 5 : 10,
              fontWeight: 800,
            }}
          >
            {label}
          </div>

          <div
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: isMobile ? 26 : 38,
              letterSpacing: 1.2,
              lineHeight: 1,
              color,
              marginBottom: isMobile ? 6 : 10,
            }}
          >
            {value}
          </div>

          {(trendValue || subtitle) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {trendValue && (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 8px",
                    borderRadius: 999,
                    background: `${trendColor}16`,
                    border: `1px solid ${trendColor}22`,
                    color: trendColor,
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  <TrendIcon trend={trend} />
                  {trendValue}
                </div>
              )}

              {subtitle && (
                <div
                  style={{
                    color: T.muted,
                    fontSize: 11,
                    lineHeight: 1.35,
                  }}
                >
                  {subtitle}
                </div>
              )}
            </div>
          )}
        </div>

        {Icon && (
          <div
            style={{
              background: `${color}16`,
              border: `1px solid ${color}22`,
              borderRadius: isMobile ? 12 : 16,
              width: isMobile ? 36 : 48,
              height: isMobile ? 36 : 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 0 30px ${color}10`,
              animation: "kpiIconPop .28s ease both",
            }}
          >
            <Icon size={isMobile ? 16 : 20} color={color} />
          </div>
        )}
      </div>

      {sparkline.length > 0 && (
        <div
          style={{
            marginTop: 18,
            display: "flex",
            alignItems: "flex-end",
            gap: 4,
            height: 34,
          }}
        >
          {sparkline.map((v, i) => {
            const h = Math.max(5, (v / maxSpark) * 30);

            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: h,
                  borderRadius: 999,
                  background:
                    i === sparkline.length - 1
                      ? color
                      : `${color}55`,
                  transformOrigin: "bottom",
                  animation: `kpiBarGrow .32s ease both`,
                  animationDelay: `${i * 0.03}s`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
