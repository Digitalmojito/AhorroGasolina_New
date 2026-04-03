import { NextRequest, NextResponse } from "next/server"
import type { Charger, ChargerConnector, ChargerStatus, PlugType, SpeedTier } from "@/lib/types"
import { haversine } from "@/lib/haversine"
import { pgQuery } from "@/lib/pg-rest"

type ConnRow = {
  id: string; charger_id: string; ocm_connection_id: number | null
  plug_type: string; plug_type_label: string; current_type: string
  power_kw: number | null; speed_tier: string; quantity: number
  connector_status: string
}

type ChargerRow = {
  id: string; ocm_id: number; name: string; operator_name: string
  address: string; city: string; province: string; postcode: string
  lat: number; lng: number; status: string; status_last_updated: string | null
  usage_cost_raw: string | null; usage_cost_per_kwh: number | null
  usage_cost_per_minute: number | null; is_free: boolean; access_type: string
  ocm_url: string | null; last_synced_at: string
  charger_connectors: ConnRow[]
}

type OcmPoi = Record<string, unknown>

function parseOcmStatus(statusTitle: string | null | undefined): ChargerStatus {
  if (!statusTitle) return "unknown"
  const t = statusTitle.toLowerCase()
  if (t.includes("operational") || t.includes("available")) return "operational"
  if (t.includes("unavailable") || t.includes("offline")) return "unavailable"
  if (t.includes("planned") || t.includes("construction")) return "planned"
  if (t.includes("removed")) return "removed"
  return "unknown"
}

function parseOcmPlugType(connectionTitle: string | null | undefined): PlugType {
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

function parseOcmCurrentType(currentTypeId: number | null | undefined): "ac" | "dc" | "unknown" {
  if (currentTypeId === 1 || currentTypeId === 30) return "ac"
  if (currentTypeId === 2 || currentTypeId === 20) return "dc"
  return "unknown"
}

function getSpeedTier(powerKw: number | null | undefined): SpeedTier {
  if (!powerKw) return "slow"
  if (powerKw <= 7) return "slow"
  if (powerKw <= 22) return "fast"
  if (powerKw <= 50) return "rapid"
  return "ultra_rapid"
}

function parseOcmCost(costStr: string | null | undefined) {
  if (!costStr) return { perKwh: null, perMinute: null, isFree: false }
  const lower = costStr.toLowerCase()
  if (
    lower === "free" || lower === "gratis" ||
    lower.includes("no charge") || lower.includes("free of charge") ||
    lower.includes("gratuito") || lower.includes("0 eur") || lower.includes("0eur")
  ) {
    return { perKwh: null, perMinute: null, isFree: true }
  }
  let perKwh: number | null = null
  let perMinute: number | null = null
  const kwhMatch = costStr.match(/(\d+[.,]\d+|\d+)\s*(?:€|eur|euro)?\s*\/?\s*k?wh/i)
  if (kwhMatch) perKwh = parseFloat(kwhMatch[1].replace(",", "."))
  const minMatch = costStr.match(/(\d+[.,]\d+|\d+)\s*(?:€|eur|euro|c|cent)?\s*\/?\s*min/i)
  if (minMatch) perMinute = parseFloat(minMatch[1].replace(",", "."))
  return { perKwh, perMinute, isFree: false }
}

function ocmPoiToCharger(poi: OcmPoi, userLat?: number, userLng?: number): Charger {
  const addr = poi.AddressInfo as Record<string, unknown>
  const costStr = (poi.UsageCost as string | null) ?? null
  const { perKwh, perMinute, isFree } = parseOcmCost(costStr)
  const statusType = poi.StatusType as Record<string, unknown> | null
  const operatorInfo = poi.OperatorInfo as Record<string, unknown> | null
  const usageType = poi.UsageType as Record<string, unknown> | null
  const connections = (poi.Connections as Record<string, unknown>[]) ?? []

  const lat = addr.Latitude as number
  const lng = addr.Longitude as number
  const ocmId = poi.ID as number

  const connectors: ChargerConnector[] = connections.map((conn, idx) => {
    const connType = conn.ConnectionType as Record<string, unknown> | null
    const connStatus = conn.StatusType as Record<string, unknown> | null
    const powerKw = (conn.PowerKW as number) ?? null
    return {
      id: `ocm-${ocmId}-${idx}`,
      charger_id: `ocm-${ocmId}`,
      ocm_connection_id: (conn.ID as number) ?? undefined,
      plug_type: parseOcmPlugType((connType?.Title as string) ?? null),
      plug_type_label: (connType?.Title as string) ?? "",
      current_type: parseOcmCurrentType(conn.CurrentTypeID as number | null),
      power_kw: powerKw ?? undefined,
      speed_tier: getSpeedTier(powerKw),
      quantity: (conn.Quantity as number) ?? 1,
      connector_status: parseOcmStatus((connStatus?.Title as string) ?? null),
    }
  })

  const charger: Charger = {
    id: `ocm-${ocmId}`,
    ocm_id: ocmId,
    name: (addr.Title as string) ?? "",
    operator_name: (operatorInfo?.Title as string) ?? "",
    address: (addr.AddressLine1 as string) ?? "",
    city: (addr.Town as string) ?? "",
    province: (addr.StateOrProvince as string) ?? "",
    postcode: (addr.Postcode as string) ?? "",
    lat,
    lng,
    status: parseOcmStatus((statusType?.Title as string) ?? null),
    status_last_updated: (poi.DateLastStatusUpdate as string) ?? undefined,
    usage_cost_raw: costStr ?? undefined,
    usage_cost_per_kwh: perKwh ?? undefined,
    usage_cost_per_minute: perMinute ?? undefined,
    is_free: isFree,
    access_type: (usageType?.Title as string) ?? "public",
    ocm_url: `https://openchargemap.org/site/poi/details/${ocmId}`,
    last_synced_at: new Date().toISOString(),
    connectors,
  }

  if (userLat !== undefined && userLng !== undefined) {
    charger.distancia = haversine(userLat, userLng, lat, lng)
  }

  return charger
}

function toConnector(c: ConnRow): ChargerConnector {
  return {
    id: String(c.id), charger_id: String(c.charger_id),
    ocm_connection_id: c.ocm_connection_id != null ? Number(c.ocm_connection_id) : undefined,
    plug_type: c.plug_type as ChargerConnector["plug_type"],
    plug_type_label: c.plug_type_label ?? "",
    current_type: c.current_type as ChargerConnector["current_type"],
    power_kw: c.power_kw != null ? Number(c.power_kw) : undefined,
    speed_tier: c.speed_tier as ChargerConnector["speed_tier"],
    quantity: Number(c.quantity ?? 1),
    connector_status: c.connector_status as ChargerConnector["connector_status"],
  }
}

function toCharger(row: ChargerRow, lat?: number, lng?: number): Charger {
  const charger: Charger = {
    id: String(row.id), ocm_id: Number(row.ocm_id), name: row.name ?? "",
    operator_name: row.operator_name ?? "", address: row.address ?? "",
    city: row.city ?? "", province: row.province ?? "", postcode: row.postcode ?? "",
    lat: Number(row.lat), lng: Number(row.lng),
    status: (row.status as ChargerStatus) ?? "unknown",
    status_last_updated: row.status_last_updated ?? undefined,
    usage_cost_raw: row.usage_cost_raw ?? undefined,
    usage_cost_per_kwh: row.usage_cost_per_kwh != null ? Number(row.usage_cost_per_kwh) : undefined,
    usage_cost_per_minute: row.usage_cost_per_minute != null ? Number(row.usage_cost_per_minute) : undefined,
    is_free: Boolean(row.is_free), access_type: row.access_type ?? "public",
    ocm_url: row.ocm_url ?? undefined, last_synced_at: row.last_synced_at ?? "",
    connectors: (row.charger_connectors ?? []).map(toConnector),
  }
  if (lat !== undefined && lng !== undefined) {
    charger.distancia = haversine(lat, lng, charger.lat, charger.lng)
  }
  return charger
}

async function fetchFromOcm(lat: number, lng: number, radius: number): Promise<Charger[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const url = new URL(`${supabaseUrl}/functions/v1/query-chargers`)
  url.searchParams.set("lat", String(lat))
  url.searchParams.set("lng", String(lng))
  url.searchParams.set("distance", String(radius))
  url.searchParams.set("maxresults", "500")

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  })

  if (!res.ok) throw new Error(`OCM proxy error ${res.status}`)

  const pois = await res.json() as OcmPoi[]
  if (!Array.isArray(pois)) throw new Error("Invalid OCM response")
  return pois
    .filter((poi) => {
      const addr = poi.AddressInfo as Record<string, unknown>
      return addr?.Latitude && addr?.Longitude
    })
    .map((poi) => ocmPoiToCharger(poi, lat, lng))
    .filter((c) => c.status !== "removed")
}

async function fetchFromDb(lat: number, lng: number, radius: number): Promise<Charger[]> {
  const dLat = radius / 111.0
  const dLng = radius / (111.0 * Math.cos((lat * Math.PI) / 180))
  const qs = `select=*,charger_connectors(*)&status=neq.removed&limit=300&lat=gte.${lat - dLat}&lat=lte.${lat + dLat}&lng=gte.${lng - dLng}&lng=lte.${lng + dLng}`
  const rows = await pgQuery<ChargerRow>("chargers", qs)
  return rows
    .map((r) => toCharger(r, lat, lng))
    .filter((c) => (c.distancia ?? 999) <= radius)
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = parseFloat(searchParams.get("lat") ?? "")
  const lng = parseFloat(searchParams.get("lng") ?? "")
  const radius = parseFloat(searchParams.get("radio") ?? "10")
  const hasCoords = !isNaN(lat) && !isNaN(lng)

  const plugTypes = searchParams.getAll("plug_type") as PlugType[]
  const speedTiers = searchParams.getAll("speed_tier") as SpeedTier[]
  const statusFilter = searchParams.getAll("status") as ChargerStatus[]
  const pricingType = searchParams.get("pricing") as "all" | "free" | "paid" | null

  try {
    let chargers: Charger[] = []

    if (hasCoords) {
      try {
        chargers = await fetchFromOcm(lat, lng, radius)
      } catch {
        chargers = await fetchFromDb(lat, lng, radius)
      }
    } else {
      chargers = await fetchFromDb(lat, lng, radius)
    }

    if (statusFilter.length) chargers = chargers.filter((c) => statusFilter.includes(c.status))
    if (pricingType === "free") chargers = chargers.filter((c) => c.is_free)
    else if (pricingType === "paid") chargers = chargers.filter((c) => !c.is_free)
    if (plugTypes.length) chargers = chargers.filter((c) => c.connectors?.some((conn) => plugTypes.includes(conn.plug_type)))
    if (speedTiers.length) chargers = chargers.filter((c) => c.connectors?.some((conn) => speedTiers.includes(conn.speed_tier)))

    if (hasCoords) chargers = chargers.sort((a, b) => (a.distancia ?? 0) - (b.distancia ?? 0))

    return NextResponse.json(chargers, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
