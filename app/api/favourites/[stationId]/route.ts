import { NextRequest, NextResponse } from "next/server"
import { pgDelete, pgAuth } from "@/lib/pg-rest"

export async function DELETE(req: NextRequest, { params }: { params: { stationId: string } }) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const user = await pgAuth(token)
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await pgDelete("favourite_stations", `user_id=eq.${user.id}&station_id=eq.${params.stationId}`)
  return NextResponse.json({ ok: true })
}
