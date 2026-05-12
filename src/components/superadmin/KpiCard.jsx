import {
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from "lucide-react";
import { motion } from "framer-motion";

import T from "../../config/theme";

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
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{
        y: -4,
        scale: 1.01,
        borderColor: `${color}55`,
      }}
      transition={{
        duration: 0.22,
        ease: "easeOut",
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(180deg, rgba(28,29,39,0.98), rgba(17,18,26,0.98))",
        border: `1px solid ${T.border}`,
        borderRadius: 20,
        padding: "1.15rem 1.2rem",
        minHeight: 148,
        boxShadow: "0 12px 40px rgba(0,0,0,.20)",
      }}
    >
      <motion.div
        initial={{ opacity: 0.4, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
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
              marginBottom: 10,
              fontWeight: 800,
            }}
          >
            {label}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.08 }}
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 38,
              letterSpacing: 1.2,
              lineHeight: 1,
              color,
              marginBottom: 10,
            }}
          >
            {value}
          </motion.div>

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
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: 0.14 }}
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
                </motion.div>
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
          <motion.div
            initial={{ opacity: 0, rotate: -8, scale: 0.9 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            whileHover={{ rotate: 4, scale: 1.06 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            style={{
              background: `${color}16`,
              border: `1px solid ${color}22`,
              borderRadius: 16,
              width: 48,
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: `0 0 30px ${color}10`,
            }}
          >
            <Icon size={20} color={color} />
          </motion.div>
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
              <motion.div
                key={i}
                initial={{ height: 4, opacity: 0 }}
                animate={{ height: h, opacity: 1 }}
                transition={{
                  duration: 0.32,
                  delay: 0.03 * i,
                  ease: "easeOut",
                }}
                style={{
                  flex: 1,
                  borderRadius: 999,
                  background:
                    i === sparkline.length - 1
                      ? color
                      : `${color}55`,
                }}
              />
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
