"use client"

import { useState, useEffect } from "react"
import { Clock, MapPin, Navigation, Trash2, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"

interface HistoryEntry {
  id: string
  station_id: string
  station_name: string
  station_address: string
  precio_gasolina_95: number | null
  precio_gasolina_98: number | null
  precio_diesel: number | null
  precio_diesel_premium: number | null
  precio_glp: number | null
  visited_at: string
}

interface HistoryTabProps {
  userId: string
}

function formatRelativeTime(isoString: string): string {
  const now = new Date()
  const date = new Date(isoString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "Ahora mismo"
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  if (diffDays === 1) return "Ayer"
  if (diffDays < 7) return `Hace ${diffDays} días`
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
}

function PriceChip({ label, price }: { label: string; price: number | null }) {
  if (price === null) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
      <span className="text-slate-400 font-normal">{label}</span>
      {formatPrice(price)}
    </span>
  )
}

export function HistoryTab({ userId }: HistoryTabProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from("navigation_history")
        .select("*")
        .eq("user_id", userId)
        .order("visited_at", { ascending: false })
        .limit(50)
      setHistory((data ?? []) as HistoryEntry[])
      setLoading(false)
    }
    if (userId) load()
  }, [userId])

  async function handleDelete(id: string) {
    const supabase = createClient()
    await supabase.from("navigation_history").delete().eq("id", id)
    setHistory((prev) => prev.filter((h) => h.id !== id))
  }

  async function handleClearAll() {
    const supabase = createClient()
    await supabase.from("navigation_history").delete().eq("user_id", userId)
    setHistory([])
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            Historial de navegación
            {history.length > 0 && (
              <span className="text-xs font-normal text-slate-400 ml-1">({history.length})</span>
            )}
          </h2>
          {history.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs text-slate-400 hover:text-red-600 transition-colors font-medium"
            >
              Borrar todo
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Navigation className="h-7 w-7 text-slate-300" />
            </div>
            <p className="text-slate-600 font-medium text-sm">Sin historial aún</p>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Cuando pulses &quot;Cómo llegar&quot; en una gasolinera, aparecerá aquí con los precios de ese momento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((entry) => (
              <div key={entry.id} className="px-5 py-4 group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Navigation className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/estacion/${entry.station_id}`}
                          className="font-semibold text-slate-900 text-sm hover:text-emerald-700 transition-colors flex items-center gap-1"
                        >
                          {entry.station_name}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </div>
                      {entry.station_address && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <p className="text-xs text-slate-500 truncate">{entry.station_address}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <PriceChip label="G95" price={entry.precio_gasolina_95} />
                        <PriceChip label="G98" price={entry.precio_gasolina_98} />
                        <PriceChip label="DSL" price={entry.precio_diesel} />
                        <PriceChip label="D+" price={entry.precio_diesel_premium} />
                        <PriceChip label="GLP" price={entry.precio_glp} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-400 whitespace-nowrap mt-0.5">
                      {formatRelativeTime(entry.visited_at)}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className={cn(
                        "p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all",
                        "opacity-0 group-hover:opacity-100"
                      )}
                      title="Eliminar"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
