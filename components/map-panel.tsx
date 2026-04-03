"use client"

import dynamic from "next/dynamic"
import type { Estacion, FuelType, Charger } from "@/lib/types"
import type { BadgeType } from "@/lib/scoring"

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false })

interface MapPanelProps {
  stations: Estacion[]
  chargers?: Charger[]
  fuelType: FuelType
  badges?: Record<string, BadgeType>
  userLat?: number
  userLng?: number
  centerLat?: number
  centerLng?: number
  zoom?: number
  onStationSelect?: (station: Estacion) => void
  onChargerSelect?: (charger: Charger) => void
  onMapMove?: (lat: number, lng: number) => void
}

export function MapPanel(props: MapPanelProps) {
  return (
    <div className="w-full h-full">
      <LeafletMap {...props} />
    </div>
  )
}
