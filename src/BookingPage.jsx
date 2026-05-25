import { useState, useEffect } from "react";

const BOOKING_API = "https://kqjzontxfwlwmvbddbnv.supabase.co/functions/v1/booking-api";

const BT = {
  bg:      "#111318",
  card:    "#1a1b24",
  surface: "#14151e",
  border:  "#2a2b38",
  text:    "#f0f1f5",
  muted:   "#8b8ea8",
  accent:  "#4db8ff",
  success: "#22c55e",
  danger:  "#ef4444",
};

const inputSt = {
  width: "100%",
  background: BT.card,
  border: `1px solid ${BT.border}`,
  borderRadius: 10,
  padding: "0.7rem 1rem",
  color: BT.text,
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const fDate = (str) => {
  if (!str) return "";
  const [y, m, d] = str.split("-");
  return `${d}/${m}/${y}`;
};

const fTime = (t) => (t || "").slice(0, 5);

const fMoney = (v) =>
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function BookingPage({ slug }) {
  const [shop,     setShop]     = useState(null);
  const [barbers,  setBarbers]  = useState([]);
  const [services, setServices] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const [step,             setStep]             = useState(1);
  const [selectedBarber,   setSelectedBarber]   = useState(null);
  const [selectedServices, setSelectedServices] = useState([]); // array — multi-select
  const [selectedDate,     setSelectedDate]     = useState("");
  const [selectedSlot,     setSelectedSlot]     = useState("");
  const [slots,            setSlots]            = useState([]);
  const [slotsLoading,     setSlotsLoading]     = useState(false);
  const [form,             setForm]             = useState({ name: "", phone: "", email: "", notes: "" });
  const [clientFound,      setClientFound]      = useState(false); // cliente já cadastrado
  const [booking,          setBooking]          = useState(false);

  // Totais computados a partir dos serviços selecionados
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
  const totalPrice    = selectedServices.reduce((sum, s) => sum + (Number(s.price) || 0), 0);

  // Toggle: adiciona ou remove um serviço da seleção
  const toggleService = (svc) => {
    setSelectedServices(prev => {
      const idx = prev.findIndex(s => s.id === svc.id);
      return idx >= 0 ? prev.filter(s => s.id !== svc.id) : [...prev, svc];
    });
  };

  // Reset body defaults + inject fonts
  useEffect(() => {
    // Remove margin/padding padrão do browser e força background escuro em toda a tela
    document.documentElement.style.margin     = "0";
    document.documentElement.style.padding    = "0";
    document.documentElement.style.background = BT.bg;
    document.body.style.margin                = "0";
    document.body.style.padding               = "0";
    document.body.style.background            = BT.bg;

    const l = document.createElement("link");
    l.rel  = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap";
    document.head.appendChild(l);
  }, []);

  // Load shop data
  useEffect(() => {
    if (!slug) { setError("Link de agendamento inválido."); setLoading(false); return; }
    fetch(`${BOOKING_API}?action=get_shop&slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return; }
        setShop(d.shop);
        setBarbers(d.barbers  || []);
        setServices(d.services || []);
      })
      .catch(() => setError("Erro ao carregar dados da barbearia. Tente novamente."))
      .finally(() => setLoading(false));
  }, [slug]);

  // Recarrega slots quando barbeiro / serviços / data mudam
  useEffect(() => {
    if (!selectedBarber || selectedServices.length === 0 || !selectedDate || !shop) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    const serviceIds = selectedServices.map(s => s.id).join(",");
    fetch(
      `${BOOKING_API}?action=get_slots` +
      `&barber_id=${selectedBarber.id}` +
      `&service_ids=${serviceIds}` +
      `&date=${selectedDate}` +
      `&barbershop_id=${shop.id}`
    )
      .then(r => r.json())
      .then(d => {
        let available = d.slots || [];
        // Para hoje: remove horários que já passaram ou estão a menos de 30 min
        if (selectedDate === todayISO()) {
          const now    = new Date();
          const nowMin = now.getHours() * 60 + now.getMinutes() + 30; // +30 min de antecedência mínima
          available = available.filter(slot => {
            const [h, m] = slot.split(":").map(Number);
            return h * 60 + m >= nowMin;
          });
        }
        setSlots(available);
      })
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, selectedBarber, selectedServices, shop]);

  // Lookup de cliente pelo WhatsApp ao sair do campo
  const lookupClient = async (phone) => {
    const p = phone.trim().replace(/\D/g, "");
    if (p.length < 10 || !shop) return;
    try {
      const res = await fetch(
        `${BOOKING_API}?action=get_client&phone=${encodeURIComponent(form.phone.trim())}&barbershop_id=${shop.id}`
      );
      const d = await res.json();
      if (d.client) {
        setForm(f => ({
          ...f,
          name:  f.name  || d.client.name  || "",
          email: f.email || d.client.email || "",
        }));
        setClientFound(true);
      } else {
        setClientFound(false);
      }
    } catch { /* silencioso */ }
  };

  const doBook = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) return;
    setBooking(true);
    try {
      const res = await fetch(`${BOOKING_API}?action=book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barbershop_id:    shop.id,
          barber_id:        selectedBarber.id,
          service_id:       selectedServices[0].id,          // serviço principal
          service_ids:      selectedServices.map(s => s.id), // todos os serviços
          scheduled_date:   selectedDate,
          scheduled_time:   selectedSlot,
          duration_minutes: totalDuration,
          client_name:      form.name.trim(),
          client_phone:     form.phone.trim(),
          client_email:     form.email.trim() || null,
          notes:            form.notes.trim() || null,
        }),
      });
      const d = await res.json();
      if (d.error) { alert(d.error); setBooking(false); return; }
      setStep(5);
    } catch {
      alert("Erro ao confirmar agendamento. Tente novamente.");
    }
    setBooking(false);
  };

  const resetFlow = () => {
    setStep(1);
    setSelectedBarber(null);
    setSelectedServices([]);
    setSelectedDate("");
    setSelectedSlot("");
    setSlots([]);
    setForm({ name: "", phone: "", email: "", notes: "" });
    setClientFound(false);
  };

  const accent = shop?.accent_color || BT.accent;

  // ── Loading / Error screens ────────────────────────────────
  if (loading) return (
    <div style={{ minHeight:"100vh", background:BT.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ color:BT.muted, fontSize:15 }}>Carregando...</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:"100vh", background:BT.bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif", padding:"2rem" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:"1rem" }}>✂️</div>
        <div style={{ color:BT.danger, fontSize:15, marginBottom:"0.5rem" }}>{error}</div>
        <div style={{ color:BT.muted, fontSize:13 }}>Verifique o link ou entre em contato com a barbearia.</div>
      </div>
    </div>
  );

  const STEP_LABELS = ["Barbeiro", "Serviço", "Data & Hora", "Seus Dados"];

  // ── Main render ────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:BT.bg, fontFamily:"'DM Sans',sans-serif", color:BT.text }}>

      {/* Header */}
      <div style={{ background:BT.card, borderBottom:`1px solid ${BT.border}`, padding:"1rem 1.5rem", display:"flex", alignItems:"center", gap:14 }}>
        {shop?.logo_url && shop.logo_url !== "null" ? (
          <img src={shop.logo_url} alt={shop.name} style={{ height:42, width:42, objectFit:"cover", borderRadius:10, flexShrink:0 }}/>
        ) : (
          <div style={{ height:42, width:42, borderRadius:10, background:`${accent}22`, border:`1px solid ${accent}44`, display:"flex", alignItems:"center", justifyContent:"center", color:accent, fontFamily:"'Bebas Neue',sans-serif", fontSize:22, flexShrink:0 }}>
            {(shop?.name||"B")[0].toUpperCase()}
          </div>
        )}
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1.5, lineHeight:1, color:BT.text }}>{shop?.name}</div>
          <div style={{ fontSize:12, color:BT.muted, marginTop:2 }}>Agendamento Online</div>
        </div>
      </div>

      {step < 5 && (
        <div style={{ maxWidth:540, margin:"0 auto", padding:"1.5rem 1rem 4rem" }}>

          {/* Step progress bar */}
          <div style={{ display:"flex", gap:6, marginBottom:"2rem" }}>
            {STEP_LABELS.map((label, i) => {
              const s      = i + 1;
              const active = s === step;
              const done   = s < step;
              return (
                <div key={s} style={{ flex:1, textAlign:"center" }}>
                  <div style={{ height:3, borderRadius:99, background: done||active ? accent : BT.border, marginBottom:5, transition:"background .25s" }}/>
                  <div style={{ fontSize:10, color: done||active ? accent : BT.muted, fontWeight:600, letterSpacing:0.3 }}>{label}</div>
                </div>
              );
            })}
          </div>

          {/* ── Step 1: Barbeiro ─────────────────────────────── */}
          {step === 1 && (
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1, marginBottom:"1.25rem" }}>Escolha o Barbeiro</div>
              {barbers.length === 0 ? (
                <div style={{ color:BT.muted, fontSize:14 }}>Nenhum barbeiro disponível no momento.</div>
              ) : barbers.map(barber => (
                <div
                  key={barber.id}
                  onClick={() => { setSelectedBarber(barber); setStep(2); }}
                  style={{
                    background: BT.card,
                    border: `1px solid ${selectedBarber?.id === barber.id ? accent : BT.border}`,
                    borderRadius: 12,
                    padding: "1rem 1.25rem",
                    marginBottom: 10,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    transition: "border-color .15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = selectedBarber?.id === barber.id ? accent : BT.border; }}
                >
                  <div style={{ width:44, height:44, borderRadius:99, background:`${accent}22`, border:`1px solid ${accent}33`, display:"flex", alignItems:"center", justifyContent:"center", color:accent, fontWeight:700, fontSize:18, flexShrink:0, fontFamily:"'Bebas Neue',sans-serif" }}>
                    {(barber.name||"B")[0].toUpperCase()}
                  </div>
                  <div style={{ fontSize:15, fontWeight:600 }}>{barber.name}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Step 2: Serviços (multi-select) ──────────────── */}
          {step === 2 && (
            <div>
              <button onClick={() => setStep(1)} style={{ background:"none", border:"none", color:BT.muted, cursor:"pointer", fontSize:13, marginBottom:"1rem", display:"flex", alignItems:"center", gap:6, padding:0, fontFamily:"'DM Sans',sans-serif" }}>
                ← Voltar
              </button>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1, marginBottom:4 }}>Escolha os Serviços</div>
              <div style={{ fontSize:13, color:BT.muted, marginBottom:"1.25rem" }}>Você pode selecionar mais de um serviço</div>

              {services.length === 0 ? (
                <div style={{ color:BT.muted, fontSize:14 }}>Nenhum serviço disponível no momento.</div>
              ) : services.map(svc => {
                const isSelected = selectedServices.some(s => s.id === svc.id);
                return (
                  <div
                    key={svc.id}
                    onClick={() => toggleService(svc)}
                    style={{
                      background: isSelected ? `${accent}18` : BT.card,
                      border: `1px solid ${isSelected ? accent : BT.border}`,
                      borderRadius: 12,
                      padding: "1rem 1.25rem",
                      marginBottom: 10,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      transition: "border-color .15s, background .15s",
                    }}
                  >
                    {/* Checkbox visual */}
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: isSelected ? accent : "transparent",
                      border: `2px solid ${isSelected ? accent : BT.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .15s",
                    }}>
                      {isSelected && <span style={{ color:"#fff", fontSize:12, fontWeight:900, lineHeight:1 }}>✓</span>}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:600 }}>{svc.name}</div>
                      <div style={{ fontSize:12, color:BT.muted, marginTop:3 }}>{svc.duration} min</div>
                    </div>
                    <div style={{ color:accent, fontWeight:700, fontSize:16, flexShrink:0 }}>{fMoney(svc.price)}</div>
                  </div>
                );
              })}

              {/* Rodapé com total + botão Continuar — aparece quando ≥1 serviço selecionado */}
              {selectedServices.length > 0 && (
                <div style={{
                  position: "sticky",
                  bottom: 0,
                  background: BT.bg,
                  borderTop: `1px solid ${BT.border}`,
                  padding: "0.875rem 0 0",
                  marginTop: "0.5rem",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"0.75rem" }}>
                    <span style={{ fontSize:13, color:BT.muted }}>
                      {selectedServices.length} serviço{selectedServices.length !== 1 ? "s" : ""} · {totalDuration} min
                    </span>
                    <span style={{ fontSize:15, color:accent, fontWeight:700 }}>{fMoney(totalPrice)}</span>
                  </div>
                  <button
                    onClick={() => { setSelectedSlot(""); setStep(3); }}
                    style={{ width:"100%", background:accent, color:"#fff", border:"none", borderRadius:10, padding:"0.875rem", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
                  >
                    Continuar →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Data & Horário ───────────────────────── */}
          {step === 3 && (
            <div>
              <button onClick={() => { setSelectedSlot(""); setStep(2); }} style={{ background:"none", border:"none", color:BT.muted, cursor:"pointer", fontSize:13, marginBottom:"1rem", display:"flex", alignItems:"center", gap:6, padding:0, fontFamily:"'DM Sans',sans-serif" }}>
                ← Voltar
              </button>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1, marginBottom:"1.25rem" }}>Data e Horário</div>

              <label style={{ display:"block", fontSize:13, color:BT.muted, fontWeight:600, marginBottom:6 }}>Selecione uma data</label>
              <input
                type="date"
                min={todayISO()}
                value={selectedDate}
                onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(""); }}
                style={{ ...inputSt, marginBottom:"1.5rem", colorScheme:"dark" }}
              />

              {selectedDate && (
                <>
                  <div style={{ fontSize:13, color:BT.muted, fontWeight:600, marginBottom:10 }}>
                    Horários disponíveis em {fDate(selectedDate)}
                  </div>
                  {slotsLoading ? (
                    <div style={{ color:BT.muted, fontSize:14, padding:"0.5rem 0" }}>Verificando disponibilidade...</div>
                  ) : slots.length === 0 ? (
                    <div style={{ color:BT.muted, fontSize:14, padding:"0.5rem 0" }}>
                      Nenhum horário disponível nesta data. Tente outro dia.
                    </div>
                  ) : (
                    <>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:"1.5rem" }}>
                        {slots.map(slot => (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot(slot)}
                            style={{
                              background: selectedSlot === slot ? accent : BT.card,
                              color:      selectedSlot === slot ? "#fff"  : BT.text,
                              border:     `1px solid ${selectedSlot === slot ? accent : BT.border}`,
                              borderRadius: 8,
                              padding:   "0.5rem 1.1rem",
                              cursor:    "pointer",
                              fontSize:  14,
                              fontWeight: 600,
                              fontFamily: "'DM Sans',sans-serif",
                              transition: "all .15s",
                            }}
                          >
                            {fTime(slot)}
                          </button>
                        ))}
                      </div>
                      {selectedSlot && (
                        <button
                          onClick={() => setStep(4)}
                          style={{ width:"100%", background:accent, color:"#fff", border:"none", borderRadius:10, padding:"0.875rem", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}
                        >
                          Continuar →
                        </button>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 4: Dados pessoais + confirmação ────────── */}
          {step === 4 && (
            <div>
              <button onClick={() => setStep(3)} style={{ background:"none", border:"none", color:BT.muted, cursor:"pointer", fontSize:13, marginBottom:"1rem", display:"flex", alignItems:"center", gap:6, padding:0, fontFamily:"'DM Sans',sans-serif" }}>
                ← Voltar
              </button>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:1, marginBottom:"1.25rem" }}>Seus Dados</div>

              {/* Resumo do agendamento */}
              <div style={{ background:BT.card, border:`1px solid ${BT.border}`, borderRadius:12, padding:"1rem 1.25rem", marginBottom:"1.5rem" }}>
                <div style={{ fontSize:11, color:BT.muted, fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", marginBottom:10 }}>Resumo do Agendamento</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0.5rem 1rem" }}>
                  {[
                    ["Barbeiro", selectedBarber?.name],
                    ["Data",     fDate(selectedDate)],
                    ["Horário",  fTime(selectedSlot)],
                    ["Duração",  `${totalDuration} min`],
                    ["Valor",    fMoney(totalPrice)],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ color:BT.muted, fontSize:11 }}>{k}</div>
                      <div style={{ fontWeight:600, fontSize:13, color:BT.text }}>{v}</div>
                    </div>
                  ))}
                </div>
                {/* Serviços listados em linha própria (nome pode ser longo) */}
                <div style={{ marginTop:"0.75rem", paddingTop:"0.75rem", borderTop:`1px solid ${BT.border}` }}>
                  <div style={{ color:BT.muted, fontSize:11, marginBottom:3 }}>
                    Serviço{selectedServices.length !== 1 ? "s" : ""}
                  </div>
                  <div style={{ fontWeight:600, fontSize:13, color:BT.text }}>
                    {selectedServices.map(s => s.name).join(" + ")}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom:"1rem" }}>
                <label style={{ display:"block", fontSize:13, color:BT.muted, fontWeight:600, marginBottom:6 }}>Nome completo *</label>
                <input
                  type="text"
                  placeholder="Seu nome completo"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputSt}
                />
              </div>

              <div style={{ marginBottom:"1rem" }}>
                <label style={{ display:"block", fontSize:13, color:BT.muted, fontWeight:600, marginBottom:6 }}>WhatsApp *</label>
                <input
                  type="tel"
                  placeholder="(00) 90000-0000"
                  value={form.phone}
                  onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setClientFound(false); }}
                  onBlur={e => lookupClient(e.target.value)}
                  style={inputSt}
                />
              </div>

              {clientFound && (
                <div style={{ background:`${accent}18`, border:`1px solid ${accent}44`, borderRadius:10, padding:"0.6rem 1rem", marginBottom:"1rem", fontSize:13, color:accent, fontWeight:600 }}>
                  ✓ Cliente encontrado — dados preenchidos automaticamente
                </div>
              )}

              <div style={{ marginBottom:"1rem" }}>
                <label style={{ display:"block", fontSize:13, color:BT.muted, fontWeight:600, marginBottom:6 }}>E-mail *</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={inputSt}
                />
              </div>

              <div style={{ marginBottom:"1.75rem" }}>
                <label style={{ display:"block", fontSize:13, color:BT.muted, fontWeight:600, marginBottom:6 }}>Observações (opcional)</label>
                <textarea
                  placeholder="Alguma preferência ou pedido especial..."
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  style={{ ...inputSt, resize:"vertical" }}
                />
              </div>

              <button
                onClick={doBook}
                disabled={booking || !form.name.trim() || !form.phone.trim() || !form.email.trim()}
                style={{
                  width:    "100%",
                  background: accent,
                  color:    "#fff",
                  border:   "none",
                  borderRadius: 10,
                  padding:  "0.9rem",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor:   booking || !form.name.trim() || !form.phone.trim() || !form.email.trim() ? "not-allowed" : "pointer",
                  opacity:  booking || !form.name.trim() || !form.phone.trim() || !form.email.trim() ? 0.65 : 1,
                  fontFamily: "'DM Sans',sans-serif",
                  transition: "opacity .15s",
                }}
              >
                {booking ? "Confirmando..." : "Confirmar Agendamento"}
              </button>
              <div style={{ fontSize:12, color:BT.muted, textAlign:"center", marginTop:"0.75rem" }}>
                Após confirmar, a barbearia irá verificar e confirmar seu agendamento.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 5: Sucesso ───────────────────────────────── */}
      {step === 5 && (
        <div style={{ maxWidth:520, margin:"0 auto", padding:"4rem 1.5rem", textAlign:"center" }}>
          <div style={{
            width:80, height:80, borderRadius:99,
            background:`${BT.success}22`,
            border:`2px solid ${BT.success}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            margin:"0 auto 1.5rem",
            fontSize:36,
          }}>
            ✓
          </div>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:32, letterSpacing:1.5, marginBottom:8 }}>
            Agendamento Enviado!
          </div>
          <div style={{ color:BT.muted, fontSize:14, marginBottom:"2rem", maxWidth:360, margin:"0 auto 2rem" }}>
            Seu agendamento foi recebido com sucesso. A barbearia irá confirmar em breve.
          </div>

          <div style={{ background:BT.card, border:`1px solid ${BT.border}`, borderRadius:12, padding:"1.25rem", marginBottom:"2rem", textAlign:"left" }}>
            <div style={{ fontSize:11, color:BT.muted, fontWeight:700, letterSpacing:0.8, textTransform:"uppercase", marginBottom:10 }}>Detalhes</div>
            {[
              ["Barbeiro", selectedBarber?.name],
              ["Data",     fDate(selectedDate)],
              ["Horário",  fTime(selectedSlot)],
              ["Duração",  `${totalDuration} min`],
              ["Valor",    fMoney(totalPrice)],
            ].map(([k, v]) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:7, fontSize:14 }}>
                <span style={{ color:BT.muted }}>{k}</span>
                <span style={{ fontWeight:600 }}>{v}</span>
              </div>
            ))}
            {/* Serviços */}
            <div style={{ borderTop:`1px solid ${BT.border}`, paddingTop:"0.75rem", marginTop:"0.25rem", display:"flex", justifyContent:"space-between", fontSize:14, gap:12 }}>
              <span style={{ color:BT.muted, flexShrink:0 }}>Serviço{selectedServices.length !== 1 ? "s" : ""}</span>
              <span style={{ fontWeight:600, textAlign:"right" }}>{selectedServices.map(s => s.name).join(" + ")}</span>
            </div>
          </div>

          <button
            onClick={resetFlow}
            style={{
              background: "none",
              color:       accent,
              border:     `1px solid ${accent}`,
              borderRadius: 10,
              padding:    "0.75rem 2.5rem",
              fontSize:   14,
              fontWeight: 600,
              cursor:     "pointer",
              fontFamily: "'DM Sans',sans-serif",
            }}
          >
            Fazer outro agendamento
          </button>
        </div>
      )}
    </div>
  );
}
