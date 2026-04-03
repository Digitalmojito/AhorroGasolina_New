import { NextResponse } from "next/server"
import { pgQuery, pgCount } from "@/lib/pg-rest"

export const dynamic = "force-dynamic"

type SyncLogRow = { id: number; synced_at: string; records_inserted: number; records_updated: number; status: string }
type EstacionRow = { updated_at: string }

export async function GET() {
  try {
    const [logRows, stationRows, total] = await Promise.all([
      pgQuery<SyncLogRow>("sync_log", "select=*&order=synced_at.desc&limit=1"),
      pgQuery<EstacionRow>("estaciones", "select=updated_at&order=updated_at.desc&limit=1"),
      pgCount("estaciones"),
    ])

    return NextResponse.json({
      last_sync: logRows.length > 0 ? logRows[0] : null,
      last_station_update: stationRows.length > 0 ? stationRows[0].updated_at : null,
      total_stations: total,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
