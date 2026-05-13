import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  Clock,
  Gift,
  Infinity,
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import { supabase } from "../../supabase";
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

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeCourtesy(item) {
  const isExpired =
    item.status !== "revoked" &&
    item.expires_at &&
    new Date(item.expires_at).getTime() < Date.now();

  return {
    ...item,
    status: isExpired ? "expired" : item.status || "active",
    source: "courtesy",
    source_label: "Cortesia",
    display_email: item.display_email || item.email || "—",
    display_plan:
      item.type === "unlimited" ? "Indeterminado" : "Prazo determinado",
    display_shop: item.barbershop_name || item.display_shop || item.barbershops?.name || "—",
  };
}

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

function LocalModal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.78)",
        zIndex: 1100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 18,
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflow: "auto",
        }}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 22,
              letterSpacing: 1.5,
              color: T.text,
            }}
          >
            {title}
          </h3>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: T.muted,
              cursor: "pointer",
              display: "flex",
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "1.5rem" }}>{children}</div>
      </div>
    </div>
  );
}

async function fetchCourtesyRows() {
  // Caminho 1: leitura direta da tabela com a policy original:
  // profiles.is_super_admin = true.
  const direct = await supabase
    .from("courtesy_access")
    .select("id,email,type,expires_at,notes,status,created_at,revoked_at,used_at,used_by_user_id,barbershop_id,barbershops(name)")
    .order("created_at", { ascending: false });

  if (!direct.error && Array.isArray(direct.data)) {
    return { rows: direct.data, error: "" };
  }

  // Caminho 2: fallback via RPC criada pelo SQL 11.
  const rpc = await supabase.rpc("list_courtesy_access_for_superadmin");
  const rpcRows = asArray(rpc.data);

  if (!rpc.error && rpcRows.length >= 0) {
    return { rows: rpcRows, error: "" };
  }

  return {
    rows: [],
    error:
      direct.error?.message ||
      rpc.error?.message ||
      "Não foi possível carregar a listagem de cortesias. Execute o SQL 11_fix_courtesy_access_original_rules.sql no Supabase.",
  };
}

export default function CourtesyView({
  metrics = {},
  courtesyList = [],
  search,
  setSearch,
  filter,
  setFilter,
  onNewCourtesy,
  onRevoke,
  onDelete,
  onSendInvite,
  revoking,
  sendingInvite,
}) {
  const [localRows, setLocalRows] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedRevokeId, setSelectedRevokeId] = useState("");
  const [localRevoking, setLocalRevoking] = useState(false);

  const reloadLocalRows = async () => {
    setLocalLoading(true);
    setLocalError("");
    try {
      const result = await fetchCourtesyRows();
      setLocalRows(result.rows.map(normalizeCourtesy));
      setLocalError(result.error || "");
    } catch (e) {
      console.error(e);
      setLocalError(e.message || "Erro ao carregar a listagem de cortesias.");
    } finally {
      setLocalLoading(false);
    }
  };

  useEffect(() => {
    reloadLocalRows();
  }, []);

  const rows = useMemo(() => {
    const source = localRows.length > 0 ? localRows : courtesyList;
    return (source || []).map(normalizeCourtesy);
  }, [localRows, courtesyList]);

  const filtered = rows.filter((item) => {
    const q = (search || "").toLowerCase();

    const matchSearch =
      !search ||
      (item.display_email || item.email || "").toLowerCase().includes(q) ||
      (item.notes || "").toLowerCase().includes(q) ||
      (item.display_plan || "").toLowerCase().includes(q);

    const matchFilter = filter === "all" || item.status === filter;

    return matchSearch && matchFilter;
  });

  const activeRows = rows.filter((i) => i.status === "active");
  const expiredRows = rows.filter((i) => i.status === "expired");
  const revokedRows = rows.filter((i) => i.status === "revoked");

  const displayMetrics = {
    total_courtesies: rows.length || metrics.total_courtesies || 0,
    active_courtesies: rows.length ? activeRows.length : metrics.active_courtesies || 0,
    revoked_courtesies: rows.length ? revokedRows.length : metrics.revoked_courtesies || 0,
  };

  const handleRevokeClick = async (id) => {
    if (!id || !onRevoke) return;
    await onRevoke(id);
    await reloadLocalRows();
  };

  const handleDeleteClick = async (row) => {
    if (!onDelete) return;
    await onDelete(row);
    await reloadLocalRows();
  };

  const handleConfirmLocalRevoke = async () => {
    if (!selectedRevokeId) {
      setLocalError("Selecione uma cortesia ativa para revogar.");
      return;
    }

    setLocalRevoking(true);
    try {
      await handleRevokeClick(selectedRevokeId);
      setShowRevokeModal(false);
      setSelectedRevokeId("");
    } finally {
      setLocalRevoking(false);
    }
  };

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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
                onClick={() => handleRevokeClick(row.id)}
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
              onClick={() => handleDeleteClick(row)}
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
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              <Plus size={14} /> Novo acesso cortesia
            </button>

            <button
              onClick={() => {
                setSelectedRevokeId("");
                setShowRevokeModal(true);
              }}
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
                fontFamily: "'DM Sans', sans-serif",
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
        <KpiCard label="Total concedidas" value={displayMetrics.total_courtesies} icon={Gift} tone="accent" />
        <KpiCard label="Ativas" value={displayMetrics.active_courtesies} icon={Check} tone="success" />
        <KpiCard label="Expiradas" value={expiredRows.length} icon={Clock} tone="warning" />
        <KpiCard label="Revogadas" value={displayMetrics.revoked_courtesies} icon={Ban} tone="danger" />
        <KpiCard label="Convertidas" value="0" subtitle="Fase 2" icon={TrendingUp} tone="info" />
      </div>

      {localError && displayMetrics.total_courtesies > 0 && rows.length === 0 && (
        <div
          style={{
            background: T.warningBg || "rgba(245, 158, 11, 0.12)",
            border: `1px solid ${T.warning || "#f59e0b"}55`,
            borderRadius: 12,
            padding: "0.85rem 1rem",
            color: T.warning || "#f59e0b",
            fontSize: 13,
            marginBottom: "1rem",
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={16} style={{ marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>
              Existem cortesias no banco, mas a listagem ainda retornou vazia.
            </div>
            <div>{localError}</div>
          </div>
        </div>
      )}

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

        {localLoading && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              color: T.muted,
              fontSize: 12,
              padding: "0.55rem 0.25rem",
            }}
          >
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
            Carregando lista
          </div>
        )}

        {[
          ["all", "Todos"],
          ["active", "Ativas"],
          ["expired", "Expiradas"],
          ["revoked", "Revogadas"],
        ].map(([f, label]) => (
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
            {label}
          </button>
        ))}

        <button
          onClick={reloadLocalRows}
          disabled={localLoading}
          style={{
            borderRadius: 10,
            padding: "0.55rem 1rem",
            fontSize: 12,
            fontWeight: 800,
            cursor: localLoading ? "wait" : "pointer",
            border: `1px solid ${T.border}`,
            background: T.surface,
            color: T.text,
          }}
        >
          Atualizar lista
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        emptyTitle="Nenhuma cortesia encontrada"
        emptySubtitle="Crie uma nova cortesia, execute o SQL 10 ou ajuste os filtros."
      />

      {showRevokeModal && (
        <LocalModal
          title="REVOGAR ACESSO"
          onClose={() => {
            setShowRevokeModal(false);
            setSelectedRevokeId("");
          }}
        >
          <div style={{ color: T.mutedLight, fontSize: 13, marginBottom: "1rem", lineHeight: 1.5 }}>
            Selecione uma cortesia ativa. Após confirmar, o status será alterado para revogada e o acesso será removido imediatamente.
          </div>

          <select
            style={inputSt}
            value={selectedRevokeId}
            onChange={(e) => setSelectedRevokeId(e.target.value)}
          >
            <option value="">Selecione um acesso ativo...</option>
            {activeRows.map((item) => (
              <option key={item.id} value={item.id}>
                {item.display_email || item.email} — {item.type === "unlimited" ? "Indeterminado" : "Prazo determinado"}
              </option>
            ))}
          </select>

          {!activeRows.length && (
            <div style={{ color: T.muted, fontSize: 12, marginTop: 10 }}>
              Nenhum acesso ativo disponível para revogação.
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: "1.25rem" }}>
            <button
              onClick={() => setShowRevokeModal(false)}
              style={{
                flex: 1,
                background: T.surface,
                border: `1px solid ${T.border}`,
                color: T.mutedLight,
                borderRadius: 10,
                padding: "0.75rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cancelar
            </button>

            <button
              onClick={handleConfirmLocalRevoke}
              disabled={localRevoking || !selectedRevokeId}
              style={{
                flex: 1,
                background: T.dangerBg,
                border: `1px solid ${T.danger}66`,
                color: T.danger,
                borderRadius: 10,
                padding: "0.75rem",
                fontWeight: 900,
                cursor: localRevoking || !selectedRevokeId ? "not-allowed" : "pointer",
                opacity: localRevoking || !selectedRevokeId ? 0.7 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {localRevoking ? "Revogando..." : "Confirmar revogação"}
            </button>
          </div>
        </LocalModal>
      )}
    </div>
  );
}
