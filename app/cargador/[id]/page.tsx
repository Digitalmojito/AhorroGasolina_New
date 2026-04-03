import type { Metadata } from "next"
import Link from "next/link"
import {
  MapPin, ArrowLeft, Zap, ExternalLink,
  CircleCheck as CheckCircle2, CircleAlert as AlertCircle,
  CircleHelp as HelpCircle, Info, Lock, Users, Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Charger, ChargerConnector, ChargerStatus } from "@/lib/types"
import {
  PLUG_TYPE_LABELS,
  SPEED_TIER_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  STATUS_BG_COLORS,
  formatChargerPrice,
  getTotalPoints,
} from "@/lib/charger-utils"
import { cn } from "@/lib/utils"
import { createAdminClient } from "@/lib/supabase-server"

export const metadata: Metadata = {
  title: "Detalle de cargador EV - AhorroGasolina.es",
}

interface PageProps {
  params: { id: string }
}

function parseOcmStatus(title: string | null | undefined): ChargerStatus {
  if (!title) return "unknown"
  const t = title.toLowerCase()
  if (t.includes("operational") || t.includes("available")) return "operational"
  if (t.includes("unavailable") || t.includes("offline")) return "unavailable"
  if (t.includes("planned") || t.includes("construction")) return "planned"
  if (t.includes("removed")) return "removed"
  return "unknown"
}

function parseOcmPlugType(title: string | null | undefined): ChargerConnector["plug_type"] {
  if (!title) return "other"
  const t = title.toLowerCase()
  if (t.includes("ccs") || t.includes("combo")) return "ccs"
  if (t.includes("chademo") || t.includes("cha-demo")) return "chademo"
  if (t.includes("tesla")) return "tesla"
  if (t.includes("nacs")) return "nacs"
  if (t.includes("schuko") || t.includes("type 1") || t.includes("j1772")) return "schuko"
  if (t.includes("type 2") || t.includes("mennekes") || t.includes("iec 62196-2")) return "type2"
  return "other"
}

function parseOcmCurrentType(id: number | null | undefined): ChargerConnector["current_type"] {
  if (id === 1 || id === 30) return "ac"
  if (id === 2 || id === 20) return "dc"
  return "unknown"
}

function getSpeedTier(powerKw: number | null | undefined): ChargerConnector["speed_tier"] {
  if (!powerKw) return "slow"
  if (powerKw <= 7) return "slow"
  if (powerKw <= 22) return "fast"
  if (powerKw <= 50) return "rapid"
  return "ultra_rapid"
}

function parseOcmCost(costStr: string | null | undefined) {
  if (!costStr) return { perKwh: null, perMinute: null, isFree: false }
  const lower = costStr.toLowerCase()
  if (lower === "free" || lower === "gratis" || lower.includes("no charge") || lower.includes("free of charge") || lower.includes("gratuito")) {
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

const OPERATOR_APPS: Record<string, { name: string; url: string }> = {
  "iberdrola": { name: "iberdrola", url: "https://www.iberdrola.es/movilidad-electrica" },
  "endesa": { name: "Endesa X Way", url: "https://www.endesaxway.com/" },
  "zunder": { name: "Zunder", url: "https://zunder.com/" },
  "ionity": { name: "IONITY", url: "https://ionity.eu/" },
  "repsol": { name: "Waylet", url: "https://www.repsol.com/es/productos-y-servicios/waylet/" },
  "cepsa": { name: "YeldaEV", url: "https://www.cepsa.com/es/movilidad-electrica" },
  "tesla": { name: "Tesla App", url: "https://www.tesla.com/es_ES/app" },
  "evbox": { name: "EVBox", url: "https://evbox.com/" },
  "wallbox": { name: "myWallbox", url: "https://wallbox.com/es_es/" },
  "electromaps": { name: "Electromaps", url: "https://www.electromaps.com/" },
  "charge point": { name: "ChargePoint", url: "https://www.chargepoint.com/" },
  "chargepoint": { name: "ChargePoint", url: "https://www.chargepoint.com/" },
  "plugsurfing": { name: "Plugsurfing", url: "https://plugsurfing.com/" },
  "recharge": { name: "Recharge", url: "https://recharge.com/" },
  "bp pulse": { name: "bp pulse", url: "https://www.bppulse.co.uk/" },
}

function getOperatorApp(operatorName: string): { name: string; url: string } | null {
  const lower = operatorName.toLowerCase()
  for (const [key, app] of Object.entries(OPERATOR_APPS)) {
    if (lower.includes(key)) return app
  }
  return null
}

type AccessCategory = "public" | "restricted" | "private"

function categorizeAccess(accessType: string): AccessCategory {
  const t = accessType.toLowerCase()
  if (t.includes("public") || t.includes("público") || t.includes("publica")) return "public"
  if (t.includes("private") || t.includes("staff") || t.includes("privado")) return "private"
  return "restricted"
}

const PLUG_COMPATIBILITY: Record<ChargerConnector["plug_type"], string> = {
  type2: "Estándar europeo AC — compatible con la mayoría de coches eléctricos e híbridos enchufables",
  ccs: "CCS Combo DC — estándar de carga rápida para la mayoría de coches europeos y americanos",
  chademo: "CHAdeMO DC — usado principalmente en Nissan Leaf, Mitsubishi Outlander y vehículos japoneses",
  schuko: "Schuko / Tipo 1 — toma doméstica o conector J1772, carga lenta",
  tesla: "Conector propietario Tesla — exclusivo para vehículos Tesla (Supercharger)",
  nacs: "NACS (CCS Americano) — nuevo estándar adoptado por Tesla y fabricantes norteamericanos",
  other: "Tipo de conector no estándar",
}

async function getChargerFromOcm(ocmId: number): Promise<Charger | null> {
  try {
    const apiKey = process.env.OCM_API_KEY ?? ""
    const url = new URL("https://api.openchargemap.io/v3/poi/")
    url.searchParams.set("output", "json")
    url.searchParams.set("chargepointid", String(ocmId))
    url.searchParams.set("maxresults", "1")
    url.searchParams.set("compact", "false")
    url.searchParams.set("verbose", "false")
    url.searchParams.set("includecomments", "false")
    if (apiKey) url.searchParams.set("key", apiKey)

    const res = await fetch(url.toString(), { headers: { "User-Agent": "AhorroGasolina.es/1.0" }, next: { revalidate: 300 } })
    if (!res.ok) return null

    const pois = await res.json() as Record<string, unknown>[]
    if (!pois.length) return null

    const poi = pois[0]
    const addr = poi.AddressInfo as Record<string, unknown>
    const costStr = (poi.UsageCost as string | null) ?? null
    const { perKwh, perMinute, isFree } = parseOcmCost(costStr)
    const statusType = poi.StatusType as Record<string, unknown> | null
    const operatorInfo = poi.OperatorInfo as Record<string, unknown> | null
    const usageType = poi.UsageType as Record<string, unknown> | null
    const connections = (poi.Connections as Record<string, unknown>[]) ?? []

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

    return {
      id: `ocm-${ocmId}`,
      ocm_id: ocmId,
      name: (addr.Title as string) ?? "",
      operator_name: (operatorInfo?.Title as string) ?? "",
      address: (addr.AddressLine1 as string) ?? "",
      city: (addr.Town as string) ?? "",
      province: (addr.StateOrProvince as string) ?? "",
      postcode: (addr.Postcode as string) ?? "",
      lat: addr.Latitude as number,
      lng: addr.Longitude as number,
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
  } catch {
    return null
  }
}

async function getChargerFromDb(id: string): Promise<Charger | null> {
  try {
    const supabase = createAdminClient()
    const query = supabase.from("chargers").select("*, charger_connectors(*)")
    const { data, error } = id.startsWith("ocm-")
      ? await query.eq("ocm_id", parseInt(id.replace("ocm-", ""), 10)).maybeSingle()
      : await query.eq("id", id).maybeSingle()

    if (error || !data) return null

    const row = data as Record<string, unknown>
    const connectorRows = (row.charger_connectors as Record<string, unknown>[]) ?? []

    const connectors: ChargerConnector[] = connectorRows.map((c) => ({
      id: String(c.id),
      charger_id: String(c.charger_id),
      ocm_connection_id: c.ocm_connection_id != null ? Number(c.ocm_connection_id) : undefined,
      plug_type: c.plug_type as ChargerConnector["plug_type"],
      plug_type_label: String(c.plug_type_label ?? ""),
      current_type: c.current_type as ChargerConnector["current_type"],
      power_kw: c.power_kw != null ? Number(c.power_kw) : undefined,
      speed_tier: c.speed_tier as ChargerConnector["speed_tier"],
      quantity: Number(c.quantity ?? 1),
      connector_status: c.connector_status as ChargerConnector["connector_status"],
    }))

    return {
      id: String(row.id),
      ocm_id: Number(row.ocm_id),
      name: String(row.name ?? ""),
      operator_name: String(row.operator_name ?? ""),
      address: String(row.address ?? ""),
      city: String(row.city ?? ""),
      province: String(row.province ?? ""),
      postcode: String(row.postcode ?? ""),
      lat: Number(row.lat),
      lng: Number(row.lng),
      status: (row.status as ChargerStatus) ?? "unknown",
      status_last_updated: row.status_last_updated ? String(row.status_last_updated) : undefined,
      usage_cost_raw: row.usage_cost_raw ? String(row.usage_cost_raw) : undefined,
      usage_cost_per_kwh: row.usage_cost_per_kwh != null ? Number(row.usage_cost_per_kwh) : undefined,
      usage_cost_per_minute: row.usage_cost_per_minute != null ? Number(row.usage_cost_per_minute) : undefined,
      is_free: Boolean(row.is_free),
      access_type: String(row.access_type ?? "public"),
      ocm_url: row.ocm_url ? String(row.ocm_url) : undefined,
      last_synced_at: String(row.last_synced_at ?? ""),
      connectors,
    }
  } catch {
    return null
  }
}

async function getChargerData(id: string): Promise<Charger | null> {
  const fromDb = await getChargerFromDb(id)
  if (fromDb) return fromDb

  if (id.startsWith("ocm-")) {
    const ocmId = parseInt(id.replace("ocm-", ""), 10)
    if (!isNaN(ocmId)) return getChargerFromOcm(ocmId)
    return null
  }

  return null
}


const STATUS_ICONS: Record<ChargerStatus, React.ReactNode> = {
  operational: <CheckCircle2 className="h-4 w-4" />,
  unavailable: <AlertCircle className="h-4 w-4" />,
  unknown: <HelpCircle className="h-4 w-4" />,
  planned: <HelpCircle className="h-4 w-4" />,
  removed: <AlertCircle className="h-4 w-4" />,
}

const CURRENT_TYPE_LABEL: Record<string, string> = {
  ac: "CA",
  dc: "CC",
  unknown: "—",
}

function ConnectorRow({ conn }: { conn: ChargerConnector }) {
  const statusColor = STATUS_COLORS[conn.connector_status]
  const statusDot = STATUS_BG_COLORS[conn.connector_status]
  const compatibility = PLUG_COMPATIBILITY[conn.plug_type]

  return (
    <div className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center">
            <Zap className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">
              {PLUG_TYPE_LABELS[conn.plug_type]}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {SPEED_TIER_LABELS[conn.speed_tier]} · {CURRENT_TYPE_LABEL[conn.current_type]}
              {conn.quantity > 1 && ` · ${conn.quantity} puntos`}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", statusDot)} />
              <span className={cn("text-[11px] font-medium", statusColor)}>
                {STATUS_LABELS[conn.connector_status]}
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          {conn.power_kw && (
            <p className="text-lg font-black text-slate-800">{conn.power_kw} kW</p>
          )}
        </div>
      </div>
      {compatibility && conn.plug_type !== "other" && (
        <p className="mt-2 text-[11px] text-slate-400 leading-relaxed pl-[52px]">{compatibility}</p>
      )}
    </div>
  )
}

export default async function CargadorPage({ params }: PageProps) {
  const charger = await getChargerData(params.id)

  if (!charger) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Cargador no encontrado</h1>
        <p className="text-slate-500 mb-6">No pudimos encontrar este cargador.</p>
        <Link href="/buscar?tipo=electric">
          <Button className="bg-amber-400 hover:bg-amber-500 text-slate-900">Volver a buscar</Button>
        </Link>
      </div>
    )
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${charger.lat},${charger.lng}`
  const connectors = charger.connectors ?? []
  const totalPoints = getTotalPoints(connectors)
  const statusIcon = STATUS_ICONS[charger.status]
  const statusColor = STATUS_COLORS[charger.status]
  const statusLabel = STATUS_LABELS[charger.status]
  const accessCategory = categorizeAccess(charger.access_type)
  const operatorApp = charger.operator_name ? getOperatorApp(charger.operator_name) : null
  const hasParsedPrice = charger.usage_cost_per_kwh != null || charger.usage_cost_per_minute != null

  const lastUpdated = charger.status_last_updated
    ? new Date(charger.status_last_updated).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  const lastSynced = new Date(charger.last_synced_at).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <Link href="/buscar?tipo=electric">
          <Button variant="ghost" className="mb-4 -ml-2 text-slate-600 hover:text-slate-900 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a cargadores
          </Button>
        </Link>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center shadow-sm">
              <Zap className="h-8 w-8 text-slate-900" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-slate-900 leading-tight">
                {charger.name || charger.operator_name || "Cargador EV"}
              </h1>
              {charger.operator_name && charger.name !== charger.operator_name && (
                <p className="text-sm text-slate-500 font-medium mt-0.5">{charger.operator_name}</p>
              )}
              <div className="flex items-start gap-1.5 mt-1 text-slate-500">
                <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  {charger.address}, {charger.city}
                  {charger.province && `, ${charger.province}`}
                  {charger.postcode && ` ${charger.postcode}`}
                </p>
              </div>
              <div className={cn("flex items-center gap-1.5 mt-2 text-sm font-semibold", statusColor)}>
                {statusIcon}
                {statusLabel}
                {lastUpdated && (
                  <span className="text-xs font-normal text-slate-400 ml-1">
                    (actualizado {lastUpdated})
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full bg-amber-400 hover:bg-amber-500 text-slate-900 font-semibold gap-2">
                <MapPin className="h-4 w-4" />
                Cómo llegar
              </Button>
            </a>
            {charger.ocm_url && (
              <a href={charger.ocm_url} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="border-slate-200 gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Ver en OCM
                </Button>
              </a>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <h2 className="font-bold text-slate-900 text-lg mb-4">Precio de carga</h2>
          {charger.is_free ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-bold text-base">Gratuito</p>
                <p className="text-xs text-green-600 mt-0.5">No se cobra por cargar en este punto</p>
              </div>
            </div>
          ) : hasParsedPrice ? (
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-slate-900">{formatChargerPrice(charger)}</span>
                {charger.usage_cost_per_kwh && (
                  <span className="text-sm text-slate-500">por kWh</span>
                )}
                {charger.usage_cost_per_minute && !charger.usage_cost_per_kwh && (
                  <span className="text-sm text-slate-500">por minuto</span>
                )}
              </div>
              {charger.usage_cost_raw && (
                <p className="text-xs text-slate-400 mt-2 italic">Tarifa original: &quot;{charger.usage_cost_raw}&quot;</p>
              )}
            </div>
          ) : charger.usage_cost_raw ? (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-xs text-slate-400 mb-1 uppercase tracking-wide font-medium">Tarifa del operador</p>
              <p className="text-sm text-slate-700 leading-relaxed">{charger.usage_cost_raw}</p>
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Precio no disponible. Consulta la app del operador.</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-slate-900 text-lg">
              Puntos de carga
              {totalPoints > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-500">
                  ({totalPoints} {totalPoints === 1 ? "punto" : "puntos"})
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">Haz clic en cada conector para ver la compatibilidad con tu vehículo</p>

          {connectors.length > 0 ? (
            <div className="space-y-2">
              {connectors.map((conn) => (
                <ConnectorRow key={conn.id} conn={conn} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No hay información de conectores disponible.</p>
          )}

          <div className="flex items-start gap-2 mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <Info className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500 leading-relaxed">
              El estado es reportado por la comunidad de OpenChargeMap, no en tiempo real.
              Los estados de &quot;Operativo&quot; / &quot;No disponible&quot; reflejan la última confirmación comunitaria.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <h2 className="font-bold text-slate-900 text-lg mb-4">Acceso y activación</h2>

          {accessCategory === "public" && (
            <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-800 text-sm">Acceso libre</p>
                <p className="text-xs text-green-700 mt-0.5">No necesitas app ni tarjeta para usar este cargador</p>
              </div>
            </div>
          )}

          {accessCategory === "restricted" && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <Smartphone className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Puede requerir app o tarjeta</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Este cargador podría necesitar la app o tarjeta RFID del operador para activarse
                </p>
              </div>
            </div>
          )}

          {accessCategory === "private" && (
            <div className="flex items-start gap-3 p-4 bg-slate-100 border border-slate-200 rounded-xl">
              <Lock className="h-5 w-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-700 text-sm">Acceso privado o restringido</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Este punto está destinado a clientes, empleados o visitantes del establecimiento
                </p>
              </div>
            </div>
          )}

          {operatorApp && (accessCategory === "restricted" || accessCategory === "private") && (
            <div className="flex items-start gap-3 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <Users className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-slate-700">
                  Operado por <span className="font-semibold">{charger.operator_name}</span>
                </p>
                <a
                  href={operatorApp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2 mt-0.5 inline-block"
                >
                  Consulta la app de {operatorApp.name} →
                </a>
              </div>
            </div>
          )}

          {!operatorApp && charger.operator_name && (accessCategory === "restricted" || accessCategory === "private") && (
            <div className="flex items-start gap-3 mt-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <Users className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-slate-600">
                Operado por <span className="font-semibold">{charger.operator_name}</span>. Contacta con el operador para activar la carga.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 text-lg mb-3">Información adicional</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Última sincronización</dt>
              <dd className="font-medium text-slate-800">{lastSynced}</dd>
            </div>
            {charger.ocm_url && (
              <div className="flex justify-between items-center">
                <dt className="text-slate-500">Fuente de datos</dt>
                <dd>
                  <a
                    href={charger.ocm_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-600 hover:text-amber-700 font-medium underline underline-offset-2"
                  >
                    OpenChargeMap
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}
