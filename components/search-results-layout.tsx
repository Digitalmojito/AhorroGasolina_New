"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { List, Map, Loader as Loader2, RefreshCw, X, Star, TrendingDown, Crosshair, Clock, Fuel, SlidersHorizontal, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MapPanel } from "@/components/map-panel"
import { StationCard } from "@/components/station-card"
import { ChargerCard } from "@/components/charger/charger-card"
import { ElectricFilterPanel } from "@/components/charger/electric-filter-panel"
import { SearchForm } from "@/components/search-form"
import type { Estacion, FuelType, Charger, ChargerFilters, ChargerStatus, PlugType, SpeedTier } from "@/lib/types"
import type { BadgeType, RankedSets } from "@/lib/scoring"
import { computeBadges, computeRankedSets, getAhorroEstimado, getPriceForFuel } from "@/lib/scoring"
import { MADRID_CENTER } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { getBrandColor, getBrandInitials } from "@/lib/brands"
import { formatPrice, formatDistance } from "@/lib/format"
import { formatChargerPrice, getMaxPowerKw, getUniquePlugTypes } from "@/lib/charger-utils"

interface SearchResultsLayoutProps {
  initialLat?: number
  initialLng?: number
  initialQ?: string
  initialFuel?: FuelType
  initialRadius?: number
}

type FilterType = "mejor_opcion" | "mejor_precio" | "mas_cercana" | "abierto_24h" | "solo_glp"

const FILTER_CONFIG: { id: FilterType; label: string; icon: React.ReactNode }[] = [
  { id: "mejor_opcion", label: "Mejor opción", icon: <Star className="h-3 w-3" /> },
  { id: "mejor_precio", label: "Mejor precio", icon: <TrendingDown className="h-3 w-3" /> },
  { id: "mas_cercana", label: "Más cercana", icon: <Crosshair className="h-3 w-3" /> },
  { id: "abierto_24h", label: "Abierto 24h", icon: <Clock className="h-3 w-3" /> },
  { id: "solo_glp", label: "Solo GLP", icon: <Fuel className="h-3 w-3" /> },
]

const DEFAULT_CHARGER_FILTERS: ChargerFilters = {
  status: [],
  plugTypes: [],
  speedTiers: [],
  pricingType: "all",
}

export function SearchResultsLayout({
  initialLat,
  initialLng,
  initialQ,
  initialFuel = "gasolina95",
  initialRadius = 10,
}: SearchResultsLayoutProps) {
  const isElectric = initialFuel === "electric"
  const router = useRouter()

  const [view, setView] = useState<"map" | "list">("map")
  const [stations, setStations] = useState<Estacion[]>([])
  const [chargers, setChargers] = useState<Charger[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedStation, setSelectedStation] = useState<Estacion | null>(null)
  const [selectedCharger, setSelectedCharger] = useState<Charger | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    initialLat ?? MADRID_CENTER[0],
    initialLng ?? MADRID_CENTER[1],
  ])
  const [searchCenter, setSearchCenter] = useState<[number, number]>(mapCenter)
  const [showSearchHere, setShowSearchHere] = useState(false)
  const [sortBy, setSortBy] = useState<"precio" | "distancia">("precio")
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(new Set())
  const [chargerFilters, setChargerFilters] = useState<ChargerFilters>(DEFAULT_CHARGER_FILTERS)
  const chargerFiltersRef = useRef<ChargerFilters>(DEFAULT_CHARGER_FILTERS)
  const mapCenterRef = useRef<[number, number]>(mapCenter)
  const [badges, setBadges] = useState<Record<string, BadgeType>>({})
  const [rankedSets, setRankedSets] = useState<RankedSets>({
    mejorOpcionTop5: [],
    mejorPrecioTop10: [],
    masCercanaTop10: [],
  })

  const fetchStations = useCallback(async (lat: number, lng: number, radius: number) => {
    setLoading(true)
    setShowSearchHere(false)
    setSelectedStation(null)
    try {
      const res = await fetch(`/api/estaciones?lat=${lat}&lng=${lng}&radio=${radius}`)
      const data = await res.json()
      const safeData: Estacion[] = Array.isArray(data) ? data : []
      setStations(safeData)
      setSearchCenter([lat, lng])
      setBadges(computeBadges(safeData, initialFuel))
      setRankedSets(computeRankedSets(safeData, initialFuel))
    } catch {
      setStations([])
      setBadges({})
      setRankedSets({ mejorOpcionTop5: [], mejorPrecioTop10: [], masCercanaTop10: [] })
    } finally {
      setLoading(false)
    }
  }, [initialFuel])

  const fetchChargers = useCallback(async (lat: number, lng: number, radius: number) => {
    setLoading(true)
    setShowSearchHere(false)
    setSelectedCharger(null)
    try {
      const f = chargerFiltersRef.current
      const params = new URLSearchParams({
        lat: String(lat),
        lng: String(lng),
        radio: String(radius),
      })
      if (f.plugTypes?.length) {
        f.plugTypes.forEach((p) => params.append("plug_type", p))
      }
      if (f.speedTiers?.length) {
        f.speedTiers.forEach((s) => params.append("speed_tier", s))
      }
      if (f.status?.length) {
        f.status.forEach((s) => params.append("status", s))
      }
      if (f.pricingType && f.pricingType !== "all") {
        params.set("pricing", f.pricingType)
      }
      const res = await fetch(`/api/chargers?${params.toString()}`)
      const data: Charger[] = await res.json()
      setChargers(Array.isArray(data) ? data : [])
      setSearchCenter([lat, lng])
    } catch {
      setChargers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function init() {
      let lat = initialLat
      let lng = initialLng

      if ((lat === undefined || lng === undefined) && initialQ && initialQ.length >= 2) {
        try {
          const res = await fetch(`/api/ciudades?q=${encodeURIComponent(initialQ)}`)
          const suggestions = await res.json()
          if (Array.isArray(suggestions) && suggestions.length > 0) {
            lat = suggestions[0].lat
            lng = suggestions[0].lng
          }
        } catch {
          // fall through to Madrid default
        }
      }

      const finalLat = lat ?? MADRID_CENTER[0]
      const finalLng = lng ?? MADRID_CENTER[1]
      setMapCenter([finalLat, finalLng])
      if (isElectric) {
        fetchChargers(finalLat, finalLng, initialRadius)
      } else {
        fetchStations(finalLat, finalLng, initialRadius)
      }
    }
    init()
  }, [initialLat, initialLng, initialQ, initialRadius, isElectric, fetchStations, fetchChargers])

  const autoFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMapMove = useCallback((lat: number, lng: number) => {
    mapCenterRef.current = [lat, lng]
    setMapCenter([lat, lng])
    const dist = Math.sqrt(
      Math.pow(lat - searchCenter[0], 2) + Math.pow(lng - searchCenter[1], 2)
    )
    if (dist > 0.02) {
      if (autoFetchTimerRef.current) clearTimeout(autoFetchTimerRef.current)
      autoFetchTimerRef.current = setTimeout(() => {
        const [newLat, newLng] = mapCenterRef.current
        if (isElectric) {
          fetchChargers(newLat, newLng, initialRadius)
        } else {
          fetchStations(newLat, newLng, initialRadius)
        }
      }, 800)
    }
  }, [searchCenter, isElectric, fetchChargers, fetchStations, initialRadius])

  const handleSearchHere = useCallback(() => {
    const [lat, lng] = mapCenterRef.current
    if (isElectric) {
      fetchChargers(lat, lng, initialRadius)
    } else {
      fetchStations(lat, lng, initialRadius)
    }
  }, [isElectric, fetchChargers, fetchStations, initialRadius])

  useEffect(() => {
    chargerFiltersRef.current = chargerFilters
  }, [chargerFilters])

  const EXCLUSIVE_PAIR: [FilterType, FilterType] = ["mejor_opcion", "mejor_precio"]

  const toggleFilter = (id: FilterType) => {
    setActiveFilters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (id === "mejor_opcion") next.delete("mejor_precio")
        else if (id === "mejor_precio") next.delete("mejor_opcion")
      }
      return next
    })
  }

  const mejorOpcionSet = useMemo(() => new Set(rankedSets.mejorOpcionTop5), [rankedSets])
  const mejorPrecioSet = useMemo(() => new Set(rankedSets.mejorPrecioTop10), [rankedSets])
  const masCercanaSet = useMemo(() => new Set(rankedSets.masCercanaTop10), [rankedSets])

  const sortedStations = useMemo(() => {
    return [...stations].sort((a, b) => {
      if (sortBy === "distancia") return (a.distancia ?? 999) - (b.distancia ?? 999)
      const pa = getPriceForFuel(a, initialFuel) ?? 999
      const pb = getPriceForFuel(b, initialFuel) ?? 999
      return pa - pb
    })
  }, [stations, sortBy, initialFuel])

  const filteredStations = useMemo(() => {
    if (activeFilters.size === 0) return sortedStations
    return sortedStations.filter((s) => {
      return Array.from(activeFilters).every((f) => {
        if (f === "solo_glp") return s.precioGLP !== undefined
        if (f === "abierto_24h") return badges[s.id] === "abierto_24h" || /L-D.*24H/i.test(s.horario ?? "")
        if (f === "mejor_opcion") return mejorOpcionSet.has(s.id)
        if (f === "mejor_precio") return mejorPrecioSet.has(s.id)
        if (f === "mas_cercana") return masCercanaSet.has(s.id)
        return false
      })
    })
  }, [sortedStations, activeFilters, badges, mejorOpcionSet, mejorPrecioSet, masCercanaSet])

  const filteredChargers = useMemo(() => {
    let result = [...chargers]

    if (chargerFilters.status.length) {
      result = result.filter((c) => chargerFilters.status.includes(c.status as ChargerStatus))
    }
    if (chargerFilters.plugTypes.length) {
      result = result.filter((c) =>
        c.connectors?.some((conn) => chargerFilters.plugTypes.includes(conn.plug_type as PlugType))
      )
    }
    if (chargerFilters.speedTiers.length) {
      result = result.filter((c) =>
        c.connectors?.some((conn) => chargerFilters.speedTiers.includes(conn.speed_tier as SpeedTier))
      )
    }
    if (chargerFilters.pricingType === "free") {
      result = result.filter((c) => c.is_free)
    } else if (chargerFilters.pricingType === "paid") {
      result = result.filter((c) => !c.is_free)
    }

    if (sortBy === "distancia") {
      result.sort((a, b) => (a.distancia ?? 999) - (b.distancia ?? 999))
    } else {
      result.sort((a, b) => {
        const pa = a.usage_cost_per_kwh ?? (a.is_free ? 0 : 999)
        const pb = b.usage_cost_per_kwh ?? (b.is_free ? 0 : 999)
        return pa - pb
      })
    }

    return result
  }, [chargers, chargerFilters, sortBy])

  const getFilterCount = useCallback((id: FilterType) => {
    if (id === "solo_glp") return sortedStations.filter((s) => s.precioGLP !== undefined).length
    if (id === "abierto_24h") return sortedStations.filter((s) => badges[s.id] === "abierto_24h" || /L-D.*24H/i.test(s.horario ?? "")).length
    if (id === "mejor_opcion") return rankedSets.mejorOpcionTop5.length
    if (id === "mejor_precio") return rankedSets.mejorPrecioTop10.length
    if (id === "mas_cercana") return rankedSets.masCercanaTop10.length
    return 0
  }, [sortedStations, badges, rankedSets])

  const hasActiveFilters = activeFilters.size > 0
  const hasActiveChargerFilters =
    chargerFilters.status.length > 0 ||
    chargerFilters.plugTypes.length > 0 ||
    chargerFilters.speedTiers.length > 0 ||
    chargerFilters.pricingType !== "all"

  const accentColor = isElectric ? "text-amber-600" : "text-emerald-600"
  const accentBg = isElectric ? "bg-amber-500" : "bg-emerald-600"

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 overflow-visible">
              <SearchForm compact defaultFuel={initialFuel} defaultRadius={initialRadius} />
            </div>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("map")}
                className={cn("h-8 w-8 sm:w-auto sm:gap-2 sm:px-3 text-xs p-0", view === "map" && `bg-white shadow-sm ${accentColor}`)}
              >
                <Map className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mapa</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setView("list")}
                className={cn("h-8 w-8 sm:w-auto sm:gap-2 sm:px-3 text-xs p-0", view === "list" && `bg-white shadow-sm ${accentColor}`)}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </Button>
            </div>
          </div>

          {!isElectric && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5 scrollbar-hide [-webkit-overflow-scrolling:touch]">
              <button
                onClick={() => setActiveFilters(new Set())}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                  !hasActiveFilters
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700"
                )}
              >
                <SlidersHorizontal className="h-3 w-3" />
                Todos
                <span className={cn(
                  "text-[10px] font-bold px-1 rounded",
                  !hasActiveFilters ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {stations.length}
                </span>
              </button>

              <div className="flex-shrink-0 flex items-center bg-slate-100 rounded-full p-0.5 gap-0.5">
                {EXCLUSIVE_PAIR.map((fid) => {
                  const f = FILTER_CONFIG.find((x) => x.id === fid)!
                  const isActive = activeFilters.has(f.id)
                  const count = getFilterCount(f.id)
                  const isOpcion = f.id === "mejor_opcion"
                  return (
                    <button
                      key={f.id}
                      onClick={() => toggleFilter(f.id)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                        isActive && isOpcion
                          ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                          : isActive && !isOpcion
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-800"
                      )}
                    >
                      {f.icon}
                      {f.label}
                      {count > 0 && (
                        <span className={cn(
                          "text-[10px] font-bold px-1 rounded",
                          isActive && isOpcion ? "bg-amber-400 text-white"
                          : isActive ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-500"
                        )}>
                          {count}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {FILTER_CONFIG.filter((f) => !EXCLUSIVE_PAIR.includes(f.id)).map((f) => {
                const isActive = activeFilters.has(f.id)
                const count = getFilterCount(f.id)
                return (
                  <button
                    key={f.id}
                    onClick={() => toggleFilter(f.id)}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150",
                      isActive
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                        : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                    )}
                  >
                    {f.icon}
                    {f.label}
                    {count > 0 && (
                      <span className={cn(
                        "text-[10px] font-bold px-1 rounded",
                        isActive ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500"
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}

              <button
                onClick={() => {
                  const params = new URLSearchParams()
                  if (initialLat) params.set("lat", initialLat.toString())
                  if (initialLng) params.set("lng", initialLng.toString())
                  if (initialQ) params.set("q", initialQ)
                  params.set("tipo", "electric")
                  params.set("radio", initialRadius.toString())
                  router.push(`/buscar?${params.toString()}`)
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 bg-white text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-400"
              >
                <Zap className="h-3 w-3" />
                Eléctrico
              </button>
            </div>
          )}

          {isElectric && (
            <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5">
              <button
                onClick={() => {
                  const params = new URLSearchParams()
                  if (initialLat) params.set("lat", initialLat.toString())
                  if (initialLng) params.set("lng", initialLng.toString())
                  if (initialQ) params.set("q", initialQ)
                  params.set("tipo", "gasolina95")
                  params.set("radio", initialRadius.toString())
                  router.push(`/buscar?${params.toString()}`)
                }}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-slate-800"
              >
                <Fuel className="h-3 w-3" />
                Gasolina / Diésel
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                <Zap className="h-3 w-3 text-amber-500" />
                <span className="text-xs font-semibold text-amber-800">Cargadores eléctricos</span>
                <span className="text-[10px] font-bold px-1 rounded bg-amber-200 text-amber-800">{chargers.length}</span>
              </div>
              {hasActiveChargerFilters && (
                <button
                  onClick={() => setChargerFilters(DEFAULT_CHARGER_FILTERS)}
                  className="text-xs text-amber-600 hover:text-amber-700 font-semibold flex items-center gap-1 px-2"
                >
                  <X className="h-3 w-3" />
                  Limpiar filtros
                </button>
              )}
            </div>
          )}

          {(stations.length > 0 || chargers.length > 0) && (
            <p className="text-xs text-slate-500 mt-2">
              {isElectric
                ? filteredChargers.length === chargers.length
                  ? `${chargers.length} cargadores encontrados`
                  : `${filteredChargers.length} de ${chargers.length} cargadores`
                : filteredStations.length === stations.length
                  ? `${stations.length} gasolineras encontradas`
                  : `${filteredStations.length} de ${stations.length} gasolineras`}
              {loading && <span className="ml-2 text-amber-500 animate-pulse">Actualizando...</span>}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {view === "map" ? (
          <div className="h-full relative flex">
            {isElectric && view === "map" && (
              <div className="absolute top-0 right-0 bottom-0 w-72 z-[900] bg-white border-l border-slate-200 overflow-y-auto p-4 hidden lg:block">
                <ElectricFilterPanel
                  chargers={chargers}
                  filters={chargerFilters}
                  onFiltersChange={setChargerFilters}
                />
              </div>
            )}
            <div className="absolute inset-0 lg:right-0" style={isElectric ? { right: "18rem" } : {}}>
              <MapPanel
                stations={isElectric ? [] : filteredStations}
                chargers={isElectric ? filteredChargers : []}
                fuelType={initialFuel}
                badges={badges}
                userLat={initialLat}
                userLng={initialLng}
                centerLat={mapCenter[0]}
                centerLng={mapCenter[1]}
                onStationSelect={setSelectedStation}
                onChargerSelect={setSelectedCharger}
                onMapMove={handleMapMove}
              />
            </div>

            {loading && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg px-4 py-2 flex items-center gap-2 z-[1000]">
                <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                <span className="text-sm text-slate-700">
                  {isElectric ? "Cargando cargadores..." : "Cargando gasolineras..."}
                </span>
              </div>
            )}

            {showSearchHere && !loading && !selectedStation && !selectedCharger && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000]">
                <Button
                  onClick={handleSearchHere}
                  className="bg-white hover:bg-slate-50 text-slate-800 shadow-lg border border-slate-200 gap-2 rounded-xl"
                >
                  <RefreshCw className={cn("h-4 w-4", isElectric ? "text-amber-500" : "text-emerald-500")} />
                  Buscar en esta zona
                </Button>
              </div>
            )}

            {selectedStation && !isElectric && (
              <SelectedStationPopup
                station={selectedStation}
                fuelType={initialFuel}
                badge={badges[selectedStation.id] ?? null}
                ahorroEstimado={getAhorroEstimado(selectedStation, stations, initialFuel)}
                onClose={() => setSelectedStation(null)}
              />
            )}

            {selectedCharger && isElectric && (
              <SelectedChargerPopup
                charger={selectedCharger}
                onClose={() => setSelectedCharger(null)}
              />
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className={cn("max-w-3xl mx-auto px-3 sm:px-4 py-3", isElectric && "max-w-none lg:flex lg:gap-4 lg:items-start")}>
              {isElectric && (
                <div className="hidden lg:block w-64 flex-shrink-0 sticky top-3">
                  <div className="bg-white rounded-xl border border-slate-200 p-4">
                    <ElectricFilterPanel
                      chargers={chargers}
                      filters={chargerFilters}
                      onFiltersChange={setChargerFilters}
                    />
                  </div>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-slate-900 text-sm">
                    {loading
                      ? "Buscando..."
                      : isElectric
                        ? `${filteredChargers.length} cargadores`
                        : `${filteredStations.length} gasolineras`}
                  </h2>
                  <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSortBy("precio")}
                      className={cn("h-7 text-xs px-2.5", sortBy === "precio" && `bg-white shadow-sm ${accentColor}`)}
                    >
                      {isElectric ? "€/kWh" : "Precio"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSortBy("distancia")}
                      className={cn("h-7 text-xs px-2.5", sortBy === "distancia" && `bg-white shadow-sm ${accentColor}`)}
                    >
                      Distancia
                    </Button>
                  </div>
                </div>

                {!isElectric && activeFilters.has("mejor_opcion") && !loading && (
                  <div className="mb-3 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <Star className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">Como calculamos la mejor opcion</p>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        Comparamos el ahorro en precio por un deposito de 50L contra la gasolinera mas cercana, y descontamos el coste del desplazamiento extra ({"\u20ac"}0.07 por km adicional). El Top 1 es la que mas te ahorra en total.
                      </p>
                    </div>
                  </div>
                )}

                {!isElectric && activeFilters.has("mejor_precio") && !loading && (
                  <div className="mb-3 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <TrendingDown className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Como calculamos el mejor precio</p>
                      <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                        Las 10 gasolineras con el precio por litro mas bajo en tu zona, sin tener en cuenta la distancia.
                      </p>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="flex flex-col items-center py-16 gap-3">
                    <Loader2 className={cn("h-8 w-8 animate-spin", isElectric ? "text-amber-500" : "text-emerald-500")} />
                    <p className="text-slate-500 text-sm">
                      {isElectric ? "Buscando cargadores..." : "Buscando gasolineras..."}
                    </p>
                  </div>
                ) : isElectric ? (
                  <div className="space-y-2.5">
                    {filteredChargers.map((c) => (
                      <ChargerCard key={c.id} charger={c} />
                    ))}
                    {filteredChargers.length === 0 && (
                      <div className="text-center py-16 text-slate-500">
                        <Zap className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                        <p className="text-lg font-medium">No se encontraron cargadores</p>
                        <p className="text-sm mt-1">
                          {hasActiveChargerFilters
                            ? "Prueba a cambiar los filtros activos"
                            : "Intenta ampliar el radio de búsqueda"}
                        </p>
                        {hasActiveChargerFilters && (
                          <button
                            onClick={() => setChargerFilters(DEFAULT_CHARGER_FILTERS)}
                            className="mt-3 text-amber-600 font-medium text-sm hover:text-amber-800 underline underline-offset-2"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filteredStations.map((s) => {
                      const mejorOpcionRank = rankedSets.mejorOpcionTop5.indexOf(s.id)
                      const mejorPrecioRank = rankedSets.mejorPrecioTop10.indexOf(s.id)
                      const masCercanaRank = rankedSets.masCercanaTop10.indexOf(s.id)

                      const activeMejorOpcion = activeFilters.has("mejor_opcion") && mejorOpcionRank !== -1
                      const activeMejorPrecio = activeFilters.has("mejor_precio") && mejorPrecioRank !== -1
                      const activeMasCercana = activeFilters.has("mas_cercana") && masCercanaRank !== -1

                      return (
                        <StationCard
                          key={s.id}
                          station={s}
                          fuelType={initialFuel}
                          badge={badges[s.id] ?? null}
                          ahorroEstimado={getAhorroEstimado(s, stations, initialFuel)}
                          mejorOpcionRank={activeMejorOpcion ? mejorOpcionRank + 1 : undefined}
                          mejorPrecioRank={activeMejorPrecio ? mejorPrecioRank + 1 : undefined}
                          masCercanaRank={activeMasCercana ? masCercanaRank + 1 : undefined}
                        />
                      )
                    })}
                    {filteredStations.length === 0 && (
                      <div className="text-center py-16 text-slate-500">
                        <p className="text-lg font-medium">No se encontraron gasolineras</p>
                        <p className="text-sm mt-1">
                          {hasActiveFilters
                            ? "Prueba a cambiar los filtros activos"
                            : "Intenta ampliar el radio de búsqueda"}
                        </p>
                        {hasActiveFilters && (
                          <button
                            onClick={() => setActiveFilters(new Set())}
                            className="mt-3 text-emerald-600 font-medium text-sm hover:text-emerald-800 underline underline-offset-2"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

interface SelectedStationPopupProps {
  station: Estacion
  fuelType: FuelType
  badge: BadgeType | null
  ahorroEstimado: number | null
  onClose: () => void
}

const BADGE_POPUP: Record<BadgeType, { label: string; className: string }> = {
  mejor_opcion: { label: "Mejor opción", className: "bg-amber-100 text-amber-800 border-amber-300" },
  mejor_precio: { label: "Mejor precio", className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  mas_cercana: { label: "Más cercana", className: "bg-blue-100 text-blue-800 border-blue-300" },
  abierto_24h: { label: "Abierto 24h", className: "bg-slate-100 text-slate-700 border-slate-300" },
}

function getPricePop(station: Estacion, fuel: FuelType): number | undefined {
  const map: Record<FuelType, number | undefined> = {
    gasolina95: station.precioGasolina95,
    gasolina98: station.precioGasolina98,
    diesel: station.precioDiesel,
    dieselPremium: station.precioDieselPremium,
    glp: station.precioGLP,
    electric: undefined,
  }
  return map[fuel]
}

function SelectedStationPopup({ station, fuelType, badge, ahorroEstimado, onClose }: SelectedStationPopupProps) {
  const price = getPricePop(station, fuelType)
  const color = getBrandColor(station.rotulo)
  const initials = getBrandInitials(station.rotulo)
  const badgeConfig = badge ? BADGE_POPUP[badge] : null
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.latitud},${station.longitud}`

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 p-3 pr-2">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-900 text-sm truncate">{station.rotulo}</span>
              {badgeConfig && (
                <span className={cn("text-[9px] font-bold border px-1 py-0.5 rounded", badgeConfig.className)}>
                  {badgeConfig.label}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 truncate">{station.direccion}, {station.localidad}</p>
          </div>

          <div className="flex-shrink-0 text-right mx-1 min-w-[52px]">
            <div className={cn(
              "text-xl font-black tabular-nums leading-none",
              badge === "mejor_opcion" ? "text-amber-700"
              : badge === "mejor_precio" ? "text-emerald-700"
              : badge === "mas_cercana" ? "text-blue-700"
              : "text-slate-800"
            )}>
              {formatPrice(price)}
            </div>
            <div className="text-[9px] text-zinc-400">€/litro</div>
            {ahorroEstimado !== null && ahorroEstimado > 0 && (
              <div className="text-[9px] font-semibold text-emerald-600">Ahorras {ahorroEstimado.toFixed(2)}€</div>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 px-3 pb-3">
          {station.distancia !== undefined && (
            <span className="text-[11px] text-zinc-500 flex items-center gap-1">
              {formatDistance(station.distancia)} de distancia
            </span>
          )}
          <div className="flex-1" />
          <a href={`/estacion/${station.id}`} className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2">
            Ver detalles
          </a>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="h-6 text-[11px] bg-emerald-700 hover:bg-emerald-800 text-white px-2.5">
              Cómo llegar
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}

interface SelectedChargerPopupProps {
  charger: Charger
  onClose: () => void
}

function SelectedChargerPopup({ charger, onClose }: SelectedChargerPopupProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${charger.lat},${charger.lng}`
  const connectors = charger.connectors ?? []
  const maxPower = getMaxPowerKw(connectors)
  const plugTypes = getUniquePlugTypes(connectors)
  const plugShort: Record<string, string> = {
    type2: "T2", ccs: "CCS", chademo: "CHAdeMO", schuko: "T1", tesla: "Tesla", nacs: "NACS", other: "?"
  }

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-sm animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 p-3 pr-2">
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center shadow-sm">
            <Zap className="h-4 w-4 text-slate-900" />
          </div>

          <div className="flex-1 min-w-0">
            <span className="font-bold text-slate-900 text-sm truncate block">
              {charger.name || charger.operator_name || "Cargador EV"}
            </span>
            <p className="text-[11px] text-zinc-500 truncate">{charger.address}, {charger.city}</p>
            {plugTypes.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {plugTypes.map((p) => (
                  <span key={p} className="text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1 py-0.5 rounded">
                    {plugShort[p] ?? p}
                  </span>
                ))}
                {maxPower && (
                  <span className="text-[9px] font-semibold bg-slate-50 text-slate-600 border border-slate-200 px-1 py-0.5 rounded">
                    {maxPower} kW
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 text-right mx-1 min-w-[64px]">
            <div className="text-sm font-black text-slate-800 leading-tight">
              {formatChargerPrice(charger)}
            </div>
            {charger.distancia !== undefined && (
              <div className="text-[9px] text-zinc-400 mt-0.5">{formatDistance(charger.distancia)}</div>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-2 px-3 pb-3">
          <div className="flex-1" />
          <a href={`/cargador/${charger.id}`} className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2">
            Ver detalles
          </a>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
            <Button size="sm" className="h-6 text-[11px] bg-amber-500 hover:bg-amber-600 text-slate-900 px-2.5">
              Cómo llegar
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}
