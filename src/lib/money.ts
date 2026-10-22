const NBSP = "\u00A0";

/** 1250000 → "1 250 000" (raqamlar guruhi bo'shliq bilan, qatorga bo'linmaydi) */
export function formatAmount(amount: number) {
  return Math.round(Math.abs(amount))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 1250000 → "1 250 000 so'm"; sign: true bo'lsa "+" yoki "−" qo'yiladi */
export function formatMoney(amount: number, options: { sign?: boolean } = {}) {
  const prefix = amount < 0 ? "−" : options.sign && amount > 0 ? "+" : "";
  return `${prefix}${formatAmount(amount)}${NBSP}so'm`;
}

/** Grafiklar uchun qisqa ko'rinish: 1250000 → "1,3 mln", 350000 → "350 ming" */
export function formatCompact(amount: number) {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "−" : "";
  const trim = (n: number) => n.toFixed(1).replace(/\.0$/, "").replace(".", ",");
  if (abs >= 1_000_000_000) return `${sign}${trim(abs / 1_000_000_000)} mlrd`;
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)} mln`;
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)} ming`;
  return `${sign}${abs}`;
}

/** O'tgan davrga nisbatan o'zgarish foizi; taqqoslab bo'lmasa null */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}
