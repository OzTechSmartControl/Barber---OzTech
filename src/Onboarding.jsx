import { useState, useEffect } from "react";
import { RefreshCw, ChevronRight, ChevronLeft, Check, Upload, X } from "lucide-react";

// ── CONFIG (mesmas constantes do App.jsx) ─────────────────────
const SUPABASE_URL  = "https://kqjzontxfwlwmvbddbnv.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxanpvbnR4Zndsd212YmRkYm52Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxOTU5NjIsImV4cCI6MjA5Mzc3MTk2Mn0.SiH3q7fQRoVDern1SnroZolD0rc_wttj5G-Me4wffVw";

// ── TEMA (igual ao App.jsx) ───────────────────────────────────
const T = {
  bg: "#0b0b0e", surface: "#13131a", card: "#1a1a24", border: "#2a2a3a",
  accent: "#4db8ff", text: "#ece8e0", muted: "#706b63", mutedLight: "#9a9590",
  success: "#43d18a", danger: "#f07070", dangerBg: "#f0707018", sidebar: "#0e0e14",
};

// ── PRESET DE CORES ───────────────────────────────────────────
const ACCENT_PRESETS = [
  { label: "Azul",     hex: "#4db8ff" },
  { label: "Verde",    hex: "#43d18a" },
  { label: "Laranja",  hex: "#f59e0b" },
  { label: "Roxo",     hex: "#a78bfa" },
  { label: "Rosa",     hex: "#f472b6" },
  { label: "Vermelho", hex: "#f07070" },
  { label: "Branco",   hex: "#ece8e0" },
];

// ── API HELPERS ───────────────────────────────────────────────
const hdr = (tok, extra = {}) => ({
  apikey: SUPABASE_ANON,
  Authorization: `Bearer ${tok || SUPABASE_ANON}`,
  "Content-Type": "application/json",
  ...extra,
});

const apiAuth = {
  // Cadastro com email/senha
  signUp: (email, password) =>
    fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()),

  // Login com email/senha
  login: (email, password) =>
    fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).then(r => r.json()),

  // Login com Google (redireciona para OAuth)
  loginGoogle: () => {
    window.location.href =
      `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${window.location.origin}`;
  },

  // Lê token do hash da URL (retorno do OAuth Google)
  parseHashToken: () => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    return params.get("access_token") || null;
  },
};

// Chama a função RPC create_barbershop criada na migration 04
const rpcCreateBarbershop = async (tok, { name, slug, accent }) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/create_barbershop`, {
    method: "POST",
    headers: hdr(tok),
    body: JSON.stringify({ p_name: name, p_slug: slug, p_accent: accent }),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.message || "Erro ao criar barbearia"); }
  return r.json(); // retorna o UUID da barbearia
};

// Atualiza o perfil do admin com o nome e outros dados
const updateProfile = async (tok, uid, data) => {
  await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}`, {
    method: "PATCH",
    headers: { ...hdr(tok), Prefer: "return=representation" },
    body: JSON.stringify(data),
  });
};

// Atualiza a barbearia recém-criada com telefone, endereço e logo.
// Usa RPC SECURITY DEFINER porque o PATCH direto em barbershops pode retornar sucesso vazio
// quando a policy RLS ainda não reconhece o vínculo recém-criado do profile.
const updateBarbershop = async (tok, shopId, data) => {
  const body = {
    p_barbershop_id: shopId,
    p_phone: data.phone || null,
    p_address: data.address || null,
    p_accent_color: data.accent_color || "#4db8ff",
    p_logo_url: data.logo_url || null,
  };

  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/oz_update_barbershop_branding`, {
    method: "POST",
    headers: hdr(tok),
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.message || "Erro ao atualizar logo/dados da barbearia.");
  }

  const updatedShop = await r.json().catch(() => null);

  // Segurança extra: se houve upload mas a RPC não devolveu logo_url, bloqueia o fluxo
  // em vez de seguir silenciosamente com o logo antigo.
  if (data.logo_url && !updatedShop?.logo_url) {
    throw new Error("Logo enviado, mas não foi gravado na barbearia. Tente novamente.");
  }

  return updatedShop;
};

// Upload de logo no Supabase Storage (bucket "logos")
const uploadLogo = async (tok, file, shopId) => {
  if (!file) return null;

  const rawExt = file.name.split(".").pop() || "png";
  const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${shopId}/logo-${Date.now()}.${ext}`;

  const r = await fetch(`${SUPABASE_URL}/storage/v1/object/logos/${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: `Bearer ${tok}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
      "cache-control": "3600",
    },
    body: file,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(text || "Erro no upload do logo.");
  }

  return `${SUPABASE_URL}/storage/v1/object/public/logos/${path}?v=${Date.now()}`;
};

const redeemCourtesyAccess = async (tok, email, shopId) => {
  if (!email || !shopId) return;

  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/redeem_courtesy`, {
    method: "POST",
    headers: hdr(tok),
    body: JSON.stringify({
      p_email: String(email).trim().toLowerCase(),
      p_barbershop_id: shopId,
    }),
  });

  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.message || "Erro ao vincular cortesia à barbearia.");
  }
};

// ── SHARED UI ─────────────────────────────────────────────────
const inputSt = {
  width: "100%", background: T.surface, border: `1px solid ${T.border}`,
  borderRadius: 8, padding: "0.65rem 0.875rem", color: T.text, fontSize: 14,
  outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif",
};

const Btn = ({ children, onClick, disabled, variant = "primary", style }) => {
  const v = {
    primary: { background: T.accent, color: "#0a0808", border: "none" },
    ghost:   { background: T.surface, color: T.text, border: `1px solid ${T.border}` },
    google:  { background: "#fff", color: "#1a1a1a", border: "1px solid #ddd" },
  };
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        ...v[variant], borderRadius: 8, padding: "0.65rem 1.25rem", fontSize: 14,
        fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: 8, fontFamily: "'DM Sans', sans-serif", opacity: disabled ? 0.5 : 1,
        width: "100%", ...style,
      }}
    >
      {children}
    </button>
  );
};

const ErrMsg = ({ msg }) => msg ? (
  <div style={{ background: T.dangerBg, border: `1px solid ${T.danger}44`, borderRadius: 8, padding: "0.6rem 1rem", color: T.danger, fontSize: 13, marginBottom: "1rem" }}>
    {msg}
  </div>
) : null;

const Label = ({ c }) => (
  <div style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.8 }}>{c}</div>
);

// ── BARRA DE PROGRESSO ────────────────────────────────────────
const ProgressBar = ({ step, total }) => (
  <div style={{ marginBottom: "2rem" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          flex: 1, height: 3, borderRadius: 99, marginRight: i < total - 1 ? 4 : 0,
          background: i < step ? T.accent : T.border,
          transition: "background 0.3s",
        }} />
      ))}
    </div>
    <div style={{ fontSize: 12, color: T.muted }}>Passo {step} de {total}</div>
  </div>
);

// ══════════════════════════════════════════════════════════════
//  ONBOARDING PRINCIPAL
// ══════════════════════════════════════════════════════════════
export default function Onboarding({ onComplete, courtesyEmail = "" }) {
  const [step,    setStep]    = useState(1);   // 1–5
  const [loading, setLoading] = useState(false);
  const [err,     setErr]     = useState("");
  const [token,   setToken]   = useState(null);
  const [uid,     setUid]     = useState(null);

  // Dados coletados em cada passo
  // Pré-preenche o e-mail se veio do fluxo de cortesia
  const [email,   setEmail]   = useState(courtesyEmail);
  const [pass,    setPass]    = useState("");
  const [pass2,   setPass2]   = useState("");
  const [isLogin, setIsLogin] = useState(false); // toggle cadastro/login
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [ownerName, setOwnerName] = useState("");

  const [shopName, setShopName] = useState("");
  const [slug,     setSlug]     = useState("");

  const [accent,   setAccent]   = useState("#4db8ff");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  const [phone,   setPhone]   = useState("");
  const [address, setAddress] = useState("");

  // ── Detecta retorno do OAuth Google ──────────────────────────
  useEffect(() => {
    const tok = apiAuth.parseHashToken();
    if (tok) {
      window.history.replaceState(null, "", window.location.pathname);
      setToken(tok);
      // Busca o UID do usuário retornado pelo Google
      fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: hdr(tok) })
        .then(r => r.json())
        .then(u => { setUid(u.id); setStep(2); })
        .catch(() => setErr("Erro ao identificar usuário Google."));
    }
  }, []);

  // ── Gera slug automático a partir do nome ─────────────────────
  const handleShopName = (val) => {
    setShopName(val);
    setSlug(val.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  // ── Preview do logo ───────────────────────────────────────────
  const handleLogoFile = (file) => {
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = e => setLogoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  // ── PASSO 1 — Criar conta ─────────────────────────────────────
  const submitAccount = async () => {
    setErr("");
    if (!email || !pass) return setErr("Preencha e-mail e senha.");
    if (!isLogin && pass !== pass2) return setErr("As senhas não conferem.");
    if (!isLogin && pass.length < 6) return setErr("A senha precisa ter no mínimo 6 caracteres.");
    setLoading(true);
    try {
      const res = isLogin
        ? await apiAuth.login(email, pass)
        : await apiAuth.signUp(email, pass);

      if (res.error || res.error_description) {
        const msg = res.error_description || res.msg || "Erro na autenticação.";
        setErr(msg); setLoading(false); return;
      }
      if (!res.access_token) {
        if (isLogin) {
          setErr("E-mail ou senha incorretos.");
        } else {
          setShowConfirmModal(true);
        }
        setLoading(false);
        return;
      }
      setToken(res.access_token);
      setUid(res.user?.id);
      setStep(2);
    } catch { setErr("Erro de conexão."); }
    setLoading(false);
  };

  

  // ── Reenviar confirmação de e-mail ─────────────────────────
  const resendConfirmation = async () => {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "signup",
          email,
        }),
      });

      alert("E-mail reenviado com sucesso.");
    } catch {
      alert("Erro ao reenviar e-mail.");
    }
  };

  // ── PASSO 5 — Finalizar e salvar tudo ────────────────────────
  const submitFinal = async () => {
    if (!phone) return setErr("Informe um telefone de contato.");
    setLoading(true); setErr("");
    try {
      // 1. Cria a barbearia e vincula o perfil admin.
      const shopId = await rpcCreateBarbershop(token, { name: shopName, slug, accent });

      // 2. Vincula assinatura paga, se existir. Não bloqueia o fluxo de cortesia.
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_paid_subscription`, {
        method: "POST",
        headers: hdr(token),
        body: JSON.stringify({
          p_user_id: uid,
          p_barbershop_id: shopId,
          p_email: email,
        }),
      }).catch(() => null);

      // 3. Tenta vincular cortesia pelo e-mail real do usuário.
      // Antes isso dependia de courtesyEmail vindo da tela de planos; se o usuário entrasse pelo e-mail/senha,
      // a cortesia ficava sem used_by_user_id e sem barbershop_id.
      await redeemCourtesyAccess(token, email || courtesyEmail, shopId);

      // 4. Faz upload do logo, se houver. Agora o erro não é mais ignorado silenciosamente.
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadLogo(token, logoFile, shopId);
      }

      // 5. Atualiza a barbearia com telefone, endereço e logo.
      await updateBarbershop(token, shopId, {
        phone,
        address,
        accent_color: accent,
        ...(logoUrl && { logo_url: logoUrl }),
      });

      // 6. Atualiza o perfil do admin com o nome do dono.
      await updateProfile(token, uid, { full_name: ownerName });

      // 7. Busca o perfil completo e devolve para o App.
      const profile = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${uid}&select=*`,
        { headers: hdr(token) }
      ).then(r => r.json()).then(d => d[0]);

      const user = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: hdr(token) })
        .then(r => r.json());

      onComplete({ token, user, profile });
    } catch (e) {
      setErr(e.message || "Erro ao salvar. Tente novamente.");
    }
    setLoading(false);
  };

  // ── LAYOUT EXTERNO ────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'DM Sans', sans-serif", padding: "2rem 1rem" }}>
      <style>{`*{box-sizing:border-box} input::placeholder,textarea::placeholder{color:${T.muted}} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ position: "fixed", left: 0, top: 0, bottom: 0, width: 4, background: T.accent }} />

      <div style={{ width: "100%", maxWidth: 460 }}>


      {showConfirmModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.72)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            width: "100%",
            maxWidth: 420,
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 18,
            padding: "2rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
            textAlign: "center"
          }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>🚀</div>

            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 28,
              letterSpacing: 2,
              color: T.text,
              marginBottom: 12
            }}>
              Falta só um passo
            </div>

            <div style={{
              color: T.text,
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: "1.75rem"
            }}>
              Confirmamos seu cadastro, mas precisamos validar seu e-mail.
              <br /><br />
              Clique no link enviado para liberar o acesso ao sistema.
              <br /><br />
              Após a confirmação:
              <br />→ volte ao Oz.Barber
              <br />→ clique em “Entrar”
              <br />→ continue o cadastro da sua barbearia
            </div>

            <Btn
              onClick={() => {
                setShowConfirmModal(false);
                setIsLogin(true);
              }}
              style={{ marginBottom: 12 }}
            >
              Já confirmei
            </Btn>

            <Btn
              variant="ghost"
              onClick={resendConfirmation}
            >
              Reenviar e-mail
            </Btn>
          </div>
        </div>
      )}

        {/* Cabeçalho */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 34, letterSpacing: 4, color: T.accent }}>BARBER SAAS</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Configure sua barbearia em minutos</div>
        </div>

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: "2rem" }}>

          {/* ── PASSO 1: Criar conta ─── */}
          {step === 1 && (
            <>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 2, color: T.text, marginBottom: 6 }}>
                {isLogin ? "ENTRAR" : "CRIAR CONTA"}
              </div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: "1.5rem" }}>
                {isLogin ? "Acesse sua conta existente" : "Comece gratuitamente, sem cartão"}
              </div>

              <ErrMsg msg={err} />

              <div style={{ marginBottom: "1rem" }}>
                <Label c="E-mail" />
                <input style={inputSt} type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === "Enter" && submitAccount()} />
              </div>

              <div style={{ marginBottom: isLogin ? "1rem" : "0.75rem" }}>
                <Label c="Senha" />
                <input style={inputSt} type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submitAccount()} />
              </div>

              {!isLogin && (
                <div style={{ marginBottom: "1rem" }}>
                  <Label c="Confirmar senha" />
                  <input style={inputSt} type="password" placeholder="••••••••" value={pass2} onChange={e => setPass2(e.target.value)} onKeyDown={e => e.key === "Enter" && submitAccount()} />
                </div>
              )}

              <Btn onClick={submitAccount} disabled={loading}>
                {loading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : null}
                {isLogin ? "Entrar" : "Criar conta"}
                {!loading && <ChevronRight size={16} />}
              </Btn>

              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "1.25rem 0" }}>
                <div style={{ flex: 1, height: 1, background: T.border }} />
                <span style={{ fontSize: 12, color: T.muted }}>ou</span>
                <div style={{ flex: 1, height: 1, background: T.border }} />
              </div>

              <Btn variant="google" onClick={apiAuth.loginGoogle}>
                <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.16C6.51 42.62 14.62 48 24 48z"/><path fill="#FBBC05" d="M10.53 28.59c-.5-1.45-.79-3-.79-4.59s.29-3.14.79-4.59l-7.98-6.16C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.55 10.75l7.98-6.16z"/><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.55 13.25l7.98 6.16C12.43 13.72 17.74 9.5 24 9.5z"/></svg>
                Continuar com Google
              </Btn>

              <div style={{ textAlign: "center", marginTop: "1.25rem", fontSize: 13, color: T.muted }}>
                {isLogin ? "Não tem conta? " : "Já tem conta? "}
                <button onClick={() => { setIsLogin(l => !l); setErr(""); }} style={{ background: "none", border: "none", color: T.accent, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600 }}>
                  {isLogin ? "Cadastrar" : "Entrar"}
                </button>
              </div>
            </>
          )}

          {/* ── PASSO 2: Nome do dono ─── */}
          {step === 2 && (
            <>
              <ProgressBar step={1} total={4} />
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 2, color: T.text, marginBottom: 6 }}>SEU NOME</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: "1.5rem" }}>Como você quer ser chamado no sistema?</div>
              <ErrMsg msg={err} />
              <div style={{ marginBottom: "1.5rem" }}>
                <Label c="Nome do administrador" />
                <input style={inputSt} placeholder="Ex: João Silva" value={ownerName} onChange={e => setOwnerName(e.target.value)} onKeyDown={e => e.key === "Enter" && ownerName.trim() && setStep(3)} autoFocus />
              </div>
              <Btn onClick={() => { if (!ownerName.trim()) return setErr("Informe seu nome."); setErr(""); setStep(3); }}>
                Próximo <ChevronRight size={16} />
              </Btn>
            </>
          )}

          {/* ── PASSO 3: Nome da barbearia ─── */}
          {step === 3 && (
            <>
              <ProgressBar step={2} total={4} />
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 2, color: T.text, marginBottom: 6 }}>SUA BARBEARIA</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: "1.5rem" }}>Como se chama a sua barbearia?</div>
              <ErrMsg msg={err} />
              <div style={{ marginBottom: "0.75rem" }}>
                <Label c="Nome da barbearia" />
                <input style={inputSt} placeholder="Ex: Oz Barber" value={shopName} onChange={e => handleShopName(e.target.value)} autoFocus />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <Label c="URL do sistema (slug)" />
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: T.muted }}>barber.app/</span>
                  <input style={{ ...inputSt, paddingLeft: 82 }} placeholder="oz-barber" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" onClick={() => setStep(2)} style={{ width: "auto", flex: "0 0 auto", paddingLeft: 12, paddingRight: 12 }}>
                  <ChevronLeft size={16} />
                </Btn>
                <Btn onClick={() => { if (!shopName.trim()) return setErr("Informe o nome da barbearia."); if (!slug.trim()) return setErr("O slug não pode estar vazio."); setErr(""); setStep(4); }}>
                  Próximo <ChevronRight size={16} />
                </Btn>
              </div>
            </>
          )}

          {/* ── PASSO 4: Identidade visual ─── */}
          {step === 4 && (
            <>
              <ProgressBar step={3} total={4} />
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 2, color: T.text, marginBottom: 6 }}>IDENTIDADE VISUAL</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: "1.5rem" }}>Logo e cor de destaque da sua barbearia</div>
              <ErrMsg msg={err} />

              {/* Logo upload */}
              <div style={{ marginBottom: "1.5rem" }}>
                <Label c="Logo (opcional)" />
                <label style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, border: `2px dashed ${T.border}`, borderRadius: 10, padding: "1.5rem", cursor: "pointer", background: T.surface }}>
                  {logoPreview
                    ? <img src={logoPreview} alt="preview" style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 8 }} />
                    : <Upload size={28} color={T.muted} />}
                  <span style={{ fontSize: 13, color: T.muted }}>{logoPreview ? "Clique para trocar" : "Clique para enviar o logo"}</span>
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleLogoFile(e.target.files[0])} />
                </label>
                {logoPreview && (
                  <button onClick={() => { setLogoFile(null); setLogoPreview(null); }} style={{ marginTop: 6, background: "none", border: "none", color: T.muted, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <X size={12} /> Remover logo
                  </button>
                )}
              </div>

              {/* Cor de destaque */}
              <div style={{ marginBottom: "1.5rem" }}>
                <Label c="Cor de destaque" />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {ACCENT_PRESETS.map(p => (
                    <button key={p.hex} onClick={() => setAccent(p.hex)} title={p.label} style={{ width: 32, height: 32, borderRadius: "50%", background: p.hex, border: accent === p.hex ? `3px solid ${T.text}` : `2px solid transparent`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {accent === p.hex && <Check size={14} color="#0a0808" />}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <input type="color" value={accent} onChange={e => setAccent(e.target.value)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${T.border}`, background: "none", cursor: "pointer", padding: 2 }} />
                  <input style={{ ...inputSt, flex: 1 }} placeholder="#4db8ff" value={accent} onChange={e => setAccent(e.target.value)} maxLength={7} />
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: accent, border: `1px solid ${T.border}`, flexShrink: 0 }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" onClick={() => setStep(3)} style={{ width: "auto", flex: "0 0 auto", paddingLeft: 12, paddingRight: 12 }}>
                  <ChevronLeft size={16} />
                </Btn>
                <Btn onClick={() => { setErr(""); setStep(5); }}>
                  Próximo <ChevronRight size={16} />
                </Btn>
              </div>
            </>
          )}

          {/* ── PASSO 5: Contato ─── */}
          {step === 5 && (
            <>
              <ProgressBar step={4} total={4} />
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 2, color: T.text, marginBottom: 6 }}>CONTATO</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: "1.5rem" }}>Informações de contato da barbearia</div>
              <ErrMsg msg={err} />

              <div style={{ marginBottom: "1rem" }}>
                <Label c="Telefone / WhatsApp" />
                <input style={inputSt} placeholder="(11) 99999-9999" value={phone} onChange={e => setPhone(e.target.value)} autoFocus />
              </div>
              <div style={{ marginBottom: "1.5rem" }}>
                <Label c="Endereço (opcional)" />
                <textarea style={{ ...inputSt, resize: "vertical", minHeight: 72 }} placeholder="Rua, número, bairro, cidade" value={address} onChange={e => setAddress(e.target.value)} />
              </div>

              {/* Resumo antes de finalizar */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "1rem", marginBottom: "1.5rem", fontSize: 13 }}>
                <div style={{ color: T.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Resumo</div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: T.muted }}>Admin</span>
                  <span style={{ color: T.text }}>{ownerName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: T.muted }}>Barbearia</span>
                  <span style={{ color: T.text }}>{shopName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: T.muted }}>Cor</span>
                  <div style={{ width: 20, height: 20, borderRadius: 4, background: accent }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="ghost" onClick={() => setStep(4)} style={{ width: "auto", flex: "0 0 auto", paddingLeft: 12, paddingRight: 12 }}>
                  <ChevronLeft size={16} />
                </Btn>
                <Btn onClick={submitFinal} disabled={loading}>
                  {loading
                    ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Criando…</>
                    : <><Check size={16} /> Finalizar cadastro</>}
                </Btn>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
