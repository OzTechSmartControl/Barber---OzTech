import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  Check,
  Clock,
  Edit2,
  Gift,
  Infinity,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";

import { supabase } from "../../supabase";
import T from "../../config/theme";
import { fDate, fDatetime } from "../../utils/formatters";
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

function normalizeCourtesy(item) {
  const isExpired =
    item.status !== "revoked" &&
    item.expires_at &&
    new Date(item.expires_at).getTime() < Date.now();

  return {
    ...item,
    status: isExpired ? "expired" : item.status || "active",
    display_email: item.email || item.display_email || "—",
    display_plan: item.type === "unlimited" ? "Indeterminado" : "Prazo determinado",
    display_shop: item.barbershop_name || item.barbershops?.name || "—",
    display_used_by: item.used_by_email || item.used_by_user_email || item.used_by_user_id || "",
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
  const attempts = [];

  const addAttempt = (name, result) => {
    attempts.push({
      name,
      error: result?.error?.message || "",
      count: Array.isArray(result?.data) ? result.data.length : 0,
    });
  };

  const forced = await supabase.rpc("oz_force_list_courtesy_access_admin");
  addAttempt("RPC oz_force_list_courtesy_access_admin", forced);
  if (!forced.error && Array.isArray(forced.data)) {
    return {
      rows: forced.data,
      debug: attempts,
      error: forced.data.length ? "" : "RPC principal retornou 0 registros.",
    };
  }

  const rpc1 = await supabase.rpc("list_courtesy_access_for_superadmin");
  addAttempt("RPC list_courtesy_access_for_superadmin", rpc1);
  if (!rpc1.error && Array.isArray(rpc1.data)) {
    return {
      rows: rpc1.data,
      debug: attempts,
      error: rpc1.data.length ? "" : "RPC alternativa retornou 0 registros.",
    };
  }

  const rpc2 = await supabase.rpc("oz_list_courtesy_access_admin");
  addAttempt("RPC oz_list_courtesy_access_admin", rpc2);
  if (!rpc2.error && Array.isArray(rpc2.data)) {
    return {
      rows: rpc2.data,
      debug: attempts,
      error: rpc2.data.length ? "" : "RPC compatível retornou 0 registros.",
    };
  }

  const details = attempts
    .map((a) => `${a.name}: ${a.error ? `ERRO: ${a.error}` : `${a.count} registro(s)`}`)
    .join(" | ");

  return { rows: [], debug: attempts, error: details || "Nenhuma tentativa executada." };
}

export default function CourtesyView({
  metrics = {},
  courtesyList = [],
  search = "",
  setSearch = () => {},
  filter = "all",
  setFilter = () => {},
  onNewCourtesy,
  onSendInvite,
  sendingInvite,
}) {
  const [localRows, setLocalRows] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState("");
  const [debug, setDebug] = useState([]);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [selectedRevokeId, setSelectedRevokeId] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [editRow, setEditRow] = useState(null);
  const [editType, setEditType] = useState("unlimited");
  const [editExpires, setEditExpires] = useState("");

  const reloadLocalRows = async () => {
    setLocalLoading(true);
    setLocalError("");
    try {
      const result = await fetchCourtesyRows();
      const normalized = (result.rows || []).map(normalizeCourtesy);
      setLocalRows(normalized);
      setDebug(result.debug || []);
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
    const q = (search || "").toLowerCase().trim();
    const matchSearch =
      !q ||
      (item.display_email || item.email || "").toLowerCase().includes(q) ||
      (item.notes || "").toLowerCase().includes(q) ||
      (item.display_plan || "").toLowerCase().includes(q) ||
      (item.display_shop || "").toLowerCase().includes(q);

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

  const handleRevoke = async (id) => {
    if (!id) return;
    if (!window.confirm("Revogar este acesso? O usuário perderá o acesso imediatamente.")) return;

    setActionLoading(id);
    try {
      const { error } = await supabase.rpc("oz_revoke_courtesy_access_admin", { p_id: id });
      if (error) throw error;
      await reloadLocalRows();
    } catch (e) {
      alert(e.message || "Erro ao revogar acesso.");
    } finally {
      setActionLoading("");
    }
  };

  const handleUnrevoke = async (id) => {
    if (!id) return;
    if (!window.confirm("Reverter esta revogação? O acesso será restaurado como ativo.")) return;

    setActionLoading(id);
    try {
      const { error } = await supabase
        .from("courtesy_access")
        .update({ status: "active", revoked_at: null, revoked_by: null })
        .eq("id", id);
      if (error) throw error;
      await reloadLocalRows();
    } catch (e) {
      alert(e.message || "Erro ao reverter revogação.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDelete = async (row) => {
    if (!row?.id) return;
    if (row.status !== "revoked") {
      alert("Somente acessos revogados podem ser excluídos.");
      return;
    }
    if (!window.confirm("Excluir definitivamente este acesso revogado? Esta ação não pode ser desfeita.")) return;

    setActionLoading(row.id);
    try {
      const { error } = await supabase.rpc("oz_delete_revoked_courtesy_admin", { p_id: row.id });
      if (error) throw error;
      await reloadLocalRows();
    } catch (e) {
      alert(e.message || "Erro ao excluir acesso revogado.");
    } finally {
      setActionLoading("");
    }
  };

  const openEditModal = (row) => {
    setEditRow(row);
    setEditType(row.type === "unlimited" ? "unlimited" : "limited");
    setEditExpires(row.expires_at ? row.expires_at.slice(0, 10) : "");
  };

  const handleSaveEditDuration = async () => {
    if (!editRow) return;
    if (editType === "limited" && !editExpires) {
      alert("Informe a data de expiração.");
      return;
    }
    setActionLoading(editRow.id);
    try {
      const payload = {
        type: editType,
        expires_at: editType === "unlimited" ? null : new Date(editExpires + "T23:59:59").toISOString(),
      };
      const { error } = await supabase.from("courtesy_access").update(payload).eq("id", editRow.id);
      if (error) throw error;
      await reloadLocalRows();
      setEditRow(null);
    } catch (e) {
      alert(e.message || "Erro ao alterar duração.");
    } finally {
      setActionLoading("");
    }
  };

  const handleConfirmModalRevoke = async () => {
    if (!selectedRevokeId) {
      alert("Selecione um acesso ativo.");
      return;
    }
    await handleRevoke(selectedRevokeId);
    setShowRevokeModal(false);
    setSelectedRevokeId("");
  };

  const cellStyle = {
    padding: "0.9rem 1rem",
    borderBottom: `1px solid ${T.border}`,
    fontSize: 13,
    color: T.text,
    verticalAlign: "top",
  };

  const thStyle = {
    padding: "0.85rem 1rem",
    borderBottom: `1px solid ${T.border}`,
    fontSize: 10,
    fontWeight: 800,
    color: T.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    textAlign: "left",
    whiteSpace: "nowrap",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: "1rem" }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: "1.25rem" }}>
        <KpiCard label="Total concedidas" value={displayMetrics.total_courtesies} icon={Gift} tone="accent" />
        <KpiCard label="Ativas" value={displayMetrics.active_courtesies} icon={Check} tone="success" />
        <KpiCard label="Expiradas" value={expiredRows.length} icon={Clock} tone="warning" />
        <KpiCard label="Revogadas" value={displayMetrics.revoked_courtesies} icon={Ban} tone="danger" />
        <KpiCard label="Convertidas" value="0" subtitle="Fase 2" icon={TrendingUp} tone="info" />
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240, position: "relative" }}>
          <Search size={14} color={T.muted} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input
            style={{ ...inputSt, paddingLeft: 34 }}
            placeholder="Buscar por e-mail, motivo ou observação…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          {localLoading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
          Atualizar lista
        </button>
      </div>

      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Duração</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Criado em</th>
                <th style={thStyle}>Expiração</th>
                <th style={thStyle}>Usado por</th>
                <th style={thStyle}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {!filtered.length ? (
                <tr>
                  <td colSpan={7} style={{ ...cellStyle, textAlign: "center", color: T.muted, padding: "2.5rem 1rem" }}>
                    Nenhuma cortesia encontrada.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id}>
                    <td style={cellStyle}>
                      <div style={{ fontWeight: 800 }}>{row.display_email || row.email || "—"}</div>
                      {row.notes && <div style={{ color: T.muted, fontSize: 11, marginTop: 3 }}>{row.notes}</div>}
                    </td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap", color: T.mutedLight }}>
                      {row.type === "unlimited" ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Infinity size={12} /> Indeterminado
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <Clock size={12} /> Prazo
                        </span>
                      )}
                    </td>
                    <td style={cellStyle}><StatusBadge status={row.status} /></td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap", color: T.mutedLight }}>{fDate(row.created_at)}</td>
                    <td style={{ ...cellStyle, whiteSpace: "nowrap", color: T.mutedLight }}>
                      {row.type === "unlimited" ? <span style={{ color: T.success }}>Sem expiração</span> : fDate(row.expires_at)}
                    </td>
                    <td style={cellStyle}>
                      {row.used_at ? (
                        <div>
                          <div style={{ fontWeight: 700 }}>{row.display_shop || "—"}</div>
                          {row.display_used_by && <div style={{ color: T.muted, fontSize: 11 }}>{row.display_used_by}</div>}
                          <div style={{ color: T.muted, fontSize: 11 }}>{fDatetime(row.used_at)}</div>
                        </div>
                      ) : (
                        <span style={{ color: T.muted }}>Não utilizado</span>
                      )}
                    </td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {row.status === "active" && (
                          <>
                            <button
                              onClick={() => openEditModal(row)}
                              disabled={actionLoading === row.id}
                              style={{
                                background: `${T.accent}18`,
                                border: `1px solid ${T.accent}44`,
                                borderRadius: 8,
                                padding: "5px 10px",
                                color: T.accent,
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: actionLoading === row.id ? "wait" : "pointer",
                                display: "inline-flex",
                                gap: 5,
                                alignItems: "center",
                              }}
                            >
                              <Edit2 size={12} /> Duração
                            </button>

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
                              }}
                            >
                              <Mail size={12} /> {sendingInvite === row.id ? "Enviando" : "Enviar e-mail"}
                            </button>

                            <button
                              onClick={() => handleRevoke(row.id)}
                              disabled={actionLoading === row.id}
                              style={{
                                background: T.dangerBg,
                                border: `1px solid ${T.danger}44`,
                                borderRadius: 8,
                                padding: "5px 10px",
                                color: T.danger,
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: actionLoading === row.id ? "wait" : "pointer",
                                display: "inline-flex",
                                gap: 5,
                                alignItems: "center",
                              }}
                            >
                              <Ban size={12} /> Revogar
                            </button>
                          </>
                        )}

                        {row.status === "revoked" && (
                          <>
                            <button
                              onClick={() => handleUnrevoke(row.id)}
                              disabled={actionLoading === row.id}
                              style={{
                                background: `${T.success}18`,
                                border: `1px solid ${T.success}55`,
                                borderRadius: 8,
                                padding: "5px 10px",
                                color: T.success,
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: actionLoading === row.id ? "wait" : "pointer",
                                display: "inline-flex",
                                gap: 5,
                                alignItems: "center",
                              }}
                            >
                              <RotateCcw size={12} /> Reverter
                            </button>

                            <button
                              onClick={() => handleDelete(row)}
                              disabled={actionLoading === row.id}
                              style={{
                                background: "#2a1111",
                                border: `1px solid ${T.danger}55`,
                                borderRadius: 8,
                                padding: "5px 10px",
                                color: T.danger,
                                fontSize: 12,
                                fontWeight: 800,
                                cursor: actionLoading === row.id ? "wait" : "pointer",
                                display: "inline-flex",
                                gap: 5,
                                alignItems: "center",
                              }}
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editRow && (
        <LocalModal title="ALTERAR DURAÇÃO" onClose={() => setEditRow(null)}>
          <div style={{ color: T.mutedLight, fontSize: 13, marginBottom: "1rem" }}>
            <strong style={{ color: T.text }}>{editRow.display_email || editRow.email}</strong>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: .6, marginBottom: 8 }}>TIPO DE DURAÇÃO</div>
            <div style={{ display: "flex", gap: 10 }}>
              {[["unlimited", "Indeterminado"], ["limited", "Prazo determinado"]].map(([val, label]) => (
                <button key={val} onClick={() => setEditType(val)}
                  style={{
                    flex: 1, padding: "0.65rem", borderRadius: 10, cursor: "pointer",
                    border: `1px solid ${editType === val ? T.accent : T.border}`,
                    background: editType === val ? `${T.accent}18` : T.surface,
                    color: editType === val ? T.accent : T.mutedLight,
                    fontWeight: 700, fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}>
                  {val === "unlimited" ? <Infinity size={14}/> : <Clock size={14}/>}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {editType === "limited" && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, letterSpacing: .6, marginBottom: 6 }}>DATA DE EXPIRAÇÃO</div>
              <input
                type="date"
                value={editExpires}
                onChange={e => setEditExpires(e.target.value)}
                min={new Date().toISOString().slice(0,10)}
                style={{ ...inputSt, colorScheme: "dark" }}
              />
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: "1.25rem" }}>
            <button onClick={() => setEditRow(null)}
              style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, color: T.mutedLight, borderRadius: 10, padding: "0.75rem", fontWeight: 700, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Cancelar
            </button>
            <button onClick={handleSaveEditDuration} disabled={!!actionLoading}
              style={{ flex: 1, background: `${T.accent}22`, border: `1px solid ${T.accent}66`, color: T.accent, borderRadius: 10, padding: "0.75rem", fontWeight: 900, cursor: actionLoading ? "wait" : "pointer", fontFamily: "'DM Sans', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {actionLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }}/> : <Check size={14}/>}
              Salvar
            </button>
          </div>
        </LocalModal>
      )}

      {showRevokeModal && (
        <LocalModal
          title="REVOGAR ACESSO"
          onClose={() => {
            setShowRevokeModal(false);
            setSelectedRevokeId("");
          }}
        >
          <div style={{ color: T.mutedLight, fontSize: 13, marginBottom: "1rem", lineHeight: 1.5 }}>
            Selecione uma cortesia ativa. Após confirmar, o status será alterado para revogada e o acesso será bloqueado.
          </div>

          <select style={inputSt} value={selectedRevokeId} onChange={(e) => setSelectedRevokeId(e.target.value)}>
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
              onClick={handleConfirmModalRevoke}
              disabled={!selectedRevokeId || actionLoading}
              style={{
                flex: 1,
                background: T.dangerBg,
                border: `1px solid ${T.danger}66`,
                color: T.danger,
                borderRadius: 10,
                padding: "0.75rem",
                fontWeight: 900,
                cursor: !selectedRevokeId || actionLoading ? "not-allowed" : "pointer",
                opacity: !selectedRevokeId || actionLoading ? 0.7 : 1,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Confirmar revogação
            </button>
          </div>
        </LocalModal>
      )}
    </div>
  );
}
