import T from "../../config/theme";
import EmptyState from "./EmptyState";
import { Database } from "lucide-react";

export default function DataTable({
  columns = [],
  rows = [],
  emptyTitle = "Nenhum registro encontrado",
  emptySubtitle = "Ajuste os filtros ou aguarde novos dados.",
}) {
  if (!rows.length) {
    return (
      <EmptyState
        icon={Database}
        title={emptyTitle}
        subtitle={emptySubtitle}
      />
    );
  }

  return (
    <div
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 18,
        overflow: "hidden",
      }}
    >
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    textAlign: column.align || "left",
                    padding: "0.85rem 1rem",
                    fontSize: 10,
                    fontWeight: 800,
                    color: T.muted,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    borderBottom: `1px solid ${T.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.id || row.barbershop_id || row.subscription_id || rowIndex}
                style={{
                  borderBottom:
                    rowIndex < rows.length - 1 ? `1px solid ${T.border}` : "none",
                }}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    style={{
                      padding: "0.9rem 1rem",
                      color: column.muted ? T.mutedLight : T.text,
                      fontSize: 13,
                      textAlign: column.align || "left",
                      whiteSpace: column.nowrap ? "nowrap" : "normal",
                    }}
                  >
                    {column.render
                      ? column.render(row)
                      : row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
