import { Ban, Check, Clock, Gift, Infinity, Mail, Plus, Search, Trash2, TrendingUp } from "lucide-react";

import T from "../../config/theme";
import { fDate, fDatetime } from "../../utils/formatters";
import DataTable from "../../components/superadmin/DataTable";
import KpiCard from "../../components/superadmin/KpiCard";
import SectionHeader from "../../components/superadmin/SectionHeader";

const inputSt = {
  width: "100%",
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: 10,
  padding: "0.65rem 0.875rem",
  color: T.text,
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
};

function StatusBadge({ status }) {
  const map = {
    active: { label: "Ativa", color: T.success, bg: T.successBg },
    expired: { label: "Expirada", color: T.warning, bg: T.warningBg },
    revoked: { label: "Revogada", color: T.danger, bg: T.dangerBg },
  };

  const s = map[status] || { label: status || "—", color: T.mutedLight, bg: T.surface };

  return (
    <span
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 999,
        padding: "3px 9px",
        fontSize: 11,
        fontWeight: 800,
      }}
    >
      {s.label}
    </span>
  );
}

export default function CourtesyView({
  metrics,
  courtesyList = [],
  search,
  setSearch,
  filter,
  setFilter,
  onNewCourtesy,
  onOpenRevokeModal,
  onRevoke,
  onDelete,
  onSendInvite,
  revoking,
  sendingInvite,
}) {
  const filtered = courtesyList.filter((item) => {
    const q = (search || "").toLowerCase();

    const matchSearch =
      !search ||
      (item.display_email || item.email || "").toLowerCase().includes(q) ||
      (item.notes || "").toLowerCase().includes(q) ||
      (item.display_plan || "").toLowerCase().includes(q);

    const matchFilter = filter === "all" || item.status === filter;

    return matchSearch && matchFilter;
  });

  const columns = [
    {
      key: "email",
      label: "Cliente",
      render: (row) => (
        <div>
          <div style={{ color: T.text, fontWeight: 800 }}>
            {row.display_email || row.email || "—"}
          </div>
          {row.notes && (
            <div style={{ color: T.muted, fontSize: 11, marginTop: 3 }}>
              {row.notes}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: "Duração",
      nowrap: true,
      render: (row) =>
        row.type === "unlimited" ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.mutedLight }}>
            <Infinity size={12} /> Indeterminado
          </span>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.mutedLight }}>
            <Clock size={12} /> Prazo
          </span>
        ),
    },
    {
      key: "status",
      label: "Status",
      nowrap: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "created_at",
      label: "Criado em",
      nowrap: true,
      muted: true,
      render: (row) => fDate(row.created_at),
    },
    {
      key: "expires_at",
      label: "Expiração",
      nowrap: true,
      muted: true,
      render: (row) =>
        row.type === "unlimited" ? (
          <span style={{ color: T.success }}>Sem expiração</span>
        ) : (
          fDate(row.expires_at)
        ),
    },
    {
      key: "used_at",
      label: "Usado por",
      muted: true,
      render: (row) =>
        row.used_at ? (
          <div>
            <div style={{ color: T.text, fontSize: 12 }}>
              {row.display_shop || row.barbershops?.name || "—"}
            </div>
            <div style={{ color: T.muted, fontSize: 11 }}>
              {fDatetime(row.used_at)}
            </div>
          </div>
        ) : (
          "Não utilizado"
        ),
    },
    {
      key: "actions",
      label: "Ações",
      nowrap: true,
      render: (row) => (
        <div style={{ display: "flex", gap: 8 }}>
          {row.status === "active" && (
            <>
              <button
                onClick={() => onSendInvite?.(row)}
                disabled={sendingInvite === row.id}
                style={{
                  background: `${T.accent}18`,
                  border: `1px solid ${T.accent}55`,
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: T.accent,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: sendingInvite === row.id ? "wait" : "pointer",
                  display: "inline-flex",
                  gap: 5,
                  alignItems: "center",
                  opacity: sendingInvite === row.id ? 0.7 : 1,
                }}
              >
                <Mail size={12} /> {sendingInvite === row.id ? "Enviando" : "Enviar e-mail"}
              </button>

              <button
                onClick={() => onRevoke(row.id)}
                disabled={revoking === row.id}
                style={{
                  background: T.dangerBg,
                  border: `1px solid ${T.danger}44`,
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: T.danger,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: revoking === row.id ? "wait" : "pointer",
                  display: "inline-flex",
                  gap: 5,
                  alignItems: "center",
                  opacity: revoking === row.id ? 0.7 : 1,
                }}
              >
                <Trash2 size={12} /> Revogar
              </button>
            </>
          )}

          {row.status === "revoked" && (
            <button
              onClick={() => onDelete(row)}
              style={{
                background: "#2a1111",
                border: `1px solid ${T.danger}55`,
                borderRadius: 8,
                padding: "5px 10px",
                color: T.danger,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                gap: 5,
                alignItems: "center",
              }}
            >
              <Trash2 size={12} /> Excluir
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        icon={Gift}
        title="Cortesias"
        subtitle="Acessos gratuitos doados pelo admin master; não entram como receita"
        right={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={onNewCourtesy}
              style={{
                background: `linear-gradient(135deg, ${T.accent}, #7dd3fc)`,
                color: "#061018",
                border: `1px solid ${T.accent}`,
                borderRadius: 12,
                padding: "0.72rem 1.05rem",
                fontSize: 13,
                fontWeight: 900,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                boxShadow: `0 0 0 1px ${T.accentGlow}, 0 0 18px ${T.accentGlow}`,
                transition: "transform .16s ease, box-shadow .16s ease, filter .16s ease",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.filter = "brightness(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.filter = "brightness(1)";
              }}
            >
              + Novo acesso cortesia
            </button>

            <button
              onClick={onOpenRevokeModal}
              style={{
                background: "linear-gradient(135deg, rgba(240,112,112,.18), rgba(245,158,11,.12))",
                color: T.danger,
                border: `1px solid ${T.danger}66`,
                borderRadius: 12,
                padding: "0.72rem 1.05rem",
                fontSize: 13,
                fontWeight: 900,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                boxShadow: `0 0 16px ${T.dangerBg}`,
                transition: "transform .16s ease, border-color .16s ease, filter .16s ease",
                fontFamily: "'DM Sans', sans-serif",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.borderColor = `${T.danger}aa`;
                e.currentTarget.style.filter = "brightness(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = `${T.danger}66`;
                e.currentTarget.style.filter = "brightness(1)";
              }}
            >
              Revogar Acesso
            </button>
          </div>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 14,
          marginBottom: "1.25rem",
        }}
      >
        <KpiCard label="Total concedidas" value={metrics.total_courtesies} icon={Gift} tone="accent" />
        <KpiCard label="Ativas" value={metrics.active_courtesies} icon={Check} tone="success" />
        <KpiCard label="Expiradas" value={courtesyList.filter((i) => i.status === "expired").length} icon={Clock} tone="warning" />
        <KpiCard label="Revogadas" value={metrics.revoked_courtesies} icon={Ban} tone="danger" />
        <KpiCard label="Convertidas" value="0" subtitle="Fase 2" icon={TrendingUp} tone="info" />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <Search
            size={14}
            color={T.muted}
            style={{
              position: "absolute",
              left: 11,
              top: "50%",
              transform: "translateY(-50%)",
            }}
          />
          <input
            style={{ ...inputSt, paddingLeft: 34 }}
            placeholder="Buscar por e-mail, motivo ou observação…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {["all", "active", "expired", "revoked"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              borderRadius: 10,
              padding: "0.55rem 1rem",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              border: `1px solid ${filter === f ? T.accent : T.border}`,
              background: filter === f ? `${T.accent}18` : T.surface,
              color: filter === f ? T.accent : T.muted,
            }}
          >
            {{ all: "Todos", active: "Ativas", expired: "Expiradas", revoked: "Revogadas" }[f]}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        emptyTitle="Nenhuma cortesia encontrada"
        emptySubtitle="Crie uma nova cortesia ou ajuste os filtros."
      />
    </div>
  );
}
