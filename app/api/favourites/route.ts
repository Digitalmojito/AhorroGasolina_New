import { NextRequest, NextResponse } from "next/server"
import { pgQuery, pgInsert, pgAuth } from "@/lib/pg-rest"

type FavRow = { station_id: string }

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await pgAuth(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const rows = await pgQuery<FavRow>(
    "favourite_stations",
    `select=station_id&user_id=eq.${user.id}`
  )
  return NextResponse.json({ station_ids: rows.map((f) => f.station_id) })
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await pgAuth(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { station_id } = body
  if (!station_id) return NextResponse.json({ error: "station_id required" }, { status: 400 })

  try {
    await pgInsert("favourite_stations", { user_id: user.id, station_id: String(station_id) })
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error"
    if (msg.includes("23505")) return NextResponse.json({ ok: true })
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
