import type { ChargerStatus, PlugType, CurrentType, SpeedTier, ChargerConnector } from "./types"

export function parseOcmStatus(statusTitle: string | null | undefined): ChargerStatus {
  if (!statusTitle) return "unknown"
  const t = statusTitle.toLowerCase()
  if (t.includes("operational") || t.includes("available")) return "operational"
  if (t.includes("unavailable") || t.includes("offline") || t.includes("removed")) return "unavailable"
  if (t.includes("planned") || t.includes("construction")) return "planned"
  if (t.includes("removed")) return "removed"
  return "unknown"
}

export function parseOcmPlugType(connectionTitle: string | null | undefined): PlugType {
  if (!connectionTitle) return "other"
  const t = connectionTitle.toLowerCase()
  if (t.includes("ccs") || t.includes("combo")) return "ccs"
  if (t.includes("chademo") || t.includes("cha-demo")) return "chademo"
  if (t.includes("tesla")) return "tesla"
  if (t.includes("nacs")) return "nacs"
  if (t.includes("schuko") || t.includes("type 1") || t.includes("j1772")) return "schuko"
  if (t.includes("type 2") || t.includes("mennekes") || t.includes("iec 62196-2")) return "type2"
  return "other"
}

export function parseOcmCurrentType(currentTypeId: number | null | undefined): CurrentType {
  if (currentTypeId === 1) return "ac"
  if (currentTypeId === 2) return "dc"
  if (currentTypeId === 30) return "ac"
  if (currentTypeId === 20) return "dc"
  return "unknown"
}

export function getSpeedTier(powerKw: number | null | undefined): SpeedTier {
  if (!powerKw) return "slow"
  if (powerKw <= 7) return "slow"
  if (powerKw <= 22) return "fast"
  if (powerKw <= 50) return "rapid"
  return "ultra_rapid"
}

export interface ParsedCost {
  perKwh: number | null
  perMinute: number | null
  isFree: boolean
}

export function parseOcmCost(costStr: string | null | undefined): ParsedCost {
  if (!costStr) return { perKwh: null, perMinute: null, isFree: false }

  const lower = costStr.toLowerCase()

  if (
    lower === "free" ||
    lower === "gratis" ||
    lower.includes("no charge") ||
    lower.includes("sin cargo") ||
    lower.includes("free of charge") ||
    lower.includes("gratuito")
  ) {
    return { perKwh: null, perMinute: null, isFree: true }
  }

  let perKwh: number | null = null
  let perMinute: number | null = null

  const kwhMatch = costStr.match(/(\d+[.,]\d+|\d+)\s*(?:€|eur|euro)?\s*\/?\s*k?wh/i)
  if (kwhMatch) {
    perKwh = parseFloat(kwhMatch[1].replace(",", "."))
  }

  const minMatch = costStr.match(/(\d+[.,]\d+|\d+)\s*(?:€|eur|euro|c|cent)?\s*\/?\s*min/i)
  if (minMatch) {
    perMinute = parseFloat(minMatch[1].replace(",", "."))
  }

  return { perKwh, perMinute, isFree: false }
}

export function formatChargerPrice(charger: {
  is_free: boolean
  usage_cost_per_kwh?: number | null
  usage_cost_per_minute?: number | null
  usage_cost_raw?: string | null
}): string {
  if (charger.is_free) return "Gratis"
  if (charger.usage_cost_per_kwh) {
    return `${charger.usage_cost_per_kwh.toFixed(2)} €/kWh`
  }
  if (charger.usage_cost_per_minute) {
    return `${charger.usage_cost_per_minute.toFixed(3)} €/min`
  }
  if (charger.usage_cost_raw) return charger.usage_cost_raw
  return "Precio no disponible"
}

export const PLUG_TYPE_LABELS: Record<PlugType, string> = {
  type2: "Tipo 2",
  ccs: "CCS Combo",
  chademo: "CHAdeMO",
  schuko: "Schuko / Tipo 1",
  tesla: "Tesla",
  nacs: "NACS",
  other: "Otro",
}

export const SPEED_TIER_LABELS: Record<SpeedTier, string> = {
  slow: "Lenta AC (≤7 kW)",
  fast: "Rápida AC (7-22 kW)",
  rapid: "Súper-rápida DC (22-50 kW)",
  ultra_rapid: "Ultra-rápida DC (50 kW+)",
}

export const STATUS_LABELS: Record<ChargerStatus, string> = {
  operational: "Operativo",
  unavailable: "No disponible",
  unknown: "Estado desconocido",
  planned: "Planificado",
  removed: "Retirado",
}

export const STATUS_COLORS: Record<ChargerStatus, string> = {
  operational: "text-green-600",
  unavailable: "text-slate-400",
  unknown: "text-amber-500",
  planned: "text-blue-500",
  removed: "text-red-400",
}

export const STATUS_BG_COLORS: Record<ChargerStatus, string> = {
  operational: "bg-green-500",
  unavailable: "bg-slate-400",
  unknown: "bg-amber-400",
  planned: "bg-blue-500",
  removed: "bg-red-400",
}

export function getMaxPowerKw(connectors: ChargerConnector[]): number | null {
  const powers = connectors.map((c) => c.power_kw).filter((p): p is number => p != null)
  if (!powers.length) return null
  return Math.max(...powers)
}

export function getUniquePlugTypes(connectors: ChargerConnector[]): PlugType[] {
  const seen = new Map<PlugType, boolean>()
  return connectors
    .map((c) => c.plug_type)
    .filter((v) => { if (seen.has(v)) return false; seen.set(v, true); return true })
}

export function getTotalPoints(connectors: ChargerConnector[]): number {
  return connectors.reduce((sum, c) => sum + c.quantity, 0)
}
