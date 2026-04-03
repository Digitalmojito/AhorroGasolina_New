"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase"

export function useFavourites() {
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setLoading(false)
        return
      }
      setUserId(session.user.id)
      supabase
        .from("favourite_stations")
        .select("station_id")
        .eq("user_id", session.user.id)
        .then(({ data }) => {
          setFavouriteIds(new Set((data ?? []).map((f: { station_id: string }) => f.station_id)))
          setLoading(false)
        })
    })
  }, [])

  const toggle = useCallback(async (stationId: string): Promise<"added" | "removed" | "unauthenticated"> => {
    if (!userId) return "unauthenticated"

    const supabase = createClient()
    if (favouriteIds.has(stationId)) {
      await supabase
        .from("favourite_stations")
        .delete()
        .eq("user_id", userId)
        .eq("station_id", stationId)

      setFavouriteIds((prev) => {
        const next = new Set(Array.from(prev))
        next.delete(stationId)
        return next
      })
      return "removed"
    } else {
      await supabase
        .from("favourite_stations")
        .insert({ user_id: userId, station_id: stationId })

      setFavouriteIds((prev) => { const next = new Set(Array.from(prev)); next.add(stationId); return next })
      return "added"
    }
  }, [userId, favouriteIds])

  return { favouriteIds, loading, isLoggedIn: !!userId, toggle }
}
