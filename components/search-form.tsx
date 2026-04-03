"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Navigation, Search, Loader as Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useGeolocation } from "@/hooks/use-geolocation"
import { CityAutocomplete } from "@/components/city-autocomplete"
import type { CiudadSuggestion } from "@/app/api/ciudades/route"
import type { FuelType } from "@/lib/types"
import { RADIUS_OPTIONS, FUEL_LABEL_MAP } from "@/lib/constants"

interface SearchFormProps {
  compact?: boolean
  defaultQ?: string
  defaultFuel?: FuelType
  defaultRadius?: number
}

export function SearchForm({ compact = false, defaultQ = "", defaultFuel, defaultRadius = 10 }: SearchFormProps) {
  const router = useRouter()
  const [q, setQ] = useState(defaultQ)
  const [selectedCity, setSelectedCity] = useState<CiudadSuggestion | null>(null)
  const [fuel, setFuel] = useState<FuelType>(defaultFuel ?? "gasolina95")
  const [radius, setRadius] = useState(defaultRadius)
  const { lat, lng, loading: geoLoading, getLocation } = useGeolocation()

  function handleCityChange(value: string) {
    setQ(value)
    setSelectedCity(null)
  }

  function handleCitySelect(suggestion: CiudadSuggestion) {
    setSelectedCity(suggestion)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()

    if (lat && lng) {
      params.set("lat", lat.toString())
      params.set("lng", lng.toString())
    } else if (selectedCity) {
      params.set("lat", selectedCity.lat.toString())
      params.set("lng", selectedCity.lng.toString())
    } else if (q) {
      params.set("q", q)
    }

    params.set("tipo", fuel)
    params.set("radio", radius.toString())
    router.push(`/buscar?${params.toString()}`)
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-nowrap">
        <div className="w-full sm:flex-1 sm:min-w-0 overflow-visible">
          <CityAutocomplete
            value={q}
            onChange={handleCityChange}
            onSelect={handleCitySelect}
            placeholder="Ciudad o dirección..."
            compact
          />
        </div>
        <div className="flex items-center gap-2 sm:flex-shrink-0">
          <Select value={fuel} onValueChange={(v) => setFuel(v as FuelType)}>
            <SelectTrigger className="flex-1 sm:w-[130px] h-9 text-sm bg-white border-slate-200 min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(FUEL_LABEL_MAP) as [FuelType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={radius.toString()} onValueChange={(v) => setRadius(Number(v))}>
            <SelectTrigger className="w-[82px] h-9 text-sm bg-white border-slate-200 flex-shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RADIUS_OPTIONS.map((r) => (
                <SelectItem key={r} value={r.toString()}>{r} km</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-9 flex-shrink-0">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <CityAutocomplete
          value={q}
          onChange={handleCityChange}
          onSelect={handleCitySelect}
          placeholder="Ciudad, dirección o código postal..."
        />
        <Button
          type="button"
          variant="outline"
          onClick={getLocation}
          disabled={geoLoading}
          className="h-12 px-3 border-slate-200 bg-white/80 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700"
        >
          {geoLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline text-sm">Mi ubicación</span>
        </Button>
      </div>

      {lat && lng && (
        <p className="text-xs text-emerald-600 flex items-center gap-1">
          <Navigation className="h-3 w-3" />
          Ubicación detectada correctamente
        </p>
      )}

      <div className="flex gap-2">
        <Select value={fuel} onValueChange={(v) => setFuel(v as FuelType)}>
          <SelectTrigger className="flex-1 h-11 bg-white/80 border-slate-200">
            <SelectValue placeholder="Tipo de combustible" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(FUEL_LABEL_MAP) as [FuelType, string][]).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={radius.toString()} onValueChange={(v) => setRadius(Number(v))}>
          <SelectTrigger className="w-[110px] h-11 bg-white/80 border-slate-200">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RADIUS_OPTIONS.map((r) => (
              <SelectItem key={r} value={r.toString()}>{r} km</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className={`w-full h-12 font-semibold text-base shadow-sm transition-all ${
          fuel === "electric"
            ? "bg-amber-400 hover:bg-amber-500 text-slate-900"
            : "bg-emerald-500 hover:bg-emerald-600 text-white"
        }`}
      >
        <Search className="h-5 w-5 mr-2" />
        {fuel === "electric" ? "Buscar cargadores" : "Buscar gasolineras"}
      </Button>
    </form>
  )
}
