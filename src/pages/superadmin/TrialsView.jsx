import { useState } from "react";
import T from "../../config/theme";
import { Zap, CheckCircle, AlertCircle, Clock, Search, Phone, Mail } from "lucide-react";

const fDate = (str) => {
  if (!str) return "—";
  return new Date(str).toLocaleDateString("pt-BR");
};

const SOURCE_LABELS = {
  "Instagram / TikTok": "📱 Instagram / TikTok",
  "Indicação de amigo": "👥 Indicação de amigo",
  "Google / Pesquisa":  "🔍 Google / Pesquisa",
  "YouTube":            "▶️ YouTube",
  "Outro":              "✦ Outro",
};

function KpiCard({ label, value, color, icon }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: 16, padding: "1.25rem 1.5rem",
      display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}18`, display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 28, fontFamily: "'Bebas Neue', sans-serif",
          letterSpacing: 1, color: T.text, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ row }) {
  if (row.status === "trial" && row.days_remaining > 0) {
    const urgent = row.days_remaining <= 2;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          background: urgent ? "#f0701018" : "#43d18a18",
          color: urgent ? "#f07010" : "#43d18a",
          border: `1px solid ${urgent ? "#f0701044" : "#43d18a44"}`,
          borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
        }}>
          <Clock size={10} />
          {urgent ? "Encerrando" : "Ativo"}
        </span>
        <span style={{ fontSize: 11, color: T.muted }}>
          {row.days_remaining} dia{row.days_remaining !== 1 ? "s" : ""} restante{row.days_remaining !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }
  if (row.status === "expired" || row.days_remaining === 0) {
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: "#f0707018", color: "#f07070",
        border: "1px solid #f0707044",
        borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700,
      }}>
        <AlertCircle size={10} />
        Expirado
      </span>
    );
  }
  return <span style={{ color: T.muted, fontSize: 12 }}>{row.status}</span>;
}

export default function TrialsView({ trials = [], loading = false }) {
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const total   = trials.length;
  const active  = trials.filter(t => t.status === "trial" && Number(t.days_remaining) > 0).length;
  const expired = trials.filter(t => t.status === "expired" || Number(t.days_remaining) === 0).length;

  const filtered = trials.filter(t => {
    const term = search.toLowerCase();
    const matchSearch = !term ||
      t.barbershop_name?.toLowerCase().includes(term) ||
      t.admin_email?.toLowerCase().includes(term) ||
      t.admin_name?.toLowerCase().includes(term) ||
      (t.phone || "").includes(term) ||
      (t.source || "").toLowerCase().includes(term);

    const isActive  = t.status === "trial" && Number(t.days_remaining) > 0;
    const isExpired = t.status === "expired" || Number(t.days_remaining) === 0;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active"  && isActive) ||
      (statusFilter === "expired" && isExpired);

    return matchSearch && matchStatus;
  });

  const filterBtnSt = (active) => ({
    padding: "0.45rem 1rem", borderRadius: 8, fontSize: 13, fontWeight: 700,
    border: `1px solid ${active ? T.accent : T.border}`,
    background: active ? `${T.accent}18` : "transparent",
    color: active ? T.accent : T.muted,
    cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  });

  const thSt = { padding: "0.65rem 1rem", fontSize: 11, fontWeight: 700,
    color: T.muted, textTransform: "uppercase", letterSpacing: 0.7,
    borderBottom: `1px solid ${T.border}`, textAlign: "left", whiteSpace: "nowrap" };

  const tdSt = { padding: "0.9rem 1rem", fontSize: 13, color: T.text,
    borderBottom: `1px solid ${T.border}22`, verticalAlign: "middle" };

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total de trials"  value={total}   color={T.accent}   icon={<Zap size={20} />} />
        <KpiCard label="Ativos"           value={active}  color="#43d18a"    icon={<CheckCircle size={20} />} />
        <KpiCard label="Expirados"        value={expired} color="#f07070"    icon={<AlertCircle size={20} />} />
      </div>

      {/* Busca + filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 240px" }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.muted }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por barbearia, e-mail, WhatsApp…"
            style={{
              width: "100%", height: 38, paddingLeft: 36, paddingRight: 12,
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 8, color: T.text, fontSize: 13, outline: "none",
              fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box",
            }}
          />
        </div>
        {[
          { key: "all",     label: `Todos (${total})` },
          { key: "active",  label: `Ativos (${active})` },
          { key: "expired", label: `Expirados (${expired})` },
        ].map(f => (
          <button key={f.key} onClick={() => setStatusFilter(f.key)} style={filterBtnSt(statusFilter === f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: T.muted, fontSize: 14 }}>
            Carregando trials…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: T.muted, fontSize: 14 }}>
            {search || statusFilter !== "all" ? "Nenhum resultado para esta busca." : "Nenhuma conta trial cadastrada ainda."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Barbearia", "Responsável", "E-mail", "WhatsApp", "Como chegou", "Início", "Expira em", "Status"].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.barbershop_id} style={{ transition: "background .12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = `${T.accent}08`}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ ...tdSt, fontWeight: 600 }}>{t.barbershop_name || "—"}</td>

                    <td style={tdSt}>
                      <div style={{ fontWeight: 600 }}>{t.admin_name || "—"}</div>
                    </td>

                    <td style={tdSt}>
                      {t.admin_email ? (
                        <a href={`mailto:${t.admin_email}`}
                          style={{ color: T.accent, textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                          <Mail size={12} />{t.admin_email}
                        </a>
                      ) : "—"}
                    </td>

                    <td style={tdSt}>
                      {t.phone ? (
                        <a href={`https://wa.me/55${t.phone.replace(/\D/g, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ color: "#43d18a", textDecoration: "none", display: "flex", alignItems: "center", gap: 5 }}>
                          <Phone size={12} />{t.phone}
                        </a>
                      ) : <span style={{ color: T.muted }}>—</span>}
                    </td>

                    <td style={tdSt}>
                      <span style={{ color: t.source ? T.text : T.muted, fontSize: 13 }}>
                        {t.source ? (SOURCE_LABELS[t.source] || t.source) : "—"}
                      </span>
                    </td>

                    <td style={{ ...tdSt, color: T.muted }}>{fDate(t.trial_started_at)}</td>

                    <td style={{ ...tdSt, color: T.muted }}>{fDate(t.trial_ends_at)}</td>

                    <td style={tdSt}><StatusBadge row={t} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
