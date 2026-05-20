// Objeto mutável compartilhado entre App.jsx e SuperAdminView.
// O applyThemeMode() em App.jsx faz Object.assign neste objeto
// para sincronizar o tema em todos os componentes que o importam.
const T = {
  bg:         "#0b0b0e",
  surface:    "#13131a",
  card:       "#1a1a24",
  border:     "#2a2a3a",
  borderLight:"#222230",
  accent:     "#4db8ff",
  accentGlow: "#4db8ff22",
  text:       "#ece8e0",
  muted:      "#706b63",
  mutedLight: "#9a9590",
  success:    "#43d18a",
  successBg:  "#43d18a18",
  danger:     "#f07070",
  dangerBg:   "#f0707018",
  info:       "#60a5fa",
  infoBg:     "#60a5fa18",
  sidebar:    "#0e0e14",
  warn:       "#f0a500",
  warnBg:     "#f0a50018",
};

export default T;
