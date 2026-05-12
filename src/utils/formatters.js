export const money = (v) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(v || 0));

export const fDate = (s) =>
  s
    ? new Date(s).toLocaleDateString("pt-BR")
    : "—";

export const fDatetime = (s) =>
  s
    ? new Date(s).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

export const pct = (v) =>
  `${Number(v || 0)
    .toFixed(1)
    .replace(".", ",")}%`;