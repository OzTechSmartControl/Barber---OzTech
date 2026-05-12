import {
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import { useMemo, useState } from "react";

import T from "../../config/theme";

function StatusBadge({ value }) {
  const text = String(value || "").toLowerCase();

  const variants = {
    active: {
      bg: `${T.success}16`,
      border: `${T.success}22`,
      color: T.success,
      label: "Ativo",
    },

    inactive: {
      bg: `${T.muted}16`,
      border: `${T.muted}22`,
      color: T.mutedLight,
      label: "Inativo",
    },

    overdue: {
      bg: `${T.warning}16`,
      border: `${T.warning}22`,
      color: T.warning,
      label: "Inadimplente",
    },

    cancelled: {
      bg: `${T.danger}16`,
      border: `${T.danger}22`,
      color: T.danger,
      label: "Cancelado",
    },

    trial: {
      bg: `${T.accent}16`,
      border: `${T.accent}22`,
      color: T.accent,
      label: "Trial",
    },

    courtesy: {
      bg: "rgba(168,85,247,.16)",
      border: "rgba(168,85,247,.22)",
      color: "#c084fc",
      label: "Cortesia",
    },
  };

  const cfg = variants[text];

  if (!cfg) {
    return (
      <span
        style={{
          color: T.text,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {value || "-"}
      </span>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        borderRadius: 999,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        color: cfg.color,
        fontSize: 11,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: cfg.color,
        }}
      />

      {cfg.label}
    </div>
  );
}

export default function DataTable({
  title,
  subtitle,
  columns = [],
  data = [],
  actions,
  searchable = true,
  pageSize = 8,
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;

    return data.filter((row) =>
      JSON.stringify(row)
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const paginated = filtered.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <div
      style={{
        background:
          "linear-gradient(180deg, rgba(28,29,39,0.98), rgba(17,18,26,0.98))",
        border: `1px solid ${T.border}`,
        borderRadius: 22,
        overflow: "hidden",
        boxShadow: "0 18px 50px rgba(0,0,0,.18)",
      }}
    >
      <div
        style={{
          padding: "1.2rem 1.3rem",
          borderBottom: `1px solid ${T.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: T.text,
              fontWeight: 900,
              fontSize: 18,
              marginBottom: 4,
            }}
          >
            {title}
          </div>

          {subtitle && (
            <div
              style={{
                color: T.muted,
                fontSize: 13,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {searchable && (
          <div
            style={{
              position: "relative",
              width: 320,
              maxWidth: "100%",
            }}
          >
            <Search
              size={16}
              color={T.muted}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            />

            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar..."
              style={{
                width: "100%",
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                height: 42,
                padding: "0 14px 0 38px",
                color: T.text,
                outline: "none",
                fontSize: 13,
              }}
            />
          </div>
        )}
      </div>

      <div
        style={{
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 760,
          }}
        >
          <thead
            style={{
              position: "sticky",
              top: 0,
              zIndex: 5,
              background: "#131520",
            }}
          >
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    textAlign: "left",
                    padding: "14px 18px",
                    color: T.muted,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: 0.7,
                    fontWeight: 800,
                    borderBottom: `1px solid ${T.border}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  {column.label}
                </th>
              ))}

              {actions && (
                <th
                  style={{
                    padding: "14px 18px",
                    borderBottom: `1px solid ${T.border}`,
                  }}
                />
              )}
            </tr>
          </thead>

          <tbody>
            {paginated.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  transition: "all .14s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "rgba(255,255,255,.025)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {columns.map((column) => {
                  const value = row[column.key];

                  return (
                    <td
                      key={column.key}
                      style={{
                        padding: "16px 18px",
                        borderBottom: `1px solid rgba(255,255,255,.05)`,
                        color: T.text,
                        fontSize: 13,
                        verticalAlign: "middle",
                      }}
                    >
                      {column.type === "status" ? (
                        <StatusBadge value={value} />
                      ) : column.render ? (
                        column.render(value, row)
                      ) : (
                        value || "-"
                      )}
                    </td>
                  );
                })}

                {actions && (
                  <td
                    style={{
                      padding: "16px 18px",
                      borderBottom: `1px solid rgba(255,255,255,.05)`,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}

            {!paginated.length && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  style={{
                    padding: "3rem",
                    textAlign: "center",
                    color: T.muted,
                    fontSize: 13,
                  }}
                >
                  Nenhum resultado encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          padding: "1rem 1.3rem",
          borderTop: `1px solid ${T.border}`,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            color: T.muted,
            fontSize: 12,
          }}
        >
          {filtered.length} registro(s)
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.text,
              cursor: "pointer",
              opacity: page === 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={16} />
          </button>

          <div
            style={{
              color: T.text,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Página {page} de {totalPages}
          </div>

          <button
            onClick={() =>
              setPage((p) => Math.min(totalPages, p + 1))
            }
            disabled={page === totalPages}
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.surface,
              color: T.text,
              cursor: "pointer",
              opacity: page === totalPages ? 0.4 : 1,
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
