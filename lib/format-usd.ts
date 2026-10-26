// Fixed locale so the server and browser always agree. Cents only when the
// price isn't a whole dollar amount
export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)
}
