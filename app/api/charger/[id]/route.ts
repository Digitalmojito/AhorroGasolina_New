import { NextRequest, NextResponse } from "next/server"
import type { Charger, ChargerConnector, ChargerStatus } from "@/lib/types"
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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const rows = await pgQuery<ChargerRow>(
      "chargers",
      `select=*,charger_connectors(*)&id=eq.${params.id}&limit=1`
    )
    if (!rows.length) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

    const row = rows[0]
    const connectors: ChargerConnector[] = (row.charger_connectors ?? []).map((c) => ({
      id: String(c.id), charger_id: String(c.charger_id),
      ocm_connection_id: c.ocm_connection_id != null ? Number(c.ocm_connection_id) : undefined,
      plug_type: c.plug_type as ChargerConnector["plug_type"],
      plug_type_label: c.plug_type_label ?? "",
      current_type: c.current_type as ChargerConnector["current_type"],
      power_kw: c.power_kw != null ? Number(c.power_kw) : undefined,
      speed_tier: c.speed_tier as ChargerConnector["speed_tier"],
      quantity: Number(c.quantity ?? 1),
      connector_status: c.connector_status as ChargerConnector["connector_status"],
    }))

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
      connectors,
    }

    return NextResponse.json(charger)
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido"
    return NextResponse.json({ error: message }, { status: 503 })
  }
}
