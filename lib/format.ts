const currency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const compactCurrency = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  notation: "compact",
  maximumFractionDigits: 1,
});

const decimal = new Intl.NumberFormat("es-AR", {
  maximumFractionDigits: 2,
});

const timeFormat = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateFormat = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
});

const longDateFormat = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatArs(value: number) {
  return currency.format(value);
}

export function formatArsCompact(value: number) {
  return compactCurrency.format(value);
}

export function formatNumber(value: number) {
  return decimal.format(value);
}

export function formatTime(value: string | Date) {
  return timeFormat.format(new Date(value));
}

export function formatDate(value: string | Date) {
  return dateFormat.format(new Date(value));
}

export function formatLongDate(value: string | Date) {
  return longDateFormat.format(new Date(value));
}

/** Variación porcentual entre dos períodos. `null` cuando no hay base de comparación. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function formatPercent(value: number) {
  const rounded = Math.round(Math.abs(value));
  return `${value >= 0 ? "+" : "−"}${rounded}%`;
}
