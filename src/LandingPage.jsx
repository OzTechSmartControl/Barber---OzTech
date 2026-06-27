import { useState, useEffect } from "react";
import ozBarberLogo from "./assets/ozbarber-logo.png.png";
import {
  Check, ChevronRight, Calendar, DollarSign, Award,
  BarChart2, Users, Smartphone, Shield, RefreshCw,
  Headphones, Star, Menu, X, ArrowRight, Scissors,
  Clock, Zap, TrendingUp,
} from "lucide-react";

const T = {
  bg: "#08090c",
  surface: "#0f1017",
  card: "#13141e",
  cardHover: "#181924",
  border: "#1e2030",
  borderLight: "#252638",
  accent: "#4db8ff",
  accentDim: "#4db8ff18",
  accentGlow: "#4db8ff30",
  text: "#ece8e0",
  muted: "#706b63",
  mutedLight: "#9a9590",
  success: "#43d18a",
  successBg: "#43d18a15",
};

const PLANS = [
  {
    id: "monthly",
    label: "Plano Mensal",
    priceLabel: "R$ 79,90",
    period: "/mês",
    sub: "Renovação automática a cada 30 dias",
    highlight: false,
    badge: null,
    economy: null,
  },
  {
    id: "semestral",
    label: "Plano Semestral",
    priceLabel: "R$ 399,90",
    period: "/6 meses",
    sub: "Equivale a apenas R$ 66,65/mês",
    highlight: false,
    badge: null,
    economy: "Economize R$ 79,50",
  },
  {
    id: "annual",
    label: "Plano Anual",
    priceLabel: "R$ 699,90",
    period: "/ano",
    sub: "Equivale a apenas R$ 58,32/mês",
    highlight: true,
    badge: "MELHOR OFERTA",
    economy: "Economize R$ 258,90",
  },
];

const FEATURES = [
  {
    icon: Calendar,
    title: "Atendimentos",
    desc: "Registre e acompanhe todos os atendimentos com controle total de serviços, valores e histórico.",
  },
  {
    icon: DollarSign,
    title: "Caixa",
    desc: "Entradas e saídas organizadas. Controle financeiro completo da sua barbearia em tempo real.",
  },
  {
    icon: Award,
    title: "Comissões",
    desc: "Cálculo automático e preciso das comissões de cada barbeiro ao final do período.",
  },
  {
    icon: BarChart2,
    title: "Relatórios",
    desc: "Indicadores, metas e análises para tomar decisões com base em dados reais.",
  },
  {
    icon: Users,
    title: "Clientes",
    desc: "Histórico completo de cada cliente e dados de contato centralizados.",
  },
  {
    icon: Smartphone,
    title: "Mobile",
    desc: "Gestão completa onde você estiver. Sistema 100% responsivo, funciona no celular como app.",
  },
];

const BENEFITS = [
  { icon: Shield, title: "Sem fidelidade", desc: "Liberdade para cancelar quando quiser, sem multas ou carências." },
  { icon: Star, title: "Dados sempre seguros", desc: "Seus dados protegidos com criptografia e backups automáticos." },
  { icon: Headphones, title: "Suporte humanizado", desc: "Atendimento real, de pessoas que entendem o seu negócio." },
  { icon: RefreshCw, title: "Renovação automática", desc: "Praticidade total. Sua assinatura renova sem você precisar se preocupar." },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{background:#08090c;color:#ece8e0;font-family:'DM Sans',sans-serif}
  ::-webkit-scrollbar{width:6px}
  ::-webkit-scrollbar-track{background:#0f1017}
  ::-webkit-scrollbar-thumb{background:#2a2a3a;border-radius:3px}

  @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
  @keyframes fadeIn{from{opacity:0}to{opacity:1}}
  @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  @keyframes glow{0%,100%{box-shadow:0 0 20px #4db8ff22}50%{box-shadow:0 0 40px #4db8ff44}}
  @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

  .hero-logo-anim{animation:fadeUp .5s ease both}
  .hero-title-anim{animation:fadeUp .6s .1s ease both}
  .hero-sub-anim{animation:fadeUp .7s .2s ease both;opacity:0;animation-fill-mode:forwards}
  .hero-cta-anim{animation:fadeUp .7s .3s ease both;opacity:0;animation-fill-mode:forwards}
  .hero-feat-anim{animation:fadeUp .7s .4s ease both;opacity:0;animation-fill-mode:forwards}
  .float-anim{animation:float 4s ease-in-out infinite}

  .ht-white{display:block;color:#ece8e0}
  .ht-accent{display:block;background:linear-gradient(90deg,#4db8ff 0%,#a78bfa 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}

  .hero-feat-row{display:flex;gap:12px;flex-wrap:wrap}
  .hero-feat{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:500;color:#9a9590;background:rgba(255,255,255,.03);border:1px solid #1e2030;border-radius:10px;padding:.45rem .9rem}

  .hero-credit{display:flex;align-items:center;justify-content:center;gap:1.5rem;margin-top:3rem;padding-top:1.5rem;border-top:1px solid #1a1b27;font-size:12px;color:#4a4555}
  .hero-credit::before,.hero-credit::after{content:'';flex:1;height:1px;background:linear-gradient(to var(--dir,right),transparent,#1e2030 80%)}
  .hero-credit::after{--dir:left}

  .feat-card{transition:transform .2s ease, border-color .2s ease, box-shadow .2s ease;cursor:default}
  .feat-card:hover{transform:translateY(-4px);border-color:#4db8ff44 !important;box-shadow:0 20px 48px rgba(0,0,0,.5),0 0 0 1px #4db8ff22 !important}

  .plan-card{transition:transform .2s ease, box-shadow .2s ease;cursor:pointer}
  .plan-card:hover{transform:translateY(-6px)}

  .btn-primary{transition:filter .18s ease, transform .18s ease}
  .btn-primary:hover{filter:brightness(1.1);transform:translateY(-1px)}
  .btn-primary:active{transform:translateY(0)}

  .btn-ghost{transition:background .18s ease, border-color .18s ease, transform .18s ease}
  .btn-ghost:hover{background:rgba(77,184,255,.08) !important;border-color:#4db8ff55 !important;transform:translateY(-1px)}

  .nav-link{transition:color .18s ease;cursor:pointer}
  .nav-link:hover{color:#4db8ff !important}

  .gradient-text{
    background:linear-gradient(135deg,#4db8ff 0%,#a78bfa 100%);
    -webkit-background-clip:text;
    -webkit-text-fill-color:transparent;
    background-clip:text;
  }

  @media(max-width:768px){
    .desktop-nav{display:none !important}
    .mobile-menu-btn{display:flex !important}
    .hero-grid{grid-template-columns:1fr !important}
    .feat-grid{grid-template-columns:1fr 1fr !important}
    .benefit-grid{grid-template-columns:1fr 1fr !important}
    .plans-grid{grid-template-columns:1fr !important}
    .hero-logo-img-resp{height:90px !important}
  }
  @media(max-width:480px){
    .feat-grid{grid-template-columns:1fr !important}
    .benefit-grid{grid-template-columns:1fr !important}
  }
`;

function Navbar({ onLogin, onSubscribe }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? "rgba(8,9,12,.94)" : "transparent",
      backdropFilter: scrolled ? "blur(16px)" : "none",
      borderBottom: scrolled ? `1px solid ${T.border}` : "1px solid transparent",
      transition: "all .3s ease",
    }}>
      <div style={{ maxWidth: 1520, margin: "0 auto", padding: "0 1.5rem", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <img src={ozBarberLogo} alt="Oz.Barber" style={{ height: 44, filter: "drop-shadow(0 0 12px rgba(77,184,255,.3))" }} />

        <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          {[["Funcionalidades", "features"], ["Planos", "plans"], ["Benefícios", "benefits"]].map(([label, id]) => (
            <span key={id} className="nav-link" onClick={() => scrollTo(id)} style={{ fontSize: 14, fontWeight: 500, color: T.mutedLight }}>
              {label}
            </span>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn-ghost" onClick={onLogin} style={{
            background: "transparent", border: `1px solid ${T.border}`, borderRadius: 10,
            padding: "0.5rem 1.1rem", color: T.text, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            Entrar
          </button>
          <button className="btn-primary" onClick={onSubscribe} style={{
            background: T.accent, border: "none", borderRadius: 10,
            padding: "0.5rem 1.2rem", color: "#06090f", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 4px 18px rgba(77,184,255,.25)",
          }}>
            Assinar Plano
          </button>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileOpen(v => !v)}
            style={{
              display: "none", background: "transparent", border: `1px solid ${T.border}`,
              borderRadius: 8, padding: "0.4rem", color: T.text, cursor: "pointer", alignItems: "center",
            }}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div style={{
          background: "rgba(8,9,12,.97)", borderTop: `1px solid ${T.border}`,
          padding: "1rem 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem",
        }}>
          {[["Funcionalidades", "features"], ["Planos", "plans"], ["Benefícios", "benefits"]].map(([label, id]) => (
            <span key={id} onClick={() => scrollTo(id)} style={{ fontSize: 15, fontWeight: 500, color: T.text, cursor: "pointer" }}>
              {label}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}

function HeroSection({ onSubscribe, onLogin }) {
  return (
    <section style={{
      padding: "88px 0 60px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Blobs decorativos */}
      <div style={{
        position: "absolute", top: "50%", left: "30%", transform: "translate(-50%,-50%)",
        width: 900, height: 900,
        background: "radial-gradient(circle, rgba(77,184,255,.07), transparent 65%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: "40%", right: "10%",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(167,139,250,.06), transparent 65%)",
        pointerEvents: "none",
      }} />

      <div style={{ maxWidth: 1520, margin: "0 auto", width: "100%", padding: "0 4%" }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5%", alignItems: "center" }}>

          {/* ── Coluna esquerda ── */}
          <div>
            {/* Logo grande */}
            <div className="hero-logo-anim" style={{ marginBottom: "1.4rem" }}>
              <img
                className="hero-logo-img-resp"
                src={ozBarberLogo}
                alt="Oz.Barber"
                style={{ height: 140, filter: "drop-shadow(0 0 20px rgba(77,184,255,.45))", display: "block" }}
              />
              <p style={{
                fontSize: 11, fontWeight: 600, letterSpacing: 4,
                color: "#706b63", textTransform: "uppercase", marginTop: 12,
              }}>
                Sistema completo para barbearias
              </p>
            </div>

            {/* Título 4 linhas — DM Sans 800 */}
            <h1 className="hero-title-anim" style={{
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(28px, 3.4vw, 54px)",
              lineHeight: 1.1,
              letterSpacing: -0.5,
              marginBottom: "1.4rem",
            }}>
              <span className="ht-white">Seu serviço gera a</span>
              <span className="ht-accent">experiência do cliente</span>
              <span className="ht-white">Sua gestão garante</span>
              <span className="ht-accent">o seu resultado</span>
            </h1>

            {/* Subtítulo */}
            <p className="hero-sub-anim" style={{
              fontSize: 16, color: "#9a9590", lineHeight: 1.75,
              maxWidth: 460, marginBottom: "2rem",
            }}>
              O sistema completo para barbearias que querem mais organização, controle e lucro.{" "}
              <span style={{ color: "#4db8ff", fontWeight: 500 }}>Pronto para usar</span> e 100% personalizável.
            </p>

            {/* Botões CTA */}
            <div className="hero-cta-anim" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: "1.8rem" }}>
              <button className="btn-primary" onClick={onSubscribe} style={{
                background: T.accent, border: "none", borderRadius: 13,
                padding: "0.9rem 1.8rem", color: "#06090f", fontSize: 15, fontWeight: 700,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
                boxShadow: "0 8px 28px rgba(77,184,255,.30)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                Começar agora <ArrowRight size={16} />
              </button>
              <button className="btn-ghost" onClick={onLogin} style={{
                background: "transparent", border: `1px solid ${T.border}`, borderRadius: 13,
                padding: "0.9rem 1.6rem", color: T.text, fontSize: 15, fontWeight: 600,
                cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
              }}>
                Já tenho conta
              </button>
            </div>

            {/* Badges de funcionalidade */}
            <div className="hero-feat-row hero-feat-anim">
              {[
                [Zap, "100% online"],
                [Calendar, "Cancelamento fácil"],
                [RefreshCw, "Atualizações constantes"],
                [Smartphone, "App para Android"],
              ].map(([Icon, label]) => (
                <div key={label} className="hero-feat">
                  <Icon size={13} color={T.accent} strokeWidth={2} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Coluna direita — Dashboard ── */}
          <div className="float-anim" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div style={{
              background: "linear-gradient(145deg, #13141e, #0f1017)",
              border: `1px solid ${T.border}`,
              borderRadius: 24,
              padding: "2rem",
              width: "100%", maxWidth: 400,
              boxShadow: "0 40px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(77,184,255,.06)",
              animation: "glow 3s ease-in-out infinite",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: 11, color: T.muted, marginBottom: 2 }}>Dashboard · Maio 2026</div>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: T.text, letterSpacing: 0.8 }}>BARBEARIA MODELO</div>
                </div>
                <div style={{ background: T.accentDim, border: `1px solid ${T.accent}33`, borderRadius: 8, padding: "0.35rem 0.75rem" }}>
                  <TrendingUp size={14} color={T.accent} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: "1.2rem" }}>
                {[
                  { label: "Faturamento", value: "R$ 8.240", color: T.accent },
                  { label: "Atendimentos", value: "312", color: T.success },
                  { label: "Ticket médio", value: "R$ 26,41", color: "#a78bfa" },
                  { label: "Clientes", value: "184", color: "#f0a500" },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: T.surface, borderRadius: 12, padding: "0.85rem" }}>
                    <div style={{ fontSize: 10, color: T.muted, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color, letterSpacing: 0.5 }}>{value}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: T.surface, borderRadius: 12, padding: "0.85rem" }}>
                <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>Faturamento por dia</div>
                <div style={{ display: "flex", gap: 5, alignItems: "flex-end", height: 48 }}>
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} style={{
                      flex: 1, height: `${h}%`,
                      background: i === 5 ? T.accent : `${T.accent}40`,
                      borderRadius: "3px 3px 0 0",
                    }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Crédito */}
        <div className="hero-credit">
          Desenvolvido por <strong style={{ color: "#9a9590" }}>OzTech</strong>&nbsp;SmartControl
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="features" style={{ padding: "80px 1.5rem" }}>
      <div style={{ maxWidth: 1520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: T.accentDim, border: `1px solid ${T.accent}33`,
            borderRadius: 999, padding: "0.35rem 0.9rem", marginBottom: "1rem",
          }}>
            <Scissors size={12} color={T.accent} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, letterSpacing: 0.5 }}>FUNCIONALIDADES</span>
          </div>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(32px,4vw,52px)",
            color: T.text, letterSpacing: 1, marginBottom: "0.75rem",
          }}>
            Tudo que sua barbearia precisa,{" "}
            <span style={{ color: T.accent }}>em um só lugar</span>
          </h2>
          <p style={{ fontSize: 15, color: T.mutedLight, maxWidth: 540, margin: "0 auto", lineHeight: 1.7 }}>
            Menos bagunça, mais resultado. Controle completo da sua operação sem complicação.
          </p>
        </div>

        <div className="feat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="feat-card" style={{
              background: "linear-gradient(145deg, #13141e, #0f1017)",
              border: `1px solid ${T.border}`,
              borderRadius: 18, padding: "1.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,.3)",
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13,
                background: T.accentDim, border: `1px solid ${T.accent}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "1rem",
              }}>
                <Icon size={20} color={T.accent} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: T.mutedLight, lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  const stats = [
    { value: "1.200+", label: "Atendimentos gerenciados" },
    { value: "99,9%", label: "Uptime garantido" },
    { value: "3 planos", label: "Para todo tamanho de negócio" },
    { value: "R$ 0", label: "Taxa de setup" },
  ];

  return (
    <section style={{ padding: "50px 1.5rem" }}>
      <div style={{
        maxWidth: 1520, margin: "0 auto",
        background: "linear-gradient(135deg, rgba(77,184,255,.07) 0%, rgba(167,139,250,.05) 100%)",
        border: `1px solid ${T.accent}22`,
        borderRadius: 24, padding: "2.5rem 2rem",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1.5rem" }}>
          {stats.map(({ value, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 42,
                color: T.accent, letterSpacing: 1, lineHeight: 1,
              }}>{value}</div>
              <div style={{ fontSize: 13, color: T.mutedLight, marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlansSection({ onSubscribe }) {
  return (
    <section id="plans" style={{ padding: "80px 1.5rem" }}>
      <div style={{ maxWidth: 1520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: T.accentDim, border: `1px solid ${T.accent}33`,
            borderRadius: 999, padding: "0.35rem 0.9rem", marginBottom: "1rem",
          }}>
            <Star size={12} color={T.accent} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, letterSpacing: 0.5 }}>PLANOS E PREÇOS</span>
          </div>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(32px,4vw,52px)",
            color: T.text, letterSpacing: 1, marginBottom: "0.75rem",
          }}>
            Escolha o plano ideal para{" "}
            <span style={{ color: T.accent }}>sua barbearia</span>
          </h2>
          <p style={{ fontSize: 15, color: T.mutedLight, maxWidth: 460, margin: "0 auto", lineHeight: 1.7 }}>
            Planos que cabem no seu negócio. Economize mais escolhendo um período maior.
          </p>
        </div>

        <div className="plans-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, alignItems: "start" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="plan-card"
              onClick={onSubscribe}
              style={{
                background: plan.highlight
                  ? "linear-gradient(145deg, #131828, #0e1220)"
                  : "linear-gradient(145deg, #13141e, #0f1017)",
                border: `1px solid ${plan.highlight ? `${T.accent}55` : T.border}`,
                borderRadius: 22,
                padding: "2rem 1.6rem",
                position: "relative",
                boxShadow: plan.highlight
                  ? `0 24px 56px rgba(0,0,0,.5), 0 0 0 1px ${T.accent}20`
                  : "0 12px 36px rgba(0,0,0,.3)",
              }}
            >
              {plan.badge && (
                <div style={{
                  position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                  background: T.accent, color: "#06090f",
                  borderRadius: 999, padding: "4px 16px",
                  fontSize: 10, fontWeight: 800, letterSpacing: 0.6, whiteSpace: "nowrap",
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 6 }}>{plan.label}</div>
              <div style={{ fontSize: 13, color: T.mutedLight, marginBottom: "1.25rem", lineHeight: 1.5 }}>{plan.sub}</div>

              <div style={{ marginBottom: "1.25rem" }}>
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 46, letterSpacing: 1,
                  color: plan.highlight ? T.accent : T.text, lineHeight: 1,
                }}>
                  {plan.priceLabel}
                </span>
                <span style={{ fontSize: 13, color: T.mutedLight, marginLeft: 4 }}>{plan.period}</span>
              </div>

              {plan.economy && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  background: T.successBg, color: T.success,
                  borderRadius: 999, padding: "4px 10px",
                  fontSize: 11, fontWeight: 700, marginBottom: "1.5rem",
                }}>
                  <Check size={10} /> {plan.economy}
                </div>
              )}

              <div style={{
                background: plan.highlight ? T.accent : "rgba(255,255,255,.04)",
                border: `1px solid ${plan.highlight ? T.accent : T.borderLight}`,
                borderRadius: 12, padding: "0.85rem",
                textAlign: "center", fontWeight: 700, fontSize: 14,
                color: plan.highlight ? "#06090f" : T.text,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                boxShadow: plan.highlight ? "0 8px 24px rgba(77,184,255,.25)" : "none",
                marginTop: plan.economy ? 0 : "1.5rem",
              }}>
                Assinar agora <ChevronRight size={15} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <div style={{ fontSize: 13, color: T.muted }}>
            Pagamento seguro via Mercado Pago · Pix, cartão de crédito e boleto
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section id="benefits" style={{ padding: "80px 1.5rem" }}>
      <div style={{ maxWidth: 1520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: T.accentDim, border: `1px solid ${T.accent}33`,
            borderRadius: 999, padding: "0.35rem 0.9rem", marginBottom: "1rem",
          }}>
            <Shield size={12} color={T.accent} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, letterSpacing: 0.5 }}>POR QUE O OZ.BARBER</span>
          </div>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(32px,4vw,52px)",
            color: T.text, letterSpacing: 1, marginBottom: "0.75rem",
          }}>
            Menos bagunça,{" "}
            <span style={{ color: T.accent }}>mais resultado</span>
          </h2>
        </div>

        <div className="benefit-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
          {BENEFITS.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{
              background: "linear-gradient(145deg, #13141e, #0f1017)",
              border: `1px solid ${T.border}`, borderRadius: 18, padding: "1.6rem 1.4rem",
              textAlign: "center",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: T.accentDim, border: `1px solid ${T.accent}28`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 1rem",
              }}>
                <Icon size={22} color={T.accent} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: T.text, marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 13, color: T.mutedLight, lineHeight: 1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: "01", icon: Clock, title: "Escolha seu plano", desc: "Selecione o plano ideal para o tamanho da sua barbearia e finalize o pagamento em segundos." },
    { num: "02", icon: Scissors, title: "Cadastre sua barbearia", desc: "Configure o nome, logo, barbeiros, serviços e personalize com a sua identidade visual." },
    { num: "03", icon: TrendingUp, title: "Gerencie e lucre", desc: "Registre atendimentos, acompanhe financeiro, comissões e tome decisões com relatórios precisos." },
  ];

  return (
    <section style={{ padding: "80px 1.5rem", background: "rgba(255,255,255,.01)" }}>
      <div style={{ maxWidth: 1520, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: T.accentDim, border: `1px solid ${T.accent}33`,
            borderRadius: 999, padding: "0.35rem 0.9rem", marginBottom: "1rem",
          }}>
            <Zap size={12} color={T.accent} />
            <span style={{ fontSize: 12, fontWeight: 700, color: T.accent, letterSpacing: 0.5 }}>COMO FUNCIONA</span>
          </div>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(32px,4vw,52px)",
            color: T.text, letterSpacing: 1,
          }}>
            Simples assim
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {steps.map(({ num, icon: Icon, title, desc }) => (
            <div key={num} style={{
              background: "linear-gradient(145deg, #13141e, #0f1017)",
              border: `1px solid ${T.border}`, borderRadius: 20, padding: "2rem",
              position: "relative",
            }}>
              <div style={{
                position: "absolute", top: "1.5rem", right: "1.5rem",
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 52, color: T.border, letterSpacing: 1, lineHeight: 1,
              }}>
                {num}
              </div>
              <div style={{
                width: 50, height: 50, borderRadius: 14,
                background: T.accentDim, border: `1px solid ${T.accent}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: "1.25rem",
              }}>
                <Icon size={22} color={T.accent} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 17, color: T.text, marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: 13.5, color: T.mutedLight, lineHeight: 1.65 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection({ onSubscribe }) {
  return (
    <section style={{ padding: "80px 1.5rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(77,184,255,.08) 0%, rgba(167,139,250,.06) 100%)",
          border: `1px solid ${T.accent}25`,
          borderRadius: 28, padding: "3.5rem 2.5rem",
          boxShadow: "0 40px 80px rgba(0,0,0,.4)",
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif", fontSize: "clamp(32px,5vw,56px)",
            color: T.text, letterSpacing: 1, lineHeight: 1.1, marginBottom: "1rem",
          }}>
            Transforme a gestão da sua<br />
            <span style={{ color: T.accent }}>barbearia hoje</span>
          </div>
          <p style={{ fontSize: 15, color: T.mutedLight, lineHeight: 1.7, maxWidth: 440, margin: "0 auto 2rem" }}>
            Junte-se às barbearias que já usam o Oz.Barber e veja a diferença no controle e no lucro.
          </p>
          <button className="btn-primary" onClick={onSubscribe} style={{
            background: T.accent, border: "none", borderRadius: 14,
            padding: "1rem 2.5rem", color: "#06090f", fontSize: 16, fontWeight: 700,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 10px 32px rgba(77,184,255,.35)",
            display: "inline-flex", alignItems: "center", gap: 10,
          }}>
            Assinar agora <ArrowRight size={17} />
          </button>
          <div style={{ marginTop: "1.5rem", display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap" }}>
            {["Sem contrato de fidelidade", "Suporte incluído", "Cancelamento a qualquer hora"].map((t) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Check size={12} color={T.success} />
                <span style={{ fontSize: 12.5, color: T.mutedLight }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer({ onLogin }) {
  return (
    <footer style={{ borderTop: `1px solid ${T.border}`, padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 1520, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <img src={ozBarberLogo} alt="Oz.Barber" style={{ height: 36, opacity: 0.85 }} />
          <span style={{ fontSize: 12, color: T.muted }}>
            Desenvolvido por{" "}
            <span style={{ color: T.accent, fontWeight: 700 }}>OzTech SmartControl</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: T.muted }}>© 2026 Oz.Barber. Todos os direitos reservados.</span>
          <button onClick={onLogin} style={{
            background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8,
            padding: "0.4rem 0.9rem", color: T.mutedLight, fontSize: 12,
            cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          }}>
            Entrar
          </button>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage({ onLogin, onSubscribe }) {
  return (
    <>
      <style>{CSS}</style>
      <div style={{ background: T.bg, color: T.text, fontFamily: "'DM Sans', sans-serif", minHeight: "100vh" }}>
        <Navbar onLogin={onLogin} onSubscribe={onSubscribe} />
        <HeroSection onSubscribe={onSubscribe} onLogin={onLogin} />
        <FeaturesSection />
        <StatsSection />
        <HowItWorksSection />
        <PlansSection onSubscribe={onSubscribe} />
        <BenefitsSection />
        <CTASection onSubscribe={onSubscribe} />
        <Footer onLogin={onLogin} />
      </div>
    </>
  );
}
