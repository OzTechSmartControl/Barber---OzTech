import T from "../../config/theme";
import EmptyState from "./EmptyState";
import SectionHeader from "./SectionHeader";
import { BarChart3 } from "lucide-react";

export default function ChartCard({
  title,
  subtitle,
  icon,
  rows = [],
  labelKey = "label",
  valueKey = "value",
  valueFormatter = (v) => v,
  type = "bar", // "bar" | "column"
}) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey] || 0)));

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        padding: "1.25rem",
        minHeight: 260,
      }}
    >
      <SectionHeader
        title={title}
        subtitle={subtitle}
        icon={icon || BarChart3}
        compact
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Sem dados suficientes"
          subtitle="Quando houver dados, este gráfico será preenchido automaticamente."
        />
      ) : type === "column" ? (
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            height: 160,
            paddingTop: 16,
          }}
        >
          {rows.map((row, index) => {
            const value = Number(row[valueKey] || 0);
            const height = value <= 0 ? 8 : Math.max(10, (value / max) * 132);
            const label = row[labelKey]
              ? new Date(`${row[labelKey]}T12:00:00`).toLocaleDateString("pt-BR", {
                  month: "short",
                })
              : "—";

            return (
              <div
                key={`${row[labelKey]}-${index}`}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 26,
                }}
              >
                <div
                  title={String(valueFormatter(value))}
                  style={{
                    width: "100%",
                    maxWidth: 38,
                    height,
                    background: T.accent,
                    borderRadius: "10px 10px 3px 3px",
                    opacity: value <= 0 ? 0.35 : 1,
                  }}
                />
                <div
                  style={{
                    color: T.muted,
                    fontSize: 10,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                  }}
                >
                  {label}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((row, index) => {
            const value = Number(row[valueKey] || 0);
            const width = value <= 0 ? 4 : Math.max(5, (value / max) * 100);

            return (
              <div key={`${row[labelKey]}-${index}`}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 16,
                    fontSize: 12,
                    marginBottom: 7,
                  }}
                >
                  <span style={{ color: T.text }}>{row[labelKey] || "—"}</span>
                  <span style={{ color: T.mutedLight }}>
                    {valueFormatter(value)}
                  </span>
                </div>

                <div
                  style={{
                    height: 9,
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${width}%`,
                      height: "100%",
                      background: T.accent,
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
