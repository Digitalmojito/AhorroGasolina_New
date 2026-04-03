export function formatPrice(price?: number): string {
  if (price === undefined || price === null) return "—"
  return price.toFixed(3).replace(".", ",") + " €/L"
}

export function formatDistance(km?: number): string {
  if (km === undefined || km === null) return ""
  if (km < 1) return `${Math.round(km * 1000)} m`
  return km.toFixed(1).replace(".", ",") + " km"
}

export function formatPriceShort(price?: number): string {
  if (price === undefined || price === null) return "—"
  return price.toFixed(3).replace(".", ",")
}
