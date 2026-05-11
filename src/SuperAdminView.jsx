import { useState, useEffect, useCallback } from "react";
import {
  Plus, Trash2, RefreshCw, Check, X, AlertCircle,
  Gift, Clock, Infinity, Search, ShieldCheck
} from "lucide-react";

const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxanpvbnR4Zndsd212YmRkYm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTU5NjIsImV4cCI6MjA5Mzc3MTk2Mn0.SiH3q7fQRoVDern1SnroZolD0rc_wttj5G-Me4wffVw";

const T = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#4db8ff", text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", successBg: "#43d18a18", danger: "#f07070", dangerBg: "#f0707018",
  warning: "#f59e0b", warningBg: "#f59e0b18",
};

const inputSt = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "0.6rem 0.875rem", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
};

const hdr = (tok) => ({
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${tok}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
});

const fDate = (s) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const fDatetime = (s) => s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const StatusBadge = ({ status }) => {
  const map = {
    active:  { label: "Ativo",    bg: T.successBg, color: T.success },
    expired: { label: "Expirado", bg: T.warningBg, color: T.warning },
    revoked: { label: "Revogado", bg: T.dangerBg,  color: T.danger  },
    cancelled: { label: "Cancelado", bg: T.dangerBg, color: T.danger },
    pending: { label: "Pendente", bg: T.warningBg, color: T.warning },
    approved: { label: "Aprovado", bg: T.successBg, color: T.success },
  };
  const s = map[status] || map.active;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 5, padding: "2px 9px", fontSize: 11, fontWeight: 700 }}>
      {s.label}
    </span>
  );
};

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem", backdropFilter: "blur(4px)" }}>
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1.25rem 1.5rem", borderBottom: `1px solid ${T.border}` }}>
        <h3 style={{ margin: 0, fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1.5, color: T.text }}>{title}</h3>
        <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}><X size={18} /></button>
      </div>
      <div style={{ padding: "1.5rem" }}>{children}</div>
    </div>
  </div>
);

const ErrMsg = ({ msg }) => msg ? (
  <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.6rem 1rem", color: T.danger, fontSize: 13, display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem" }}>
    <AlertCircle size={14} />{msg}
  </div>
) : null;

// ══════════════════════════════════════════════════════════════
export default function SuperAdminView({ token }) {
  const [list,     setList]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all"); // all | active | expired | revoked
  const [showModal,setShowModal]= useState(false);
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");
  const [revoking, setRevoking] = useState(null);

  // Form state
  const [form, setForm] = useState({
    email:      "",
    type:       "unlimited",  // unlimited | timed
    expires_at: "",
    notes:      "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [courtesyRes, subscriptionsRes] = await Promise.allSettled([
        fetch(
          `${SUPABASE_URL}/rest/v1/courtesy_access?select=*,barbershops(name)&order=created_at.desc`,
          { headers: hdr(token) }
        ),
        fetch(
          `${SUPABASE_URL}/rest/v1/subscriptions?select=*&order=created_at.desc`,
          { headers: hdr(token) }
        ),
      ]);

      let courtesy = [];
      if (courtesyRes.status === "fulfilled" && courtesyRes.value.ok) {
        const data = await courtesyRes.value.json();
        courtesy = Array.isArray(data)
          ? data.map(item => ({
              ...item,
              source: "courtesy",
              source_label: "Cortesia",
              display_email: item.email || "—",
              display_plan: item.type === "unlimited" ? "Indeterminado" : "Prazo determinado",
              display_shop: item.barbershops?.name || "—",
            }))
          : [];
      }

      let subscriptions = [];
      if (subscriptionsRes.status === "fulfilled" && subscriptionsRes.value.ok) {
        const data = await subscriptionsRes.value.json();
        subscriptions = Array.isArray(data)
          ? data.map(item => {
              const planLabel =
                item.plan_label ||
                item.plan_name ||
                (item.plan_id === "monthly" ? "Plano Mensal" : item.plan_id === "semestral" ? "Plano Semestral" : item.plan_id === "annual" ? "Plano Anual" : item.plan_id || "Plano");

              return {
                ...item,
                source: "subscription",
                source_label: "Assinatura",
                display_email: item.email || item.customer_email || item.payer_email || item.user_email || item.user_id || "—",
                display_plan: planLabel,
                display_shop: item.barbershop_name || item.shop_name || item.barbershop_id || "—",
                created_at: item.created_at || item.createdAt || item.started_at || item.start_date,
                expires_at: item.expires_at || item.expiresAt || item.current_period_end || item.end_date,
              };
            })
          : [];
      }

      setList([...courtesy, ...subscriptions]);
    } catch {
      setList([]);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // ── Criar acesso cortesia ─────────────────────────────────────
  const handleSave = async () => {
    setErr("");
    if (!form.email.trim()) return setErr("Informe o e-mail.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setErr("E-mail inválido.");
    if (form.type === "timed" && !form.expires_at) return setErr("Informe a data de expiração.");

    setSaving(true);
    try {
      const body = {
        email:      form.email.trim().toLowerCase(),
        type:       form.type,
        expires_at: form.type === "timed" ? new Date(form.expires_at).toISOString() : null,
        notes:      form.notes.trim() || null,
        status:     "active",
      };
      const res = await fetch(`${SUPABASE_URL}/rest/v1/courtesy_access`, {
        method: "POST",
        headers: hdr(token),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.message || "Erro ao criar acesso.");
      }
      setShowModal(false);
      setForm({ email: "", type: "unlimited", expires_at: "", notes: "" });
      await load();
    } catch (e) { setErr(e.message); }
    setSaving(false);
  };

  // ── Revogar acesso ────────────────────────────────────────────
  const handleRevoke = async (id) => {
    if (!window.confirm("Revogar este acesso? O usuário perderá o acesso imediatamente.")) return;
    setRevoking(id);
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/courtesy_access?id=eq.${id}`, {
        method: "PATCH",
        headers: hdr(token),
        body: JSON.stringify({ status: "revoked", revoked_at: new Date().toISOString() }),
      });
      await load();
    } catch { }
    setRevoking(null);
  };

  // ── Excluir acesso revogado definitivamente ───────────────────
  const handleDelete = async (item) => {
    if (item.source !== "courtesy") {
      alert("Por segurança, assinaturas pagas não são excluídas por aqui. Cancele/controle a assinatura pelo fluxo de pagamento.");
      return;
    }

    if (item.status !== "revoked") {
      alert("Somente acessos revogados podem ser excluídos.");
      return;
    }

    if (!window.confirm("Excluir definitivamente este acesso revogado? Esta ação não pode ser desfeita.")) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/courtesy_access?id=eq.${item.id}`, {
        method: "DELETE",
        headers: hdr(token),
      });

      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Erro ao excluir acesso.");
      }

      await load();
    } catch (e) {
      alert(e.message || "Erro ao excluir acesso.");
    }
  };

  // ── Filtros ───────────────────────────────────────────────────
  const filtered = list.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      (item.display_email || item.email || "").toLowerCase().includes(q) ||
      (item.notes || "").toLowerCase().includes(q) ||
      (item.display_plan || "").toLowerCase().includes(q) ||
      (item.source_label || "").toLowerCase().includes(q);
    const matchFilter = filter === "all" || item.status === filter;
    return matchSearch && matchFilter;
  });

  const stats = {
    total:   list.length,
    active:  list.filter(i => i.status === "active").length,
    expired: list.filter(i => i.status === "expired").length,
    revoked: list.filter(i => i.status === "revoked").length,
  };

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <ShieldCheck size={22} color={T.accent} />
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 2.5, margin: 0, color: T.text }}>PAINEL DO ADMINISTRADOR</h1>
          </div>
          <div style={{ color: T.muted, fontSize: 13 }}>Gerencie acessos, assinaturas e permissões do sistema</div>
        </div>
        <button onClick={() => { setShowModal(true); setErr(""); }}
          style={{ background: T.accent, color: "#0a0808", border: "none", borderRadius: 8, padding: "0.6rem 1.25rem", fontSize: 14, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
          <Plus size={15} /> Novo acesso cortesia
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginBottom: "1.75rem" }}>
        {[
          { label: "Total",    value: stats.total,   color: T.accent   },
          { label: "Ativos",   value: stats.active,  color: T.success  },
          { label: "Expirados",value: stats.expired, color: T.warning  },
          { label: "Revogados",value: stats.revoked, color: T.danger   },
        ].map(s => (
          <div key={s.label} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros e busca */}
      <div style={{ display: "flex", gap: 10, marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
          <Search size={14} color={T.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input style={{ ...inputSt, paddingLeft: 32 }} placeholder="Buscar por e-mail ou observação…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {["all", "active", "expired", "revoked"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ borderRadius: 8, padding: "0.5rem 1rem", fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${filter === f ? T.accent : T.border}`, background: filter === f ? T.accent + "18" : T.surface, color: filter === f ? T.accent : T.muted, fontFamily: "'DM Sans', sans-serif" }}>
            {{ all: "Todos", active: "Ativos", expired: "Expirados", revoked: "Revogados" }[f]}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: T.muted }}>
            <RefreshCw size={20} style={{ animation: "spin 1s linear infinite", marginBottom: 8 }} />
            <div style={{ fontSize: 13 }}>Carregando…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: T.muted }}>
            <Gift size={32} style={{ marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 14 }}>Nenhum acesso encontrado</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["E-mail / ID", "Origem", "Plano / Tipo", "Status", "Criado em", "Expira em", "Usado por", "Ações"].map(col => (
                    <th key={col} style={{ textAlign: "left", padding: "0.75rem 1rem", fontSize: 10, fontWeight: 700, color: T.muted, textTransform: "uppercase", letterSpacing: 0.8, borderBottom: `1px solid ${T.border}` }}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.border}` : "none" }}>
                    <td style={{ padding: "0.85rem 1rem", fontSize: 13, color: T.text }}>
                      <div>{item.display_email || item.email || "—"}</div>
                      {item.notes && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{item.notes}</div>}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span style={{ background: item.source === "subscription" ? T.accent + "22" : T.successBg, color: item.source === "subscription" ? T.accent : T.success, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                        {item.source_label}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: T.mutedLight }}>
                        {item.source === "courtesy"
                          ? (item.type === "unlimited" ? <><Infinity size={12} /> Indeterminado</> : <><Clock size={12} /> Prazo determinado</>)
                          : <><Clock size={12} /> {item.display_plan}</>}
                      </span>
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}><StatusBadge status={item.status} /></td>
                    <td style={{ padding: "0.85rem 1rem", fontSize: 12, color: T.muted }}>{fDate(item.created_at)}</td>
                    <td style={{ padding: "0.85rem 1rem", fontSize: 12, color: T.muted }}>
                      {item.source === "courtesy" && item.type === "unlimited" ? <span style={{ color: T.success }}>Sem expiração</span> : fDate(item.expires_at)}
                    </td>
                    <td style={{ padding: "0.85rem 1rem", fontSize: 12, color: T.muted }}>
                      {item.source === "courtesy"
                        ? (item.used_at
                          ? <div><div style={{ color: T.text, fontSize: 12 }}>{item.display_shop || item.barbershops?.name || "—"}</div><div style={{ fontSize: 11 }}>{fDatetime(item.used_at)}</div></div>
                          : <span style={{ color: T.muted }}>Não utilizado</span>)
                        : <div><div style={{ color: T.text, fontSize: 12 }}>{item.display_shop || "—"}</div><div style={{ fontSize: 11 }}>{item.preference_id || item.payment_id || item.id}</div></div>}
                    </td>
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {item.source === "courtesy" && item.status === "active" && (
                          <button onClick={() => handleRevoke(item.id)} disabled={revoking === item.id}
                            style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: T.danger, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                            {revoking === item.id ? <RefreshCw size={11} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={11} />}
                            Revogar
                          </button>
                        )}

                        {item.source === "courtesy" && item.status === "revoked" && (
                          <button onClick={() => handleDelete(item)}
                            style={{ background: "#2a1111", border: `1px solid ${T.danger}55`, borderRadius: 6, padding: "4px 10px", fontSize: 12, color: T.danger, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                            <Trash2 size={11} />
                            Excluir
                          </button>
                        )}

                        {item.source === "subscription" && (
                          <span style={{ fontSize: 11, color: T.muted }}>Assinatura</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: novo acesso */}
      {showModal && (
        <Modal title="NOVO ACESSO CORTESIA" onClose={() => setShowModal(false)}>
          <ErrMsg msg={err} />

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>E-mail do usuário</div>
            <input style={inputSt} type="email" placeholder="usuario@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoFocus />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8 }}>Tipo de acesso</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { id: "unlimited", icon: <Infinity size={14} />, label: "Indeterminado" },
                { id: "timed",     icon: <Clock size={14} />,    label: "Prazo determinado" },
              ].map(opt => (
                <button key={opt.id} onClick={() => setForm(f => ({ ...f, type: opt.id }))}
                  style={{ flex: 1, padding: "0.6rem", borderRadius: 8, border: `1px solid ${form.type === opt.id ? T.accent : T.border}`, background: form.type === opt.id ? T.accent + "18" : T.surface, color: form.type === opt.id ? T.accent : T.muted, cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'DM Sans', sans-serif" }}>
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.type === "timed" && (
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Data de expiração</div>
              <input style={inputSt} type="date" value={form.expires_at} min={new Date().toISOString().slice(0, 10)} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
            </div>
          )}

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>Observação (opcional)</div>
            <textarea style={{ ...inputSt, resize: "vertical", minHeight: 64 }} placeholder="Ex: Cliente parceiro, período de teste…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowModal(false)}
              style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: "0.65rem", fontSize: 14, fontWeight: 600, color: T.muted, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              style={{ flex: 2, background: T.accent, border: "none", borderRadius: 8, padding: "0.65rem", fontSize: 14, fontWeight: 600, color: "#0a0808", cursor: saving ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>
              {saving ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Salvando…</> : <><Check size={14} /> Liberar acesso</>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
